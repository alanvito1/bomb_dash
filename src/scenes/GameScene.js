// 🎮 GameScene.js – Cena principal do jogo (gameplay)
import api from '../api.js';
import CollisionHandler from '../modules/CollisionHandler.js';
import EnemySpawner from '../modules/EnemySpawner.js';
import Bomb from '../modules/Bomb.js';
import ClassicBomb from '../modules/BattleRoyale/ClassicBomb.js'; // Task Force: Grid Bomb
import ExplosionManager from '../modules/ExplosionManager.js';
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
import PostFXManager from '../modules/PostFXManager.js';
import { createRetroButton, createRetroPanel } from '../utils/ui.js';
import TextureGenerator from '../modules/TextureGenerator.js';

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
    this.godMode = false; // Task Force: God Mode

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

    // Task Force: Grid Config
    this.TILE_SIZE = 48; // Matches BattleRoyale and Asset scale
    this.GRID_W = 10; // 480 / 48 = 10 columns
    this.GRID_H = 16; // ~800 / 48 = 16.6 rows
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

    // Check for God Mode from Service (if set by Admin)
    this.godMode = playerStateService.godMode || false;

    console.log(
      `[GameScene] Initialized with mode: ${this.gameMode}, Match ID: ${
        this.matchId
      }, Stage: ${this.stageConfig ? this.stageConfig.name : 'Default'}`
    );
  }

  preload() {
    this.load.json('assetManifest', 'assets/asset-manifest.json');
  }

  create() {
    this.events.on('shutdown', this.shutdown, this);
    this.chatWidget = new ChatWidget(this);
    // PostFXManager.init(this); // Clean UI: Removed CRT filter
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

    // Task Force: Hero Genetics -> Combat Math
    // Task Force Update: Strict Formula from ORANGE_PAPPER.md
    // Damage = (BaseBombDamage * HeroPOW) + AccountLevel
    const baseBombDamage = 10;
    const accountLevel = playerStateService.getAccountLevel();

    this.playerStats.damage = (baseBombDamage * heroPower) + accountLevel;

    const baseSpeed = 150 + heroSpeed * 10;
    this.playerStats.speed = baseSpeed * (1 + (heroLevel - 1) * 0.02);

    // HP from Hero Stats (or Stamina fallback)
    const baseHp = (heroStats.hp || (heroStats.stamina || 10) * 100);
    this.playerStats.maxHp = baseHp;
    this.playerStats.hp = baseHp;

    this.playerStats.bombNum = heroBombNum;
    // Task Force Update: Strict Range (No Multipliers)
    this.playerStats.bombRange = heroRange;

    // Task Force: Spell Interpreter
    this.playerStats.spells = selectedHero.spells || [];
    if (this.playerStats.spells.includes('multishot')) {
        this.playerStats.multiShot = 2; // Fires 3 projectiles (1 + 2)
        console.log('[Spell Interpreter] Multishot Activated');
    }

    // Proficiency scaling
    const bombXp = selectedHero.bomb_mastery_xp || 0;
    const agilityXp = selectedHero.agility_xp || 0;

    // NOTE: Bomb Range Proficiency disabled to enforce strict NFT stats as requested.
    // const bombLevel = Math.floor(Math.sqrt(bombXp) / 2);
    // this.playerStats.bombRange *= 1 + bombLevel * 0.01;

    const agilityLevel = Math.floor(Math.sqrt(agilityXp) / 2);
    this.playerStats.speed *= 1 + agilityLevel * 0.005;

    // Task Force: Global Summoner Buff (+1% per Account Level)
    const globalMultiplier = 1 + accountLevel * 0.01;

    // Damage is now calculated via formula above, not multiplier.
    // this.playerStats.damage *= globalMultiplier;

    this.playerStats.speed *= globalMultiplier;
    this.playerStats.maxHp = Math.floor(this.playerStats.maxHp * globalMultiplier);
    this.playerStats.hp = this.playerStats.maxHp;

    // Range is strict.
    // this.playerStats.bombRange *= globalMultiplier;

    // UI Feedback
    this.time.delayedCall(1000, () => {
        const buffText = this.add.text(this.scale.width / 2, 120, `Summoner Buff: +${accountLevel}%`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(2000).setAlpha(0);

        this.tweens.add({
            targets: buffText,
            y: 80,
            alpha: 1,
            yoyo: true,
            hold: 2000,
            duration: 500,
            onComplete: () => buffText.destroy()
        });
    });

    console.log(
      `[GameScene] Applied Global Buff: Level ${accountLevel} -> x${globalMultiplier.toFixed(
        2
      )}`
    );

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

    const bgAsset = this.stageConfig
      ? this.stageConfig.background_asset
      : 'bg1';
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
    this.explosionManager = new ExplosionManager(this);
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

    // Auto-Fire Toggle State
    this.autoFire = true;

    // Manual Fire Listener
    this.input.on('pointerdown', () => {
        if (!this.autoFire && this.player?.active && this.playerState === 'CAN_SHOOT' && this.canShoot) {
            this.firePlayerBomb(true);
        }
    });

    this.canShoot = false;
    this.time.delayedCall(500, () => {
      this.canShoot = true;
    });

    this.isInitialized = true;
  }

  generateMap() {
      // Create Groups
      this.hardGroup = this.physics.add.staticGroup();
      this.softGroup = this.physics.add.staticGroup();

      // Ensure Textures exist (using Generators if needed)
      if (!this.textures.exists('block_hard')) TextureGenerator.createHardBlock(this);
      if (!this.textures.exists('block_soft')) TextureGenerator.createSoftBlock(this);

      // 1. Hard Blocks (Outer Border + Grid Pattern)
      // Grid dimensions: 10x16 (approx 480x800 with 48px tiles)

      // BORDER: Left, Right, Top. Bottom is OPEN for "Leak Penalty".
      for (let y = 0; y < this.GRID_H; y++) {
          // Left Wall
          this.placeBlock(0, y, true);
          // Right Wall
          this.placeBlock(this.GRID_W - 1, y, true);
      }
      for (let x = 1; x < this.GRID_W - 1; x++) {
          // Top Wall
          this.placeBlock(x, 0, true);
      }

      // 2. Inner Hard Blocks (Grid Pattern)
      // Every even X and even Y
      for (let y = 2; y < this.GRID_H - 1; y += 2) {
          for (let x = 2; x < this.GRID_W - 2; x += 2) {
              this.placeBlock(x, y, true);
          }
      }

      // 3. Soft Blocks (Random Scatter)
      // Avoid Player Start (Bottom Center)
      const playerGridX = Math.floor(this.player.x / this.TILE_SIZE);
      const playerGridY = Math.floor(this.player.y / this.TILE_SIZE);

      for (let y = 1; y < this.GRID_H - 1; y++) {
          for (let x = 1; x < this.GRID_W - 1; x++) {
              // Skip if Hard Block exists (simplistic check: even/even logic matches above)
              if (x % 2 === 0 && y % 2 === 0) continue;

              // Safe Zone around Player
              if (Math.abs(x - playerGridX) < 2 && Math.abs(y - playerGridY) < 2) continue;

              // Chance to spawn Soft Block
              if (Math.random() < 0.3) {
                  this.placeBlock(x, y, false);
              }
          }
      }
  }

  placeBlock(gridX, gridY, isHard) {
      const x = gridX * this.TILE_SIZE + this.TILE_SIZE / 2;
      const y = gridY * this.TILE_SIZE + this.TILE_SIZE / 2;

      const texture = isHard ? 'block_hard' : 'block_soft';
      const group = isHard ? this.hardGroup : this.softGroup;

      const block = group.create(x, y, texture);
      block.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
      block.refreshBody(); // Update static body

      block.gridX = gridX;
      block.gridY = gridY;
  }

  initializePveMatch() {
    this.world = this.stageConfig ? this.stageConfig.id : 1;

    // TASK FORCE: Generate Grid Map
    this.generateMap();

    // TASK FORCE: Grid Collisions
    // Player vs Walls
    this.physics.add.collider(this.player, this.hardGroup);
    this.physics.add.collider(this.player, this.softGroup);

    // Enemies vs Walls
    this.physics.add.collider(this.enemies, this.hardGroup);
    this.physics.add.collider(this.enemies, this.softGroup);

    // TASK FORCE STEP 2: 30-Wave Engine
    this.currentWave = 1;
    this.maxWaves =
      this.stageConfig && this.stageConfig.enemy_config
        ? this.stageConfig.enemy_config.wave_count
        : 30;
    this.waveQuota =
      this.stageConfig && this.stageConfig.enemy_config
        ? this.stageConfig.enemy_config.wave_quota
        : 6; // Task Force: Adjusted for 9s Wave Pacing
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
    const riskText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 - 100,
        '⚠️ RISK ZONE ⚠️\nSurvive to Keep Loot!',
        {
          fontFamily: '"Press Start 2P"',
          fontSize: '24px',
          fill: '#ff0000',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5)
      .setDepth(1000);

    this.tweens.add({
      targets: riskText,
      alpha: 0,
      duration: 500,
      delay: 2000,
      onComplete: () => riskText.destroy(),
    });

    this.bombs = this.physics.add.group({
      classType: Bomb, // Keeping generic for now, but will use ClassicBomb mostly
      runChildUpdate: true,
    });
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
        if (
          this.autoFire &&
          this.player?.active &&
          this.playerState === 'CAN_SHOOT' &&
          this.canShoot
        ) {
          this.firePlayerBomb(true);
        }
      },
    });

    // Start Wave 1
    this.startWave(this.currentWave);

    this.matchTime = 270; // Task Force: 4.5 Minutes
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
    this.isBossLevel = wave === this.maxWaves;

    // Update HUD
    this.events.emit('update-wave', {
      world: this.world,
      phase: this.currentWave,
      isBoss: this.isBossLevel,
    });

    console.log(
      `[GameScene] Starting Wave ${wave}/${this.maxWaves} (Quota: ${this.waveQuota})`
    );

    // Difficulty Scaling (Base Stage Difficulty + Wave Scaling)
    const stageDiff = this.stageConfig?.difficulty_multiplier || 1.0;
    // Task Force: Exponential Scaling (1.15 ^ Wave)
    const waveDiff = Math.pow(1.15, wave);
    const totalDiff = parseFloat((stageDiff * waveDiff).toFixed(2));

    // Select Mob
    const config = this.stageConfig?.enemy_config;
    if (!config) {
      // Fallback
      this.enemySpawner.startSpawning(
        { id: 'slime_green', asset_key: 'enemy1', base_hp: 10, base_speed: 50 },
        totalDiff
      );
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
      window.enemyStateHistory.splice(
        0,
        window.enemyStateHistory.length - 5000
      );
    }

    const enemiesToProcess = this.enemies.getChildren().slice();
    enemiesToProcess.forEach((enemy) => {
      // LEAK PENALTY (Bottom Screen)
      if (enemy?.active && enemy.y > this.scale.height + 20) {
        // Punish player based on enemy remaining HP
        const damageTaken = enemy.hp || 50;

        // GOD MODE CHECK
        if (this.godMode) {
          console.log('[GodMode] Damage Prevented');
          enemy.destroy();
          return;
        }

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

        enemy.destroy();
      }
    });

    // CHECK WAVE PROGRESS
    // Use waveStartKills offset
    if (typeof this.waveStartKills === 'undefined') this.waveStartKills = 0;

    const currentWaveKills = this.enemiesKilled - this.waveStartKills;

    if (
      currentWaveKills >= this.waveQuota &&
      !this.isBossLevel &&
      !this.transitioning
    ) {
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

  // --- PVP SUPPORT (RESTORED) ---
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

    this.playerBombs = this.physics.add.group({
      classType: Bomb,
      runChildUpdate: true,
    });
    this.opponentBombs = this.physics.add.group({
      classType: Bomb,
      runChildUpdate: true,
    });
    this.bombTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      loop: true,
      callback: () => {
        if (this.player?.active && this.playerState === 'CAN_SHOOT') {
          this.firePlayerBomb(false); // False for PvP (Shooting)
        }
      },
    });

    this.physics.add.collider(
      this.playerBombs,
      this.opponentPlayer,
      (opponent, bomb) => {
        bomb.deactivate();
        this.explosionManager.spawn(opponent.x, opponent.y);
      }
    );
    this.physics.add.collider(
      this.opponentBombs,
      this.player,
      (player, bomb) => {
        bomb.deactivate();
        this.explosionManager.spawn(player.x, player.y);
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

  fireOpponentBomb() {
    this.fireBomb(this.opponentPlayer, this.opponentBombs, 300, true);
  }

  firePlayerBomb(isPve) {
      // TASK FORCE: GRID SNAPPING & STATIC PLACEMENT (PvE)
      if (this.gamePaused || !this.player || !this.player.active) return;

      // BRANCH: PvE (Classic) vs PvP (Shooter)
      if (isPve) {
          const count = 1 + (this.playerStats.multiShot || 0);
          const tile = this.TILE_SIZE;
          const gridX = Math.floor(this.player.x / tile);
          const gridY = Math.floor(this.player.y / tile);

          const x = gridX * tile + tile / 2;
          const y = gridY * tile + tile / 2;

          // Check if bomb already exists there
          const existing = this.bombs.getChildren().find(b =>
              Math.abs(b.x - x) < 10 && Math.abs(b.y - y) < 10 && b.active
          );

          if (existing) return; // Cannot stack

          const bomb = new ClassicBomb(this, x, y, this.playerStats.bombRange, this.playerStats);
          this.bombs.add(bomb);
          bomb.startTimer(3000);

          SoundManager.play(this, 'bomb_fire');
      } else {
          // PvP Logic: Shoot Projectile
          const bombGroup = this.bombs; // Or playerBombs if distinct
          this.fireBomb(this.player, this.playerBombs || this.bombs, -300, false);
      }
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
    const baseVelocity = Math.abs(velocityY);
    const direction = velocityY > 0 ? 1 : -1;

    const createBomb = (x, y, vx, vy) => {
      const bomb = bombGroup.get(x, y);
      if (bomb) {
        bomb.fire(x, y, vx, vy, bombSize, isOpponent);
      }
    };

    const startY = firer.y + direction * 30;

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
        const angleDeg = startAngle + step * i;
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

  triggerExplosion(x, y, range, owner) {
      // TASK FORCE: CROSS EXPLOSION LOGIC
      const tile = this.TILE_SIZE;
      const gridX = Math.floor(x / tile);
      const gridY = Math.floor(y / tile);

      // Center Explosion
      this.explosionManager.spawn(x, y, 1.5);
      this.damageAt(x, y, owner);

      const directions = [
          {x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0}
      ];

      directions.forEach(dir => {
          for (let i = 1; i <= range; i++) {
              const tx = gridX + dir.x * i;
              const ty = gridY + dir.y * i;

              const px = tx * tile + tile / 2;
              const py = ty * tile + tile / 2;

              // Bounds Check
              if (tx < 0 || tx >= this.GRID_W || ty < 0 || ty >= this.GRID_H) break;

              // Check Hard Block
              const hardBlock = this.hardGroup.getChildren().find(b =>
                  b.active && Math.abs(b.x - px) < 10 && Math.abs(b.y - py) < 10
              );
              if (hardBlock) break; // Stop Ray

              // Visual
              this.explosionManager.spawn(px, py, 1.5);

              // Damage
              this.damageAt(px, py, owner);

              // Check Soft Block
              const softBlock = this.softGroup.getChildren().find(b =>
                  b.active && Math.abs(b.x - px) < 10 && Math.abs(b.y - py) < 10
              );

              if (softBlock) {
                  softBlock.destroy();
                  // Drop Loot?
                  if (Math.random() < 0.3) this.trySpawnLoot(px, py);
                  break; // Stop Ray
              }
          }
      });
  }

  damageAt(x, y, owner) {
      // Damage Enemies
      // Use overlap circle small
      const radius = 20;
      this.enemies.getChildren().forEach(enemy => {
         if (enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) < radius) {
             const damage = this.playerStats.damage;
             this.collisionHandler.applyDamage(enemy, damage);
         }
      });

      // Damage Player?
      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < radius) {
          if (!this.godMode) {
              this.collisionHandler.onHit(this.player, null);
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

  showSaveProgressModal(onCancel) {
    // ⚠️ GUEST MODE INTERCEPTION
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;
    const w = 300;
    const h = 200;

    const container = this.add.container(cx, cy).setDepth(3000);

    const bg = createRetroPanel(this, 0, 0, w, h, 'metal');
    container.add(bg);

    const title = this.add
      .text(0, -70, 'WARNING: PROGRESS NOT SAVED', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#ff0000',
        align: 'center',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, -30, 'Connect Google to Secure Loot.\nOr lose it forever.', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#ffffff',
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5);

    // Login Button
    const loginBtn = createRetroButton(
      this,
      0,
      20,
      200,
      40,
      'LOGIN WITH GOOGLE',
      'primary',
      () => {
        if (window.overlayManager && window.overlayManager.authManager) {
          window.overlayManager.authManager.loginGoogle();
        } else {
          console.error('Auth Manager Not Found');
        }
      },
      null
    );

    // Continue Button
    const continueBtn = createRetroButton(
      this,
      0,
      70,
      200,
      30,
      'CONTINUE (UNSAVED)',
      'neutral',
      () => {
        container.destroy();
        if (onCancel) onCancel();
      },
      null
    );

    container.add([title, desc, loginBtn, continueBtn]);
  }

  async handleVictory() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.physics.pause();
    this.setPlayerState('CANNOT_SHOOT', 'Victory');
    SoundManager.stopAll(this);
    SoundManager.play(this, 'level_up');

    const proceed = async () => {
      const cx = this.cameras.main.centerX;
      const cy = this.cameras.main.centerY;

      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.8);
      overlay.fillRect(0, 0, this.scale.width, this.scale.height);
      overlay.setDepth(2000);

      this.add
        .text(cx, cy - 50, 'STAGE CLEAR!', {
          fontFamily: '"Press Start 2P"',
          fontSize: '32px',
          color: '#00ff00',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setDepth(2001);

      this.add
        .text(cx, cy + 20, `LOOT SECURED:\n${this.sessionLoot.coins} Coins`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '16px',
          color: '#ffffff',
          align: 'center',
          lineSpacing: 10,
        })
        .setOrigin(0.5)
        .setDepth(2001);

      const xpGain = 50;
      const xpResult = playerStateService.addAccountXp(xpGain);

      this.add
        .text(cx, cy + 60, `+${xpGain} SUMMONER XP`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '12px',
          color: '#00ffff',
        })
        .setOrigin(0.5)
        .setDepth(2001);

      if (xpResult.leveledUp) {
        this.add
          .text(cx, cy + 85, `LEVEL UP! (${xpResult.newLevel})`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#ffd700',
          })
          .setOrigin(0.5)
          .setDepth(2001);
        SoundManager.play(this, 'level_up');
      }

      // Persist Loot (Coins)
      if (this.playerStats.id) {
        try {
          // Task Force: Pass Wave (30) for history
          await api.completeMatch(
            this.playerStats.id,
            xpGain,
            this.sessionLoot.coins,
            this.sessionBestiary,
            {},
            [],
            30
          );
        } catch (e) {
          console.warn('[GameScene] Failed to sync victory stats:', e);
        }
      }

      if (this.playerStats.id && this.stageConfig) {
        playerStateService.completeStage(
          this.playerStats.id,
          this.stageConfig.id
        );
      }

      // Save Session Loot Items (Fragments) to Inventory
      if (this.sessionLoot.items && this.sessionLoot.items.length > 0) {
        playerStateService.addSessionLoot(this.sessionLoot.items);
      }

      this.time.delayedCall(3000, () => {
        this.scene.stop('HUDScene');
        this.scene.start('WorldMapScene');
      });
    };

    if (playerStateService.isGuest) {
      this.showSaveProgressModal(() => {
        proceed();
      });
    } else {
      proceed();
    }
  }

  async handleGameOver(isVictory = false) {
    if (this.gamePaused || this.transitioning) return;
    this.transitioning = true;
    this.gamePaused = true;
    this.player?.setActive(false);
    this.setPlayerState('CANNOT_SHOOT', 'Game over');
    SoundManager.stopAll(this);

    SoundManager.play(this, 'gameover');

    const proceed = async () => {
      const finalCoins = 0;
      const finalXp = this.score;

      const heroId = this.playerStats.id;
      if (heroId) {
        try {
          // Task Force: Pass Current Wave for history
          await api.completeMatch(
            heroId,
            finalXp,
            finalCoins,
            this.sessionBestiary || {},
            {},
            [],
            this.currentWave
          );
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
        customMessage: 'MISSION FAILED\nLOOT LOST',
      });
    };

    if (playerStateService.isGuest) {
      this.showSaveProgressModal(() => {
        proceed();
      });
    } else {
      proceed();
    }
  }

  shakeCamera(duration, intensity) {
    // ⚡ Bolt Optimization: Throttle Shake
    if (!this.cameras.main.shakeEffect.isRunning) {
      this.cameras.main.shake(duration, intensity);
    }
  }

  update(time, delta) {
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

  togglePause() {
    this.pauseManager.pause();
  }

  toggleAutoFire() {
    this.autoFire = !this.autoFire;
    return this.autoFire;
  }

  trySpawnLoot(x, y) {
    // 1. Health Potion (5% Chance - Independent Roll)
    if (Math.random() < 0.05) {
      this.spawnLootItem(
        x,
        y,
        'item_health_potion',
        'Health Potion',
        0xffffff,
        false
      );
    }

    // Task Force: New Drop Logic (70% None, 25% Fragment, 5% BCOIN)
    const roll = Math.random() * 100;

    if (roll >= 70 && roll < 95) {
        // 25% Fragment Drop
        const rarityRoll = Math.random() * 100;
        let rarity = 'Common';
        let color = 0xcccccc; // Silver/Common

        if (rarityRoll < 60) {
            rarity = 'Common'; color = 0xcccccc;
        } else if (rarityRoll < 85) {
            rarity = 'Rare'; color = 0x00ff00;
        } else if (rarityRoll < 95) {
            rarity = 'Epic'; color = 0x800080;
        } else {
            rarity = 'Legendary'; color = 0xffa500;
        }

        const loot = this.spawnLootItem(x, y, 'item_fragment', `${rarity} Fragment`, color, true);
        loot.lootType = 'fragment';
        loot.rarity = rarity;

    } else if (roll >= 95) {
        // 5% BCOIN Drop
        const loot = this.spawnLootItem(x, y, 'item_bcoin', 'BCOIN', null, false);
        loot.lootType = 'bcoin';
    }
  }

  spawnLootItem(x, y, key, name, tint, isFragment) {
    const loot = this.lootGroup.create(x, y, key);
    // Task Force: 32x32 sprites already generated, no need to resize if key matches
    // But existing code sets display size to 24x24 which is fine for "drop" scale.
    loot.setDisplaySize(24, 24);

    if (tint) loot.setTint(tint);

    loot.setVelocity(
      Phaser.Math.Between(-50, 50),
      Phaser.Math.Between(-50, 50)
    );
    loot.setDrag(100);

    loot.itemName = name;
    loot.isFragment = isFragment;
    loot.color = tint;

    this.tweens.add({
      targets: loot,
      y: y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(15000, () => {
      if (loot.active) loot.destroy();
    });

    return loot;
  }

  handleLootPickup(player, loot) {
    if (!loot.active) return;

    const type = loot.lootType;
    const isFragment = loot.isFragment || type === 'fragment';

    // Fallback for legacy items (potions)
    const isPotion = loot.texture.key === 'item_health_potion';

    loot.destroy();

    if (type === 'bcoin') {
        // BCOIN Pickup
        if (!this.sessionLoot.coins) this.sessionLoot.coins = 0;
        this.sessionLoot.coins += 1;

        this.showFloatingText(player.x, player.y - 40, '+1 BCOIN', '#ffd700');
        SoundManager.play(this, 'coin_collect');

        // Update HUD Risk Zone
        this.events.emit('update-bcoin', {
            balance: this.sessionLoot.coins,
        });

    } else if (isFragment) {
      // Fragment Pickup
      const rarity = loot.rarity || 'Common';
      const colorInt = loot.color || 0xcccccc;
      const colorHex = '#' + colorInt.toString(16).padStart(6, '0');

      if (!this.sessionLoot.items) this.sessionLoot.items = [];
      this.sessionLoot.items.push({
        type: 'fragment',
        rarity: rarity,
        quantity: 1,
      });

      this.showFloatingText(player.x, player.y - 40, `+1 ${rarity}`, colorHex);
      SoundManager.play(this, 'coin_collect');

    } else if (isPotion) {
      // Potion Pickup
      const healAmount = Math.floor(this.playerStats.maxHp * 0.2);
      this.playerStats.hp = Math.min(
        this.playerStats.hp + healAmount,
        this.playerStats.maxHp
      );
      this.events.emit('update-health', {
        health: this.playerStats.hp,
        maxHealth: this.playerStats.maxHp,
      });

      this.showFloatingText(
        player.x,
        player.y - 40,
        `+${healAmount} HP`,
        '#00ff00'
      );
      SoundManager.play(this, 'powerup_collect');
    }
  }

  showFloatingText(x, y, message, color) {
    const text = this.add
      .text(x, y, message, {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: color,
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }
}
