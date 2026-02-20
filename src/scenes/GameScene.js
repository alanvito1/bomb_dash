// 🎮 GameScene.js – Cena principal do jogo (gameplay)
import api from '../api.js';
import CollisionHandler from '../modules/CollisionHandler.js';
import EnemySpawner from '../modules/EnemySpawner.js';
import ExplosionEffect from '../modules/ExplosionEffect.js';
import DamageTextManager from '../modules/DamageTextManager.js';
import NeonBurstManager from '../modules/NeonBurstManager.js';
import { showNextStageDialog as StageDialog } from '../modules/NextStageDialog.js';
import PlayerController from '../modules/PlayerController.js';
import PowerupLogic from '../modules/PowerupLogic.js';
import { createUIButtons } from '../modules/UIMenuButtons.js';
import PauseManager from '../utils/PauseManager.js';
import SoundManager from '../utils/sound.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';
import ChatWidget from '../ui/ChatWidget.js';
import playerStateService from '../services/PlayerStateService.js';
import { MOBS } from '../config/MobConfig.js';

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
    this.events.on('shutdown', this.shutdown, this);
    this.chatWidget = new ChatWidget(this);
    this.initializeScene();
  }

  shutdown() {
    if (this.chatWidget) this.chatWidget.destroy();
    this.scene.stop('HUDScene');
  }

  async initializeScene() {
    window.enemyStateHistory = [];
    console.log('[VCL-09] GameScene: Starting initialization...');

    this.pauseManager = new PauseManager(this);
    SoundManager.stop(this, 'menu_music');
    this.score = 0;

    let userAccountData = {};
    try {
      const response = await api.fetch('/auth/me', {}, true);
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
      return;
    }

    const selectedHero = this.registry.get('selectedHero');

    if (!selectedHero || !selectedHero.id) {
      console.error(
        '[GameScene] CRITICAL: Scene started without a valid selected hero. Aborting.'
      );
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
      return;
    }

    this.playerStats = {
      ...this.DEFAULT_STATS,
      ...selectedHero,
      hero_xp: selectedHero.xp || 0,
      hero_xp_for_next_level: 100,
      address: userAccountData.address,
      account_level: userAccountData.account_level,
      account_xp: userAccountData.account_xp,
      bcoin: userAccountData.coins,
    };

    const heroStats = selectedHero.stats || selectedHero;
    const heroSpeed = heroStats.speed || 1;
    const heroPower = heroStats.power || 1;
    const heroBombNum = heroStats.bomb_num || 1;
    const heroRange = heroStats.range || heroStats.bomb_range || 1;

    const heroLevel = selectedHero.level || 1;

    this.playerStats.damage = heroPower + (heroLevel - 1);

    const baseSpeed = 150 + (heroSpeed * 10);
    this.playerStats.speed = baseSpeed * (1 + (heroLevel - 1) * 0.02);

    this.playerStats.bombNum = heroBombNum;
    this.playerStats.bombRange = heroRange;

    const bombXp = selectedHero.bomb_mastery_xp || 0;
    const agilityXp = selectedHero.agility_xp || 0;

    const bombLevel = Math.floor(Math.sqrt(bombXp) / 2);
    this.playerStats.bombRange *= (1 + bombLevel * 0.01);

    const agilityLevel = Math.floor(Math.sqrt(agilityXp) / 2);
    this.playerStats.speed *= (1 + agilityLevel * 0.005);

    const accountLevel = playerStateService.getAccountLevel();
    const globalMultiplier = 1 + (accountLevel * 0.01);
    this.playerStats.damage *= globalMultiplier;
    this.playerStats.speed *= globalMultiplier;
    console.log(`[GameScene] Applied Global Buff: Level ${accountLevel} -> x${globalMultiplier.toFixed(2)}`);

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
      GameEventEmitter.emit('bcoin-balance-update', {
        balance: this.playerStats.bcoin,
      });
    });

    // --- TASK FORCE: THE HEART OF GAME JUICE ---
    this.damageTextManager = new DamageTextManager(this);
    this.neonBurst = new NeonBurstManager(this);

    this.playerController = new PlayerController(this);
    this.player = this.playerController.create();

    // 1. O Efeito Bloom (Hero) - Subtle
    if (this.player.preFX) {
        const bloom = this.player.preFX.addBloom(0xffffff, 1, 1, 1.2, 1.2);
    }

    this.cursors = this.input.keyboard.createCursorKeys();

    if (this.gameMode === 'ranked') {
      this.initializePvpMatch();
    } else {
      this.initializePveMatch();
    }

    createUIButtons(this, this.playerStats);
    SoundManager.playWorldMusic(this, 1);
    this.input.keyboard.on('keydown-ESC', this.togglePause, this);

    this.canShoot = false;
    this.time.delayedCall(500, () => {
        this.canShoot = true;
    });

    this.isInitialized = true;
  }

  initializePveMatch() {
    this.world = this.stageConfig ? this.stageConfig.id : 1;

    // TASK FORCE STEP 2: 30-Wave Engine
    this.currentWave = 1;
    this.maxWaves = (this.stageConfig && this.stageConfig.enemy_config) ? this.stageConfig.enemy_config.wave_count : 30;
    this.waveQuota = (this.stageConfig && this.stageConfig.enemy_config) ? this.stageConfig.enemy_config.wave_quota : 10;
    this.waveKills = 0;
    this.isBossLevel = false;

    this.waveStarted = false;
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0; // Total killed in session (kept for HUD compatibility)
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.activePowerups = {};

    this.sessionLoot = { coins: 0, xp: 0, items: [] }; // Initialize as object for easier tracking
    this.sessionBestiary = {};
    this.sessionBombHits = 0;
    this.sessionDistance = 0;
    this.coinsEarned = 0;

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
        if (this.player?.active && this.playerState === 'CAN_SHOOT' && this.canShoot) {
          this.firePlayerBomb(true);
        }
      },
    });

    // Start Wave 1
    this.startWave(this.currentWave);

    this.matchTime = 600; // 10 minutes
    if (this.matchTimerEvent) this.matchTimerEvent.remove();
    this.matchTimerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.updateMatchTimer,
      callbackScope: this,
      loop: true,
    });
    this.events.emit('update-timer', { time: this.matchTime });
  }

  // New Method: startWave
  startWave(wave) {
      this.currentWave = wave;
      this.waveKills = 0;
      this.waveStartKills = this.enemiesKilled; // Baseline for quota check
      this.isBossLevel = (wave === this.maxWaves);

      // Update HUD
      this.events.emit('update-wave', {
          world: this.world,
          phase: this.currentWave,
          isBoss: this.isBossLevel
      });

      console.log(`[GameScene] Starting Wave ${wave}/${this.maxWaves} (Quota: ${this.waveQuota})`);

      // Difficulty Scaling (Base Stage Difficulty + Wave Scaling)
      const stageDiff = this.stageConfig?.difficulty_multiplier || 1.0;
      const waveDiff = 1.0 + ((wave - 1) * 0.05); // +5% per wave
      const totalDiff = parseFloat((stageDiff * waveDiff).toFixed(2));

      // Select Mob
      const config = this.stageConfig?.enemy_config;
      if (!config) {
          // Fallback
          this.enemySpawner.startSpawning({ id: 'slime_green', asset_key: 'enemy1', base_hp: 10, base_speed: 50 }, totalDiff);
          return;
      }

      // Logic: 1-15 Mob A, 16-29 Mob B, 30 Boss
      if (this.isBossLevel) {
          this.enemySpawner.spawnBoss(config.boss, totalDiff);
      } else if (wave >= 16) {
          this.enemySpawner.startSpawning(config.mob_b, totalDiff);
      } else {
          this.enemySpawner.startSpawning(config.mob_a, totalDiff);
      }
  }

  prepareNextStage() {
    // This is called when quota is met (Waves 1-29) OR when Boss defeated (via CollisionHandler -> StageDialog)

    if (this.currentWave >= this.maxWaves) {
        // Victory!
        this.handleVictory();
        return;
    }

    // Advance Wave
    this.currentWave++;
    this.startWave(this.currentWave);
  }

  updatePve() {
    if (this.enemies && this.enemies.getChildren().length > 0) {
      const enemyStates = this.enemies.getChildren().map((e) => ({
        id: e.name,
        x: e.x,
        y: e.y,
        active: e.active,
        visible: e.visible,
        hp: e.hp,
        timestamp: this.time.now,
      }));
      window.enemyStateHistory.push(...enemyStates);
    }
    if (window.enemyStateHistory.length > 5000) {
      window.enemyStateHistory.splice(0, window.enemyStateHistory.length - 5000);
    }

    const enemiesToProcess = this.enemies.getChildren().slice();
    enemiesToProcess.forEach((enemy) => {
      if (enemy?.active && enemy.y > this.scale.height + 20) {
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

    // CHECK WAVE PROGRESS
    // Use waveStartKills offset
    if (typeof this.waveStartKills === 'undefined') this.waveStartKills = 0;

    const currentWaveKills = this.enemiesKilled - this.waveStartKills;

    if (currentWaveKills >= this.waveQuota && !this.isBossLevel && !this.transitioning) {
        // Make sure we increment waveStartKills so we don't trigger repeatedly
        this.waveStartKills = this.enemiesKilled;
        this.prepareNextStage();
    }
  }

  updateMatchTimer() {
    if (this.gamePaused || this.transitioning) return;

    this.matchTime--;
    this.events.emit('update-timer', { time: this.matchTime });

    if (this.matchTime <= 0) {
      this.handleGameOver(false);
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
    if (!stats) return;

    let count = stats.bombNum || 1;
    if (!stats.bombNum && stats.multiShot !== undefined) {
        count = 1 + stats.multiShot;
    }

    const bombSize = stats.bombSize || 1;
    const bombDisplaySize = 8 * bombSize;
    const baseVelocity = Math.abs(velocityY);
    const direction = velocityY > 0 ? 1 : -1;

    const createBomb = (x, y, vx, vy) => {
        const bomb = bombGroup.create(x, y, 'bomb');
        bomb.setDisplaySize(bombDisplaySize, bombDisplaySize)
            .setVelocity(vx, vy);

        // 1. O Efeito Bloom (Projectile) - Intense
        // White Core (ffffff), Aura depends on state/tint
        if (bomb.preFX) {
             // Color for aura: Default Neon Orange (FF5F1F) or Cyan (00FFFF)
             // Let's use Neon Orange for Player Bombs
             const bloomColor = isOpponent ? 0xff0000 : 0xFF5F1F;
             bomb.preFX.addBloom(bloomColor, 1, 1, 2, 1.2);
        }

        this.tweens.add({
            targets: bomb,
            scaleX: bomb.scaleX * 1.2,
            scaleY: bomb.scaleY * 1.2,
            duration: 200,
            yoyo: true,
            repeat: -1,
        });

        if (isOpponent) {
             bomb.setTint(0xff8080);
        } else {
            this.tweens.addCounter({
                from: 0,
                to: 100,
                duration: 200,
                yoyo: true,
                repeat: -1,
                onUpdate: (tween) => {
                    if (tween.getValue() > 50) bomb.setTint(0xff4444);
                    else bomb.clearTint();
                },
            });
        }
    };

    const startY = firer.y + (direction * 30);

    if (count === 1) {
        createBomb(firer.x, startY, 0, direction * baseVelocity);
    } else if (count === 2) {
        const spacing = 15;
        createBomb(firer.x - spacing, startY, 0, direction * baseVelocity);
        createBomb(firer.x + spacing, startY, 0, direction * baseVelocity);
    } else {
        const totalSpread = 45;
        const step = totalSpread / (count - 1);
        const startAngle = -totalSpread / 2;

        for (let i = 0; i < count; i++) {
            const angleDeg = startAngle + (step * i);
            let finalAngle = 0;
            if (direction === -1) {
                 finalAngle = Phaser.Math.DegToRad(-90 + angleDeg);
            } else {
                 finalAngle = Phaser.Math.DegToRad(90 + angleDeg);
            }
            const vx = Math.cos(finalAngle) * baseVelocity;
            const vy = Math.sin(finalAngle) * baseVelocity;
            createBomb(firer.x, startY, vx, vy);
        }
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
          SoundManager.play(this, 'gameover');
          this.scene.stop('HUDScene');
          this.scene.start('GameOverScene', {
            score: 1000,
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
      this.scene.stop('HUDScene');
      this.scene.start('GameOverScene', {
        score: 0,
        coinsEarned: 0,
        customMessage: 'Você foi derrotado!',
      });
    }
  }

  async handleVictory() {
      if (this.transitioning) return;
      this.transitioning = true;
      this.physics.pause();
      this.setPlayerState('CANNOT_SHOOT', 'Victory');
      SoundManager.stopAll(this);
      SoundManager.play(this, 'level_up');

      const cx = this.cameras.main.centerX;
      const cy = this.cameras.main.centerY;

      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.8);
      overlay.fillRect(0, 0, this.scale.width, this.scale.height);
      overlay.setDepth(2000);

      this.add.text(cx, cy - 50, 'STAGE CLEAR!', {
          fontFamily: '"Press Start 2P"',
          fontSize: '32px',
          color: '#00ff00',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 6
      }).setOrigin(0.5).setDepth(2001);

      this.add.text(cx, cy + 20, `LOOT SECURED:\n${this.sessionLoot.coins} Coins`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 10
      }).setOrigin(0.5).setDepth(2001);

      const xpGain = 50;
      const xpResult = playerStateService.addAccountXp(xpGain);

      this.add.text(cx, cy + 60, `+${xpGain} SUMMONER XP`, {
          fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#00ffff'
      }).setOrigin(0.5).setDepth(2001);

      if (xpResult.leveledUp) {
          this.add.text(cx, cy + 85, `LEVEL UP! (${xpResult.newLevel})`, {
              fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#ffd700'
          }).setOrigin(0.5).setDepth(2001);
          SoundManager.play(this, 'level_up');
      }

      // Persist Loot (Coins)
      if (this.playerStats.id) {
         try {
             await api.completeMatch(this.playerStats.id, xpGain, this.sessionLoot.coins, this.sessionBestiary, {}, []);
         } catch(e) {
             console.warn('[GameScene] Failed to sync victory stats:', e);
         }
      }

      if (this.playerStats.id && this.stageConfig) {
          playerStateService.completeStage(this.playerStats.id, this.stageConfig.id);
      }

      // Save Session Loot Items (Fragments) to Inventory
      if (this.sessionLoot.items && this.sessionLoot.items.length > 0) {
          playerStateService.addSessionLoot(this.sessionLoot.items);
      }

      this.time.delayedCall(3000, () => {
          this.scene.stop('HUDScene');
          this.scene.start('WorldMapScene');
      });
  }

  async handleGameOver(isVictory = false) {
    if (this.gamePaused || this.transitioning) return;
    this.transitioning = true;
    this.gamePaused = true;
    this.player?.setActive(false);
    this.setPlayerState('CANNOT_SHOOT', 'Game over');
    SoundManager.stopAll(this);

    SoundManager.play(this, 'gameover');
    const finalCoins = 0;
    const finalXp = this.score;

    const heroId = this.playerStats.id;
    if (heroId) {
      try {
        await api.completeMatch(heroId, finalXp, finalCoins, this.sessionBestiary || {}, {}, []);
      } catch (e) {
        console.warn('Failed to report defeat stats', e);
      }
    }

    this.scene.stop('HUDScene');
    this.scene.start('GameOverScene', {
      score: this.score,
      world: this.world,
      phase: this.currentWave,
      coins: 0,
      xpGained: finalXp,
      isVictory: false,
      customMessage: 'MISSION FAILED\nLOOT LOST'
    });
  }

  update(time, delta) {
    if (!this.isInitialized || this.pauseManager.isPaused || !this.player?.active) return;
    this.playerController.update(this.cursors, this.playerStats.speed, delta);

    if (this.gameMode !== 'ranked') {
      this.updatePve();
    }
  }

  togglePause() {
    this.pauseManager.pause();
  }

  trySpawnLoot(x, y) {
    // 1. Health Potion (5% Chance - Coexists)
    if (Math.random() < 0.05) {
        this.spawnLootItem(x, y, 'item_health_potion', 'Health Potion', 0xffffff, false);
    }

    // 2. Global Drop System (30% Chance)
    if (Math.random() > 0.3) return;

    // 3. Rarity Roll (The Roulette)
    const roll = Math.random() * 100;
    let rarity = 'Common';
    let color = 0xAAAAAA;

    if (roll < 85) {
        rarity = 'Common';
        color = 0xAAAAAA;
    } else if (roll < 95) {
        rarity = 'Rare';
        color = 0x00FF00;
    } else if (roll < 99) {
        rarity = 'Super Rare';
        color = 0x0000FF;
    } else if (roll < 99.8) {
        rarity = 'Epic';
        color = 0x800080;
    } else if (roll < 99.99) {
        rarity = 'Legendary';
        color = 0xFFA500;
    } else {
        rarity = 'Super Legendary';
        color = 0xFF0000;
    }

    // Spawn Token
    const loot = this.spawnLootItem(x, y, 'token', `${rarity} Fragment`, color, true);
    loot.rarity = rarity;
  }

  spawnLootItem(x, y, key, name, tint, isFragment) {
      const loot = this.lootGroup.create(x, y, key);
      loot.setDisplaySize(24, 24);
      if (tint) loot.setTint(tint);
      loot.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-50, 50));
      loot.setDrag(100);

      loot.itemName = name;
      loot.isFragment = isFragment;
      loot.color = tint;

      this.tweens.add({
          targets: loot,
          y: y - 5,
          duration: 1000,
          yoyo: true,
          repeat: -1
      });

      this.time.delayedCall(15000, () => {
          if (loot.active) loot.destroy();
      });

      return loot;
  }

  handleLootPickup(player, loot) {
      if (!loot.active) return;

      const isFragment = loot.isFragment;
      const rarity = loot.rarity;
      const colorInt = loot.color || 0xffffff;
      const colorHex = '#' + colorInt.toString(16).padStart(6, '0');

      loot.destroy();

      if (isFragment) {
          // Add to Session Loot
          if (!this.sessionLoot.items) this.sessionLoot.items = [];
          this.sessionLoot.items.push({
              type: 'fragment',
              rarity: rarity,
              quantity: 1
          });

          this.showFloatingText(player.x, player.y - 40, `+1 ${rarity}`, colorHex);
          SoundManager.play(this, 'coin_collect');
      } else {
          const healAmount = Math.floor(this.playerStats.maxHp * 0.2);
          this.playerStats.hp = Math.min(this.playerStats.hp + healAmount, this.playerStats.maxHp);
          this.events.emit('update-health', { health: this.playerStats.hp, maxHealth: this.playerStats.maxHp });

          this.showFloatingText(player.x, player.y - 40, `+${healAmount} HP`, '#00ff00');
          SoundManager.play(this, 'powerup_collect');
      }
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
