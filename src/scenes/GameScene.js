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
import GameEventEmitter from '../utils/GameEventEmitter.js';
import ChatWidget from '../ui/ChatWidget.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.isInitialized = false;
    this.transitioning = false;
    this.playerState = 'CAN_SHOOT'; // CQ-02: State machine for player actions
    this.currentTarget = null;
    this.gameMode = 'solo';
    this.opponent = null;
    this.matchId = null;

    this.DEFAULT_STATS = {
      hp: 2100,
      maxHp: 2100,
      mana: 100,
      maxMana: 100,
      damage: 1,
      speed: 200, // CQ-05: Increased base HP by 7x
      extraLives: 1,
      fireRate: 600,
      bombSize: 1,
      multiShot: 0,
      coins: 0,
    };

    this.gameSettings = { monsterScaleFactor: 7 };
  }

  setPlayerState(newState, reason) {
    console.log(
      `[PlayerState] Changing from ${this.playerState} to ${newState}. Reason: ${reason}`
    );
    this.playerState = newState;
  }

  init(data) {
    this.gameMode = data.gameMode || 'solo';
    this.opponent = data.opponent || null;
    this.matchId = data.matchId || null;
    this.stageConfig = data.stageConfig || null; // Stage Routing
    this.lastBombSoundTime = 0;
    console.log(
      `[GameScene] Initialized with mode: ${this.gameMode}, Match ID: ${this.matchId}, Stage: ${this.stageConfig ? this.stageConfig.name : 'Default'}`
    );
  }

  preload() {
    this.load.json('assetManifest', 'assets/asset-manifest.json');
  }

  create() {
    // This is the correct lifecycle location for scene initialization.
    // The previous use of load.on('complete') here was incorrect and
    // likely caused the scene to hang silently.
    this.events.on('shutdown', this.shutdown, this);
    this.chatWidget = new ChatWidget(this);
    this.initializeScene();
  }

  shutdown() {
    if (this.chatWidget) this.chatWidget.destroy();
    // [VCL-09 FIX] Ensure HUDScene is stopped to prevent zombie listeners
    this.scene.stop('HUDScene');
  }

  async initializeScene() {
    // FURIA-FS-04: Black box recorder for debugging disappearing enemies.
    window.enemyStateHistory = [];
    console.log('[VCL-09] GameScene: Starting initialization...');

    // [VCL-09 FIX] Removed /api/admin/settings call to prevent 403 Forbidden.
    // Using default local settings instead.

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
      console.error(
        '[GameScene] Could not load player data, returning to menu.',
        error
      );
      this.scene.start('MenuScene', { error: 'Could not load player data.' });
      return; // Stop scene execution
    }

    const selectedHero = this.registry.get('selectedHero');

    // --- GUARD CLAUSE ---
    // If no hero was selected or passed, the game cannot proceed.
    if (!selectedHero || !selectedHero.id) {
      console.error(
        '[GameScene] CRITICAL: Scene started without a valid selected hero. Aborting.'
      );
      // We can't use LanguageManager here as it might not be ready.
      this.add
        .text(
          this.scale.width / 2,
          this.scale.height / 2,
          'ERROR: No hero data found.\nReturning to menu.',
          {
            fontFamily: '"Press Start 2P"',
            fontSize: '18px',
            color: '#ff0000',
            align: 'center',
            wordWrap: { width: this.scale.width - 40 },
          }
        )
        .setOrigin(0.5);

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

    // Apply Proficiency Bonuses
    // Bomb Mastery: +0.1% Radius per level (Logarithmic Growth)
    // Formula: Level = Math.floor(Math.sqrt(XP) / 2)
    const bombXp = selectedHero.bomb_mastery_xp || 0;
    const agilityXp = selectedHero.agility_xp || 0;

    const bombLevel = Math.floor(Math.sqrt(bombXp) / 2);
    this.playerStats.bombSize = (this.playerStats.bombSize || 1) * (1 + bombLevel * 0.001); // +0.1% per level (nerfed for balance)

    // Agility: +0.1% Speed per level
    const agilityLevel = Math.floor(Math.sqrt(agilityXp) / 2);
    this.playerStats.speed *= (1 + agilityLevel * 0.001); // +0.1% per level

    // Load Bestiary Data for Bonuses
    try {
      const bestiaryRes = await api.getBestiary();
      if (bestiaryRes.success) {
        this.bestiaryData = bestiaryRes.bestiary;
      }
    } catch (e) {
      console.warn('Failed to load bestiary data', e);
      this.bestiaryData = {};
    }

    this.registry.remove('selectedHero');

    // Use stage background if available, else default
    const bgAsset = this.stageConfig ? this.stageConfig.background_asset : 'bg1';
    this.bg = this.add
      .image(this.scale.width / 2, this.scale.height / 2, bgAsset)
      .setOrigin(0.5)
      .setDisplaySize(480, 800);
    this.scene.launch('HUDScene');
    this.time.delayedCall(100, () => {
      this.events.emit('update-health', {
        health: this.playerStats.hp,
        maxHealth: this.playerStats.maxHp,
      });
      this.events.emit('update-xp', {
        accountLevel: this.playerStats.account_level,
        accountXP: this.playerStats.account_xp,
        heroXP: this.playerStats.hero_xp,
        heroXPForNextLevel: this.playerStats.hero_xp_for_next_level,
      });
      // JF-02 FIX: Use the global event emitter to update the BCOIN balance in the HUD
      GameEventEmitter.emit('bcoin-balance-update', {
        balance: this.playerStats.bcoin,
      });
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
    // JF-01 FIX: Removed 'await' to prevent scene from hanging on audio load.
    SoundManager.playWorldMusic(this, 1);
    this.input.keyboard.on('keydown-ESC', this.togglePause, this);

    // [PRAGMATIC INPUT FIX] Delay shooting enablement to prevent Menu clicks from leaking
    this.canShoot = false;
    this.time.delayedCall(500, () => {
        this.canShoot = true;
    });

    // FURIA-FS-01: Signal that initialization is complete and the update loop can run.
    this.isInitialized = true;
  }

  initializePveMatch() {
    // LP-05: Initialize world and phase progression system
    // Stage Routing: Map Stage ID to World ID for enemy scaling/assets
    this.world = this.stageConfig ? this.stageConfig.id : 1;
    this.phase = 1;

    // Determine max phases (waves) for this Node
    this.maxPhases = (this.stageConfig && this.stageConfig.enemy_config)
        ? this.stageConfig.enemy_config.wave_count
        : 7; // Default to old 7-phase system if no config

    this.waveStarted = false;
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.activePowerups = {};
    this.sessionLoot = { coins: 0, xp: 0, items: [] }; // Risk Mechanics + Items
    this.sessionBestiary = {}; // Phase 2: Bestiary
    this.sessionBombHits = 0; // Phase 2: Proficiency
    this.sessionDistance = 0; // Phase 2: Proficiency
    this.coinsEarned = 0; // Legacy, kept for compatibility if needed
    this.baseEnemyHp = 1;
    this.baseBossHp = 100;

    // ⚠️ RISK ZONE UI
    const riskText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, '⚠️ RISK ZONE ⚠️\nSurvive to Keep Loot!', {
      fontFamily: '"Press Start 2P"',
      fontSize: '24px',
      fill: '#ff0000',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: riskText,
      alpha: 0,
      duration: 500,
      delay: 2000,
      onComplete: () => riskText.destroy()
    });

    this.bombs = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.lootGroup = this.physics.add.group(); // Loot Drop System
    this.powerupLogic = new PowerupLogic(this);
    this.collisionHandler = new CollisionHandler(
      this,
      this.events,
      this.powerupLogic
    );
    this.collisionHandler.register();
    this.enemySpawner = new EnemySpawner(this, this.playerStats.account_level);

    this.bombTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      loop: true,
      callback: () => {
        // CQ-02: Only fire if player state allows it
        if (this.player?.active && this.playerState === 'CAN_SHOOT' && this.canShoot) {
          this.firePlayerBomb(true);
        }
      },
    });

    // LP-05: Call the new wave spawner with the world and phase
    this.enemySpawner.spawnWave(this.world, this.phase);

    // LP-05: Emit initial wave update for the HUD
    this.events.emit('update-wave', {
      world: this.world,
      phase: this.phase,
      isBoss: this.phase === this.maxPhases, // Show boss UI on last wave?
    });

    // ⏱️ TIMER: 3 Minutes Survival Limit
    this.matchTime = 180;
    if (this.matchTimerEvent) this.matchTimerEvent.remove();
    this.matchTimerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateMatchTimer,
      callbackScope: this,
      loop: true,
    });
    this.events.emit('update-timer', { time: this.matchTime });
  }

  updateMatchTimer() {
    if (this.gamePaused || this.transitioning) return;

    this.matchTime--;
    this.events.emit('update-timer', { time: this.matchTime });

    if (this.matchTime <= 0) {
      // Time Up = Extraction/Victory
      this.handleGameOver(true);
    }
  }

  initializePvpMatch() {
    if (!this.opponent) {
      console.error(
        'PvP match started without opponent data! Returning to menu.'
      );
      this.scene.start('MenuScene');
      return;
    }
    this.level = 'PvP';
    this.waveStarted = true;

    // Construct the correct sprite key (e.g., 'witch_hero') from the opponent data
    const opponentSpriteKey = this.opponent.hero.sprite_name
      ? `${this.opponent.hero.sprite_name.toLowerCase()}_hero`
      : 'player_default';
    this.opponentPlayer = this.physics.add
      .sprite(this.scale.width / 2, 100, opponentSpriteKey)
      .setCollideWorldBounds(true)
      .setImmovable(true);
    this.opponentPlayer.setTint(0xff8080);
    this.opponentPlayer.body.setSize(
      this.opponentPlayer.width * 0.8,
      this.opponentPlayer.height * 0.8
    );

    if (this.opponent.userId === -1) {
      this.opponentMoveDirection = 1;
      this.opponentPlayer.setVelocityX(100 * this.opponentMoveDirection);
      this.time.addEvent({
        delay: 1500,
        callback: () => {
          if (this.opponentPlayer.active) {
            this.opponentMoveDirection *= -1;
            this.opponentPlayer.setVelocityX(100 * this.opponentMoveDirection);
          }
        },
        loop: true,
      });
      this.time.addEvent({
        delay: 1200,
        callback: this.fireOpponentBomb,
        callbackScope: this,
        loop: true,
      });
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

    this.physics.add.collider(
      this.playerBombs,
      this.opponentPlayer,
      (opponent, bomb) => {
        bomb.destroy();
        new ExplosionEffect(this, opponent.x, opponent.y);
        // TODO: Handle opponent health update via network
      }
    );
    this.physics.add.collider(
      this.opponentBombs,
      this.player,
      (player, bomb) => {
        bomb.destroy();
        new ExplosionEffect(this, player.x, player.y);
        this.playerStats.hp -= 10;
        this.events.emit('update-health', {
          health: this.playerStats.hp,
          maxHealth: this.playerStats.maxHp,
        });
        if (this.playerStats.hp <= 0) this.handleGameOver();
      }
    );

    // Loot Pickup Collider
    this.physics.add.overlap(
      this.player,
      this.lootGroup,
      this.handleLootPickup,
      null,
      this
    );
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
      console.error('Attempted to fire a bomb for a firer with no stats.', {
        isOpponent,
      });
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
      bomb
        .setDisplaySize(bombDisplaySize, bombDisplaySize)
        .setVelocityY(velocityY);

      // 💣 BOMB PULSE (Visual Overhaul)
      // Pulse scale
      this.tweens.add({
        targets: bomb,
        scaleX: bomb.scaleX * 1.2,
        scaleY: bomb.scaleY * 1.2,
        duration: 200,
        yoyo: true,
        repeat: -1,
      });
      // Pulse Tint (Red Warning)
      this.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 200,
        yoyo: true,
        repeat: -1,
        onUpdate: (tween) => {
          const val = Math.floor(tween.getValue());
          // Interpolate towards red (tint reduces green/blue channels)
          // Start: 0xffffff (No tint) -> End: 0xffcccc (Reddish)
          // Actually, setTint works by multiplying.
          // To make it redder, we want 0xff0000.
          // Let's just flash it red.
          if (val > 50) {
            bomb.setTint(0xff4444);
          } else {
            bomb.clearTint();
            if (isOpponent) bomb.setTint(0xff8080);
          }
        },
      });

      if (isOpponent) bomb.setTint(0xff8080);
    }

    if (!isOpponent) {
      const now = Date.now();
      if (now - this.lastBombSoundTime > 100) {
        SoundManager.play(this, 'bomb_fire');
        this.lastBombSoundTime = now;
      }
    }
  }

  resetWaveState() {
    this.enemiesKilled = 0;
    this.enemiesSpawned = 0;
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.waveStarted = false;
    this.transitioning = false;
    // LP-05: Update background and music based on the current world
    this.bg.setTexture(`bg${Math.min(this.world, 5)}`);
    SoundManager.playWorldMusic(this, this.world);
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
          winnerAddress: winnerAddress,
        });

        if (response.success) {
          SoundManager.play(this, 'gameover'); // Use victory sound later
          this.scene.stop('HUDScene');
          this.scene.start('GameOverScene', {
            score: 1000, // Placeholder for PvP
            coinsEarned: response.rewards ? response.rewards.bcoin || 0 : 0,
            finalScore: 1000,
            customMessage: response.message,
          });
        } else {
          throw new Error(response.message || 'Failed to report match result.');
        }
      } catch (error) {
        console.error('Error reporting match result:', error);
        this.scene.stop('HUDScene');
        this.scene.start('MenuScene', {
          error: 'Failed to report match result.',
        });
      }
    } else {
      // Handle player loss
      this.scene.stop('HUDScene');
      this.scene.start('GameOverScene', {
        score: 0,
        coinsEarned: 0,
        customMessage: 'Você foi derrotado!',
      });
    }
  }

  async handleGameOver(isVictory = false) {
    if (this.gamePaused || this.transitioning) return;
    this.transitioning = true; // Use transitioning to prevent double calls
    this.gamePaused = true;
    this.player?.setActive(false);
    this.setPlayerState('CANNOT_SHOOT', 'Game over');
    SoundManager.stopAll(this);

    // Risk Mechanic: Lose Loot on Defeat
    let finalCoins = 0;
    let finalXp = 0;
    let finalItems = [];

    if (isVictory) {
      SoundManager.play(this, 'level_up'); // Or victory sound
      finalCoins = this.sessionLoot.coins;
      finalXp = this.sessionLoot.xp; // Or stick to score-based XP? Using Score for XP for now.
      finalItems = this.sessionLoot.items || [];
    } else {
      SoundManager.play(this, 'gameover');
      finalCoins = 0; // Lost everything
      // Optional: XP penalty? For now, we keep XP based on score (kills) or maybe lose it too?
      // Prompt said: "O jogador perde 100% do Loot Temporário". XP loss was optional.
      // Let's assume XP is safe (Account progression) but Coins are lost (Loot).
      // Actually, usually in Roguelites, you keep XP.
      finalXp = this.score;
      finalItems = []; // Lost items
    }

    const heroId = this.playerStats.id;

    // This is the critical fix: report the match result to the backend to award XP.
    if (heroId) {
      try {
        console.log(
          `[GameScene] Reporting match complete. HeroID: ${heroId}, XP: ${finalXp}, Coins: ${finalCoins}, Items: ${finalItems.length}`
        );
        // Phase 2: Submit Bestiary and Proficiency Data
        const bestiary = this.sessionBestiary || {};
        const proficiency = {
            bombHits: this.sessionBombHits || 0,
            distance: this.sessionDistance || 0
        };

        // Use the new, correct method on the api client.
        const response = await api.completeMatch(heroId, finalXp, finalCoins, bestiary, proficiency, finalItems);
        if (response.success) {
          console.log('[GameScene] XP/Coins/Proficiency awarded successfully by the server.');
        } else {
          console.warn(
            '[GameScene] Server failed to award rewards:',
            response.message
          );
        }

        // --- STAGE UNLOCK LOGIC (Phase 4 Foundation) ---
        if (isVictory && this.stageConfig) {
             const unlockRes = await api.completeStage(heroId, this.stageConfig.id);
             if (unlockRes.unlocked) {
                 console.log(`[GameScene] STAGE UNLOCKED! New Max Stage: ${unlockRes.newMaxStage}`);
                 // Optional: Show unlock notification
             }
        }

      } catch (error) {
        console.error('[GameScene] Error reporting match completion:', error);
      }
    }

    // LP-05 & LP-07: Pass all relevant data to GameOverScene
    this.scene.stop('HUDScene');
    this.scene.start('GameOverScene', {
      score: this.score,
      world: this.world,
      phase: this.phase,
      coins: finalCoins, // Show what was actually kept
      xpGained: finalXp,
      isVictory: isVictory
    });
  }

  update(time, delta) {
    // FURIA-FS-01: Add guard clause to prevent update loop from running before async create() is complete.
    if (
      !this.isInitialized ||
      this.pauseManager.isPaused ||
      !this.player?.active
    )
      return;
    this.playerController.update(this.cursors, this.playerStats.speed, delta);

    if (this.gameMode !== 'ranked') {
      this.updatePve();
    }
  }

  prepareNextStage() {
    // LP-05: This function is now the single point of logic for advancing waves.
    this.phase++;

    // Check if Node is complete
    if (this.phase > this.maxPhases) {
        // Victory!
        this.handleGameOver(true);
        return;
    }

    this.resetWaveState();
    this.physics.resume();
    this.setPlayerState('CAN_SHOOT', 'Next stage prepared');

    // LP-05: Emit wave update for the HUD
    this.events.emit('update-wave', {
      world: this.world,
      phase: this.phase,
      isBoss: this.phase === this.maxPhases,
    });

    this.enemySpawner.spawnWave(this.world, this.phase);
  }

  updatePve() {
    // FURIA-FS-04: Black box recorder for debugging disappearing enemies.
    // We log the state of every enemy on every frame to a global array.
    // If the bug occurs, we can inspect `window.enemyStateHistory` in the console.
    if (this.enemies && this.enemies.getChildren().length > 0) {
      const enemyStates = this.enemies.getChildren().map((e) => ({
        id: e.name, // Assuming enemies have a unique name/ID
        x: e.x,
        y: e.y,
        active: e.active,
        visible: e.visible,
        hp: e.hp,
        timestamp: this.time.now,
      }));
      window.enemyStateHistory.push(...enemyStates);
    }
    // Keep history from getting too large
    if (window.enemyStateHistory.length > 5000) {
      window.enemyStateHistory.splice(
        0,
        window.enemyStateHistory.length - 5000
      );
    }

    // HS1-02: The logic for advancing to the next stage after a boss is defeated
    // has been moved entirely to CollisionHandler.js to ensure it's triggered
    // at the exact moment of the boss's defeat. This prevents race conditions
    // and bugs where the game state wasn't paused/resumed correctly.

    // Use a temporary array to avoid issues with modifying the group while iterating
    const enemiesToProcess = this.enemies.getChildren().slice();
    enemiesToProcess.forEach((enemy) => {
      if (enemy?.active && enemy.y > this.scale.height + 20) {
        // JF-04 FIX: Destroy the enemy instead of deactivating it.
        // The previous deactivation logic caused race conditions with the EnemySpawner's
        // object pooling, leading to enemies disappearing mid-screen. Destroying them is a
        // more robust solution that permanently fixes the bug.
        enemy.destroy();

        if (this.pauseManager.isPaused) return;
        const damageTaken = 50;
        this.playerStats.hp -= damageTaken;
        this.events.emit('update-health', {
          health: this.playerStats.hp,
          maxHealth: this.playerStats.maxHp,
        });
        if (this.playerStats.hp <= 0) {
          this.playerStats.extraLives--;
          if (this.playerStats.extraLives >= 0) {
            this.playerStats.hp = this.playerStats.maxHp;
            SoundManager.play(this, 'player_hit');
            this.events.emit('update-health', {
              health: this.playerStats.hp,
              maxHealth: this.playerStats.maxHp,
            });
          } else {
            this.playerStats.hp = 0;
            this.playerStats.extraLives = 0;
            this.events.emit('update-health', {
              health: 0,
              maxHealth: this.playerStats.maxHp,
            });
            this.handleGameOver();
          }
        } else {
          SoundManager.play(this, 'player_hit');
        }
      }
    });

    // Loot Drop Logic (20% Chance on Death)
    // We hook here because we iterate enemies and destroy them here.
    enemiesToProcess.forEach(enemy => {
        if (!enemy.active && enemy.dropped === undefined) {
             // Flag to prevent double drops if multiple things kill it
             enemy.dropped = true;
             this.trySpawnLoot(enemy.x, enemy.y);
        }
    });

    // LP-05: Check if the current non-boss wave is complete, then advance.
    if (
      this.enemiesSpawned > 0 &&
      this.enemiesKilled >= this.enemiesSpawned &&
      !this.bossSpawned &&
      !this.waveStarted &&
      !this.transitioning
    ) {
      this.waveStarted = true; // Prevents this from being called multiple times
      this.time.delayedCall(1000, this.prepareNextStage, [], this);
    }
  }

  togglePause() {
    this.pauseManager.pause();
  }

  trySpawnLoot(x, y) {
    if (Math.random() > 0.2) return; // 20% Global Drop Rate

    const roll = Math.random() * 100;
    let itemKey = '';
    let itemName = '';
    let isBcoin = false;

    // Drop Table
    if (roll < 50) {
        // 50% Gold (BCOIN)
        itemKey = 'icon_bcoin'; // or 'icon_gold'
        itemName = 'BCOIN';
        isBcoin = true;
    } else if (roll < 80) {
        // 30% Scrap
        itemKey = 'item_scrap';
        itemName = 'Scrap Metal';
    } else if (roll < 95) {
        // 15% Potion
        itemKey = 'item_health_potion';
        itemName = 'Health Potion';
    } else {
        // 5% Equipment (Rare/Common)
        const equipRoll = Math.random();
        if (equipRoll < 0.25) { itemKey = 'item_rusty_sword'; itemName = 'Rusty Sword'; }
        else if (equipRoll < 0.50) { itemKey = 'item_leather_vest'; itemName = 'Leather Vest'; }
        else if (equipRoll < 0.75) { itemKey = 'item_neon_boots'; itemName = 'Neon Boots'; }
        else { itemKey = 'item_iron_katana'; itemName = 'Iron Katana'; }
    }

    // Spawn Sprite
    const loot = this.lootGroup.create(x, y, itemKey);
    loot.setDisplaySize(24, 24);
    loot.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-50, 50));
    loot.setDrag(100);
    loot.itemName = itemName;
    loot.isBcoin = isBcoin;

    // Float Animation
    this.tweens.add({
        targets: loot,
        y: y - 5,
        duration: 1000,
        yoyo: true,
        repeat: -1
    });

    // Auto-destroy after 15s to save memory
    this.time.delayedCall(15000, () => {
        if (loot.active) loot.destroy();
    });
  }

  handleLootPickup(player, loot) {
      if (!loot.active) return;

      // Add to session
      if (loot.isBcoin) {
          const amount = Phaser.Math.Between(1, 5);
          this.sessionLoot.coins += amount;
          this.showFloatingText(player.x, player.y - 20, `+${amount} BCOIN`, '#00ffff');
      } else {
          this.sessionLoot.items.push(loot.itemName);
          this.showFloatingText(player.x, player.y - 20, loot.itemName, '#ffffff');
      }

      SoundManager.play(this, 'coin_collect'); // Use generic collect sound
      loot.destroy();
  }

  showFloatingText(x, y, message, color) {
      const text = this.add.text(x, y, message, {
          fontFamily: '"Press Start 2P"',
          fontSize: '10px',
          color: color,
          stroke: '#000000',
          strokeThickness: 2
      }).setOrigin(0.5);

      this.tweens.add({
          targets: text,
          y: y - 30,
          alpha: 0,
          duration: 1000,
          onComplete: () => text.destroy()
      });
  }
}
