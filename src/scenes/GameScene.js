// 🎮 GameScene.js – Cena principal do jogo (gameplay)
import api from '../api.js';
import CollisionHandler from '../modules/CollisionHandler.js';
import EnemySpawner from '../modules/EnemySpawner.js';
import ExplosionEffect from '../modules/ExplosionEffect.js';
// import HUD from '../modules/hud.js'; // SIF 21.3: Replaced by HUDScene
import { showNextStageDialog as StageDialog } from '../modules/NextStageDialog.js';
import PlayerController from '../modules/PlayerController.js';
import PowerupLogic from '../modules/PowerupLogic.js';
import { createUIButtons } from '../modules/UIMenuButtons.js';
import PauseManager from '../utils/PauseManager.js';
import SoundManager from '../utils/sound.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.transitioning = false;
    this.playerState = 'CAN_SHOOT'; // CQ-02: State machine for player actions
    this.currentTarget = null;
    this.gameMode = 'solo';
    this.opponent = null;
    this.matchId = null;

    this.DEFAULT_STATS = {
      hp: 2100, maxHp: 2100, mana: 100, maxMana: 100, damage: 1, speed: 200, // CQ-05: Increased base HP by 7x
      extraLives: 1, fireRate: 600, bombSize: 1, multiShot: 0, coins: 0,
    };

    this.gameSettings = { monsterScaleFactor: 7 };
  }

  setPlayerState(newState, reason) {
    console.log(`[PlayerState] Changing from ${this.playerState} to ${newState}. Reason: ${reason}`);
    this.playerState = newState;
  }

  init(data) {
    this.gameMode = data.gameMode || 'solo';
    this.opponent = data.opponent || null;
    this.matchId = data.matchId || null;
    console.log(`[GameScene] Initialized with mode: ${this.gameMode}, Match ID: ${this.matchId}`);
  }

  preload() {
    this.load.json('assetManifest', 'src/config/asset-manifest.json');
  }

  create() {
    // This is the correct lifecycle location for scene initialization.
    // The previous use of load.on('complete') here was incorrect and
    // likely caused the scene to hang silently.
    this.initializeScene();
  }

  async initializeScene() {
    console.log('[VCL-09] GameScene: Starting initialization...');
    try {
      const serverSettings = await api.getGameSettings();
      if (serverSettings.success) this.gameSettings = serverSettings.settings;
    } catch (error) {
      console.warn('[GameScene] Could not fetch game settings. Using defaults.', error);
    }

    this.pauseManager = new PauseManager(this);
    SoundManager.stop(this, 'menu_music');
    this.score = 0;

    let userAccountData = {};
    try {
        const response = await api.fetch('/auth/me', {}, true); // Fetch latest user data
        if (response.success && response.user) {
            userAccountData = response.user;
        } else {
            throw new Error(response.message || 'Failed to fetch user data.');
        }
    } catch (error) {
        console.error('[GameScene] Could not load player data, returning to menu.', error);
        this.scene.start('MenuScene', { error: 'Could not load player data.' });
        return; // Stop scene execution
    }

    const selectedHero = this.registry.get('selectedHero');

    // --- GUARD CLAUSE ---
    // If no hero was selected or passed, the game cannot proceed.
    if (!selectedHero || !selectedHero.id) {
        console.error("[GameScene] CRITICAL: Scene started without a valid selected hero. Aborting.");
        // We can't use LanguageManager here as it might not be ready.
        this.add.text(this.scale.width / 2, this.scale.height / 2, 'ERROR: No hero data found.\nReturning to menu.', {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#ff0000',
            align: 'center',
            wordWrap: { width: this.scale.width - 40 }
        }).setOrigin(0.5);

        this.time.delayedCall(3000, () => {
            this.scene.start('MenuScene');
        });
        return; // Stop scene execution
    }


    this.playerStats = {
      ...this.DEFAULT_STATS,
      ...selectedHero, // Apply selected hero stats over defaults
      hero_xp: selectedHero.xp || 0,
      hero_xp_for_next_level: 100, // Hero level up logic is not in scope, use placeholder
      // Apply fresh account data from API
      address: userAccountData.address,
      account_level: userAccountData.account_level,
      account_xp: userAccountData.account_xp,
      bcoin: userAccountData.coins,
    };
    this.registry.remove('selectedHero');

    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg1').setOrigin(0.5).setDisplaySize(480, 800);
    this.scene.launch('HUDScene');
    this.time.delayedCall(100, () => {
      this.events.emit('update-health', { health: this.playerStats.hp, maxHealth: this.playerStats.maxHp });
      this.events.emit('update-xp', {
        accountLevel: this.playerStats.account_level,
        accountXP: this.playerStats.account_xp,
        heroXP: this.playerStats.hero_xp, heroXPForNextLevel: this.playerStats.hero_xp_for_next_level,
      });
      this.events.emit('update-bcoin', { balance: this.playerStats.bcoin });
    });

    this.playerController = new PlayerController(this);
    this.player = this.playerController.create();
    this.cursors = this.input.keyboard.createCursorKeys();

    if (this.gameMode === 'ranked') {
      this.initializePvpMatch();
    } else {
      this.initializePveMatch();
    }

    createUIButtons(this, this.playerStats);
    await SoundManager.playWorldMusic(this, 1);
    this.input.keyboard.on('keydown-ESC', this.togglePause, this);
  }

  initializePveMatch() {
    this.level = 1;
    this.waveStarted = false;
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.activePowerups = {};
    this.coinsEarned = 0;
    this.baseEnemyHp = 1;
    this.baseBossHp = 100;

    this.bombs = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.powerupLogic = new PowerupLogic(this);
    this.collisionHandler = new CollisionHandler(this, this.events, this.powerupLogic);
    this.collisionHandler.register();
    this.enemySpawner = new EnemySpawner(this, this.playerStats.account_level);

    this.bombTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      loop: true,
      callback: () => {
        // CQ-02: Only fire if player state allows it
        if (this.player?.active && this.playerState === 'CAN_SHOOT') {
          this.firePlayerBomb(true);
        }
      },
    });

    const initialSpawnResult = this.enemySpawner.spawn();
    if (initialSpawnResult === 'GAME_SHOULD_END') this.handleGameOver();

    // CQ-07: Emit initial wave update
    const waveInStage = ((this.level - 1) % 5) + 1;
    const totalWavesInStage = (this.level % 5 === 0) ? 1 : 5;
    this.events.emit('update-wave', { current: waveInStage, total: totalWavesInStage, isBoss: (this.level % 5 === 0) });
  }

  initializePvpMatch() {
    if (!this.opponent) {
      console.error("PvP match started without opponent data! Returning to menu.");
      this.scene.start('MenuScene');
      return;
    }
    this.level = 'PvP';
    this.waveStarted = true;

    // Construct the correct sprite key (e.g., 'witch_hero') from the opponent data
    const opponentSpriteKey = this.opponent.hero.sprite_name ? `${this.opponent.hero.sprite_name.toLowerCase()}_hero` : 'player_default';
    this.opponentPlayer = this.physics.add.sprite(this.scale.width / 2, 100, opponentSpriteKey)
      .setCollideWorldBounds(true).setImmovable(true);
    this.opponentPlayer.setTint(0xff8080);
    this.opponentPlayer.body.setSize(this.opponentPlayer.width * 0.8, this.opponentPlayer.height * 0.8);


    if (this.opponent.userId === -1) {
      this.opponentMoveDirection = 1;
      this.opponentPlayer.setVelocityX(100 * this.opponentMoveDirection);
      this.time.addEvent({ delay: 1500, callback: () => { if (this.opponentPlayer.active) { this.opponentMoveDirection *= -1; this.opponentPlayer.setVelocityX(100 * this.opponentMoveDirection); } }, loop: true });
      this.time.addEvent({ delay: 1200, callback: this.fireOpponentBomb, callbackScope: this, loop: true });
    }

    this.playerBombs = this.physics.add.group();
    this.opponentBombs = this.physics.add.group();
    this.bombTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      loop: true,
      callback: () => {
        // CQ-02: Only fire if player state allows it
        if (this.player?.active && this.playerState === 'CAN_SHOOT') {
          this.firePlayerBomb(false);
        }
      },
    });

    this.physics.add.collider(this.playerBombs, this.opponentPlayer, (opponent, bomb) => {
      bomb.destroy();
      new ExplosionEffect(this, opponent.x, opponent.y);
      // TODO: Handle opponent health update via network
    });
    this.physics.add.collider(this.opponentBombs, this.player, (player, bomb) => {
      bomb.destroy();
      new ExplosionEffect(this, player.x, player.y);
      this.playerStats.hp -= 10;
      this.events.emit('update-health', { health: this.playerStats.hp, maxHealth: this.playerStats.maxHp });
      if (this.playerStats.hp <= 0) this.handleGameOver();
    });
  }

  firePlayerBomb(isPve) {
    const bombGroup = isPve ? this.bombs : this.playerBombs;
    this.fireBomb(this.player, bombGroup, -300, false);
  }

  fireOpponentBomb() {
    this.fireBomb(this.opponentPlayer, this.opponentBombs, 300, true);
  }

  fireBomb(firer, bombGroup, velocityY, isOpponent = false) {
    if (this.gamePaused || !firer || !firer.active) return;
    const stats = isOpponent ? this.opponent.hero : this.playerStats;
    // Defensive check: Ensure stats object exists before accessing properties
    if (!stats) {
        console.error("Attempted to fire a bomb for a firer with no stats.", { isOpponent });
        return;
    }
    const count = 1 + (stats.multiShot ?? 0);
    const spacing = 15;
    const startX = firer.x - (spacing * (count - 1)) / 2;
    const bombSize = stats.bombSize || 1;
    const bombDisplaySize = 8 * bombSize;
    for (let i = 0; i < count; i++) {
      const bombY = firer.y + (velocityY > 0 ? 30 : -30);
      const bomb = bombGroup.create(startX + spacing * i, bombY, 'bomb');
      bomb.setDisplaySize(bombDisplaySize, bombDisplaySize).setVelocityY(velocityY);
      if (isOpponent) bomb.setTint(0xff8080);
    }
    if (!isOpponent) SoundManager.play(this, 'bomb_fire');
  }

  resetWaveState() {
    this.enemiesKilled = 0;
    this.enemiesSpawned = 0;
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.waveStarted = false;
    this.transitioning = false;
    this.stage = Math.ceil(this.level / 5);
    this.stageCode = `${this.stage}-${((this.level - 1) % 5) + 1}`;
    this.bg.setTexture(`bg${Math.min(this.stage, 5)}`);
    SoundManager.playWorldMusic(this, this.stage);
    SoundManager.play(this, 'wave_start');
  }

  async endMatch(result) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.gamePaused = true;
    this.physics.pause();
    this.setPlayerState('CANNOT_SHOOT', 'Match ending');
    SoundManager.stopAll(this);

    if (result.winner === 'player') {
        const winnerAddress = this.playerStats.address;
        try {
            const response = await window.api.post('/pvp/ranked/report', {
                matchId: this.matchId,
                winnerAddress: winnerAddress
            });

            if (response.success) {
                SoundManager.play(this, 'gameover'); // Use victory sound later
                this.scene.stop('HUDScene');
                this.scene.start('GameOverScene', {
                    score: 1000, // Placeholder for PvP
                    coinsEarned: response.rewards ? response.rewards.bcoin || 0 : 0,
                    finalScore: 1000,
                    customMessage: response.message
                });
            } else {
                throw new Error(response.message || "Failed to report match result.");
            }
        } catch (error) {
            console.error("Error reporting match result:", error);
            this.scene.stop('HUDScene');
            this.scene.start('MenuScene', { error: 'Failed to report match result.' });
        }
    } else {
        // Handle player loss
        this.scene.stop('HUDScene');
        this.scene.start('GameOverScene', {
            score: 0,
            coinsEarned: 0,
            customMessage: "Você foi derrotado!"
        });
    }
  }

  async handleGameOver() {
    if (this.gamePaused || this.transitioning) return;
    this.transitioning = true; // Use transitioning to prevent double calls
    this.gamePaused = true;
    this.player?.setActive(false);
    this.setPlayerState('CANNOT_SHOOT', 'Game over');
    SoundManager.stopAll(this);
    SoundManager.play(this, 'gameover');

    const xpGained = this.score; // Assuming 1 score point = 1 XP
    const heroId = this.playerStats.id;
    this.coinsEarned = Math.floor(this.score / 10);

    // This is the critical fix: report the match result to the backend to award XP.
    if (heroId && xpGained > 0) {
        try {
            console.log(`[GameScene] Reporting match complete. HeroID: ${heroId}, XP: ${xpGained}`);
            // Use the new, correct method on the api client.
            const response = await api.completeMatch(heroId, xpGained);
            if (response.success) {
                console.log('[GameScene] XP awarded successfully by the server.');
            } else {
                console.warn('[GameScene] Server failed to award XP:', response.message);
            }
        } catch (error) {
            console.error('[GameScene] Error reporting match completion:', error);
        }
    }

    this.scene.stop('HUDScene');
    this.scene.start('GameOverScene', { score: this.score, level: this.level, coins: this.coinsEarned });
  }

  update() {
    if (this.gamePaused || !this.player?.active) return;
    this.playerController.update(this.cursors, this.playerStats.speed);

    if (this.gameMode !== 'ranked') {
      this.updatePve();
    }
  }

  prepareNextStage() {
    this.level++;
    this.resetWaveState();
    this.physics.resume();
    this.setPlayerState('CAN_SHOOT', 'Next stage prepared');

    // CQ-07: Emit wave update for the new stage
    const waveInStage = ((this.level - 1) % 5) + 1;
    const totalWavesInStage = (this.level % 5 === 0) ? 1 : 5;
    this.events.emit('update-wave', { current: waveInStage, total: totalWavesInStage, isBoss: (this.level % 5 === 0) });

    if (this.enemySpawner.spawn() === 'GAME_SHOULD_END') {
      this.handleGameOver();
    }
  }

  updatePve() {
    // HS1-02: The logic for advancing to the next stage after a boss is defeated
    // has been moved entirely to CollisionHandler.js to ensure it's triggered
    // at the exact moment of the boss's defeat. This prevents race conditions
    // and bugs where the game state wasn't paused/resumed correctly.

    this.enemies.getChildren().forEach(enemy => {
      if (enemy?.active && enemy.y > this.scale.height + 20) {
        // LP-03: Fix disappearing enemies bug.
        // Instead of destroying the enemy, we deactivate it. This follows the rule
        // that enemies should only be destroyed when their health is <= 0.
        enemy.setActive(false).setVisible(false);

        if (this.pauseManager.isPaused) return;
        const damageTaken = 50;
        this.playerStats.hp -= damageTaken;
        this.events.emit('update-health', { health: this.playerStats.hp, maxHealth: this.playerStats.maxHp });
        if (this.playerStats.hp <= 0) {
          this.playerStats.extraLives--;
          if (this.playerStats.extraLives >= 0) {
            this.playerStats.hp = this.playerStats.maxHp;
            SoundManager.play(this, 'player_hit');
            this.events.emit('update-health', { health: this.playerStats.hp, maxHealth: this.playerStats.maxHp });
          } else {
            this.playerStats.hp = 0;
            this.playerStats.extraLives = 0;
            this.events.emit('update-health', { health: 0, maxHealth: this.playerStats.maxHp });
            this.handleGameOver();
          }
        } else {
          SoundManager.play(this, 'player_hit');
        }
      }
    });

    if (this.enemiesSpawned > 0 && this.enemiesKilled >= this.enemiesSpawned && !this.bossSpawned && !this.waveStarted && !this.transitioning) {
      this.waveStarted = true;
      this.time.delayedCall(500, () => {
        this.level++;
        this.resetWaveState();
        if (this.enemySpawner.spawn() === 'GAME_SHOULD_END') {
          this.handleGameOver();
        }
      });
    }
  }

  togglePause() {
    this.pauseManager.pause();
  }
}