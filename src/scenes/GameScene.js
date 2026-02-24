// 🎮 GameScene.js – Cena principal do jogo (gameplay)
import api from '../api.js';
import CollisionHandler from '../modules/CollisionHandler.js';
import EnemySpawner from '../modules/EnemySpawner.js';
import Bomb from '../modules/Bomb.js';
// ClassicBomb removed for Run & Gun Pivot
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
import MobileControls from '../ui/MobileControls.js';
import { CST } from '../CST.js';

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
    // this.chatWidget = new ChatWidget(this); // Task Force: Disabled Chat
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

    // Task Force: Offline Mock Mode
    let userAccountData = {
        address: '0x0000000000000000000000000000000000000000',
        account_level: 1,
        account_xp: 0,
        coins: 0
    };
    /*
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
    */

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

    // --- TASK FORCE: TRACKING ENGINE INIT ---
    this.sessionTraining = {
        speed: 0,
        fireRate: 0,
        range: 0,
        power: 0
    };

    // --- TASK FORCE: STAT CALCULATION ---
    // Use the central service logic to ensure 0.01% rule is applied consistently
    const calculatedStats = playerStateService.getHeroStats(selectedHero.id);

    this.playerStats = {
      ...this.DEFAULT_STATS,
      ...selectedHero,
      // Overwrite with Calculated Effective Stats
      damage: calculatedStats ? calculatedStats.damage : 10,
      speed: calculatedStats ? calculatedStats.speed : 200,
      maxHp: calculatedStats ? calculatedStats.hp : 1000,
      hp: calculatedStats ? calculatedStats.hp : 1000,
      bombRange: calculatedStats ? calculatedStats.range : 1,
      fireRate: calculatedStats ? calculatedStats.fireRate : 600,

      // Meta Data
      hero_xp: selectedHero.xp || 0,
      hero_xp_for_next_level: 100,
      address: userAccountData.address,
      account_level: userAccountData.account_level,
      account_xp: userAccountData.account_xp,
      bcoin: userAccountData.coins,
    };

    // Explicitly set Bomb Num from NFT (not calculated in service yet?)
    this.playerStats.bombNum = selectedHero.stats.bomb_num || 1;

    // Snapshot Initial State for Post-Match Report ("Dopamine Report")
    this.initialState = {
        accountLevel: userAccountData.account_level,
        accountXp: userAccountData.account_xp,
        heroStats: calculatedStats ? JSON.parse(JSON.stringify(calculatedStats)) : null
    };

    // Task Force: Spell Interpreter
    this.playerStats.spells = selectedHero.spells || [];
    if (this.playerStats.spells.includes('multishot')) {
        this.playerStats.multiShot = 2; // Fires 3 projectiles (1 + 2)
        console.log('[Spell Interpreter] Multishot Activated');
    }

    // UI Feedback for Global Buff
    const accountLevel = playerStateService.getAccountLevel();
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

    // TASK FORCE: FORCE DEBUG OFF
    if (this.physics.world.debugGraphic) {
        this.physics.world.debugGraphic.setVisible(false);
    }
    this.physics.world.drawDebug = false;

    // TASK FORCE: I-Frames
    this.player.isInvulnerable = false;

    this.cursors = this.input.keyboard.createCursorKeys();

    if (this.gameMode === 'ranked') {
      this.initializePvpMatch();
    } else {
      this.initializePveMatch();
    }

    createUIButtons(this, this.playerStats);
    SoundManager.playWorldMusic(this, 1);
    this.input.keyboard.on('keydown-ESC', this.togglePause, this);

    // TASK FORCE: MANUAL FIRE (Spacebar)
    this.input.keyboard.on('keydown-SPACE', () => {
        if (this.player?.active && this.playerState === 'CAN_SHOOT' && this.canShoot) {
            this.firePlayerBomb(true);
        }
    });

    // Auto-Fire Toggle State (Legacy/Mobile)
    this.autoFire = false; // Disabled by default for Pivot

    // Manual Fire Listener (Touch/Mouse)
    this.input.on('pointerdown', (pointer) => {
        // Ignore if touching Joystick area (Left Half) when Joystick is active
        if (this.mobileControls && this.mobileControls.active && pointer.x < this.scale.width / 2) return;

        if (this.player?.active && this.playerState === 'CAN_SHOOT' && this.canShoot) {
            this.firePlayerBomb(true);
        }
    });

    // TASK FORCE: MOBILE CONTROLS
    this.mobileControls = new MobileControls(this);
    this.mobileControls.create();
    this.joystick = this.mobileControls; // Expose for PlayerController

    // Toggle Button
    const mobileBtn = createRetroButton(this, this.scale.width - 100, 50, 160, 40, 'MOBILE CONTROLS', 'neutral', () => {
        const isActive = this.mobileControls.toggle();
        mobileBtn.setText(isActive ? 'HIDE CONTROLS' : 'MOBILE CONTROLS');
    });
    mobileBtn.setScrollFactor(0).setDepth(2000);

    this.canShoot = false;
    this.time.delayedCall(500, () => {
      this.canShoot = true;
    });

    this.isInitialized = true;
  }

  generateMap() {
      // Create Groups (or Clear if re-generating)
      if (!this.hardGroup) this.hardGroup = this.physics.add.staticGroup();
      else this.hardGroup.clear(true, true);

      if (!this.softGroup) this.softGroup = this.physics.add.staticGroup();
      else this.softGroup.clear(true, true);

      // Ensure Textures exist (using Generators if needed)
      if (!this.textures.exists('block_hard')) TextureGenerator.createHardBlock(this);
      if (!this.textures.exists('block_soft')) TextureGenerator.createSoftBlock(this);

      // TASK FORCE: ZIGZAG CAVE GENERATION (Defense Shooter Pivot)
      // Grid dimensions: 10x16 (approx 480x800 with 48px tiles)

      const grid = [];
      for(let y=0; y<this.GRID_H; y++) {
          grid[y] = [];
          for(let x=0; x<this.GRID_W; x++) {
              grid[y][x] = 'EMPTY';
          }
      }

      // 1. Initial Noise Fill
      for(let y=0; y<this.GRID_H; y++) {
          for(let x=0; x<this.GRID_W; x++) {
              // Borders (Left, Right, Top) - Hard
              // Bottom is open for Game Over Zone interaction visually, but we might want walls there too?
              // Rule: "Rotas para inimigos descerem".
              if (x === 0 || x === this.GRID_W - 1 || y === 0) {
                  grid[y][x] = 'HARD';
                  continue;
              }

              // Random Scatter
              const roll = Math.random();
              if (roll < 0.2) grid[y][x] = 'HARD';
              else if (roll < 0.5) grid[y][x] = 'SOFT';
          }
      }

      // 2. Carve The Path (The River)
      // Start Top Center
      let carverX = Math.floor(this.GRID_W / 2);
      let carverY = 1;

      const pathWidth = 1; // Radius around center to clear

      while(carverY < this.GRID_H) {
          // Clear area around carver
          for(let dy = -pathWidth; dy <= pathWidth; dy++) {
              for(let dx = -pathWidth; dx <= pathWidth; dx++) {
                  const cx = carverX + dx;
                  const cy = carverY + dy;
                  if (cx > 0 && cx < this.GRID_W - 1 && cy > 0 && cy < this.GRID_H) {
                      grid[cy][cx] = 'EMPTY';
                  }
              }
          }

          // Move Down
          carverY++;

          // Meander Left/Right
          if (Math.random() < 0.5) {
              carverX += (Math.random() < 0.5 ? -1 : 1);
          }

          // Clamp Carver
          carverX = Phaser.Math.Clamp(carverX, 2, this.GRID_W - 3);
      }

      // 3. Clear Player Spawn Zone (Bottom Center)
      const spawnX = Math.floor(this.GRID_W / 2);
      const spawnY = this.GRID_H - 2;
      for(let y=spawnY-1; y<=spawnY+1; y++) {
          for(let x=spawnX-1; x<=spawnX+1; x++) {
              if (x > 0 && x < this.GRID_W - 1 && y > 0 && y < this.GRID_H) {
                  grid[y][x] = 'EMPTY';
              }
          }
      }

      // 4. Instantiate Blocks
      for(let y=0; y<this.GRID_H; y++) {
          for(let x=0; x<this.GRID_W; x++) {
              if (grid[y][x] === 'HARD') this.placeBlock(x, y, true);
              else if (grid[y][x] === 'SOFT') this.placeBlock(x, y, false);
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

      // Defense Shooter Pivot: Hard Blocks are immovable, Soft are destructible
      // No special logic needed here, handled by group physics.

      block.gridX = gridX;
      block.gridY = gridY;
  }

  initializePveMatch() {
    this.world = this.stageConfig ? this.stageConfig.id : 1;

    // --- TASK FORCE: PHYSICS INIT (CRITICAL FIX) ---
    // Initialize Physics Groups FIRST to prevent "undefined" crashes
    this.bombs = this.physics.add.group({
      classType: Bomb,
      runChildUpdate: true,
    });
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();
    this.lootGroup = this.physics.add.group(); // Loot Drop System

    // Enemy Projectiles Group
    this.enemyProjectiles = this.physics.add.group({
        classType: Bomb,
        runChildUpdate: true
    });

    // TASK FORCE: Generate Grid Map
    this.generateMap();

    // TASK FORCE: DEFENSE LINE (GAME OVER ZONE)
    // Invisible zone at the bottom (y = height - 10 approx, or fully below?)
    // "Encostar na base inferior". Let's put it at y = Height - 5.
    this.defenseZone = this.add.zone(this.scale.width / 2, this.scale.height - 10, this.scale.width, 20);
    this.physics.add.existing(this.defenseZone, true); // Static body

    // TASK FORCE: Grid Collisions
    // Player vs Walls
    this.physics.add.collider(this.player, this.hardGroup);
    this.physics.add.collider(this.player, this.softGroup);

    // Enemies vs Walls
    this.physics.add.collider(this.enemies, this.hardGroup);
    this.physics.add.collider(this.enemies, this.softGroup);

    // Enemies vs Defense Zone
    this.physics.add.overlap(this.enemies, this.defenseZone, this.handleEnemyBreach, null, this);

    // Projectile Collisions (Enemy)
    this.physics.add.collider(this.player, this.enemyProjectiles, this.handlePlayerHitByProjectile, null, this);
    this.physics.add.collider(this.hardGroup, this.enemyProjectiles, (wall, bomb) => {
        if (bomb.active) {
            bomb.deactivate();
            this.explosionManager.spawn(bomb.x, bomb.y, 0.5);
        }
    });

    // TASK FORCE: PLAYER PROJECTILE COLLISIONS (Run & Gun)
    // 1. Vs Walls (Explode)
    this.physics.add.collider(this.bombs, this.hardGroup, (bomb, wall) => {
        if (bomb.active) {
            bomb.deactivate();
            this.explosionManager.spawn(bomb.x, bomb.y, 1.0);
            SoundManager.play(this, 'explosion');
        }
    });

    // 2. Vs Soft Blocks (Destroy + Loot)
    this.physics.add.collider(this.bombs, this.softGroup, (bomb, crate) => {
        if (bomb.active) {
            bomb.deactivate();
            this.explosionManager.spawn(crate.x, crate.y, 1.0);
            crate.destroy();

            // Loot Chance (30%)
            if (Math.random() < 0.3) this.trySpawnLoot(crate.x, crate.y);

            SoundManager.play(this, 'explosion');
        }
    });

    // Loot Collection (Physical Overlap)
    this.physics.add.overlap(this.player, this.lootGroup, this.handleLootPickup, null, this);

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

    // TASK FORCE: BOSS WAVES Logic (10, 20, 30)
    // If maxWaves is custom (e.g. 5), we respect that too.
    this.isBossLevel = (wave % 10 === 0) || (wave === this.maxWaves);

    // Clear previous projectiles/minions just in case
    if (this.enemyProjectiles) this.enemyProjectiles.clear(true, true);

    // Update HUD
    this.events.emit('update-wave', {
      world: this.world,
      phase: this.currentWave,
      isBoss: this.isBossLevel,
    });

    console.log(
      `[GameScene] Starting Wave ${wave}/${this.maxWaves} (Quota: ${this.waveQuota}) [isBoss: ${this.isBossLevel}]`
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
    // This is called when quota is met (Waves 1-29) OR when Boss defeated (via CollisionHandler or updatePve logic)

    // Clear existing projectiles
    if (this.enemyProjectiles) this.enemyProjectiles.clear(true, true);
    // Clear remaining minions
    if (this.enemies) this.enemies.clear(true, true);

    if (this.currentWave >= this.maxWaves) {
      // Victory!
      this.handleVictory();
      return;
    }

    // Advance Wave
    this.currentWave++;
    this.bossSpawned = false; // Reset for next boss
    this.bossDefeated = false;

    // Resume Game State
    this.physics.resume();
    if (this.bombTimer) this.bombTimer.paused = false;
    this.setPlayerState('CAN_SHOOT', 'Next Stage');

    // TASK FORCE: MAP REGENERATION (New Stage Layout)
    this.generateMap();

    // Reset Player to Spawn Position (Safety)
    if (this.player && this.player.active) {
        this.player.setPosition(this.scale.width / 2, this.scale.height * 0.85);
        this.player.setVelocity(0, 0);
    }

    // Show "Stage Clear" text briefly
    const clearText = this.add.text(this.scale.width/2, this.scale.height/2, `STAGE ${this.currentWave-1} CLEARED`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        color: '#00ff00',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(2000);

    this.tweens.add({
        targets: clearText,
        y: this.scale.height/2 - 50,
        alpha: 0,
        duration: 2000,
        onComplete: () => clearText.destroy()
    });

    this.time.delayedCall(1000, () => {
        this.startWave(this.currentWave);
    });
  }

  handleEnemyBreach(enemy, zone) {
      if (!enemy.active || this.godMode || this.transitioning) return;

      console.log('[DEFENSE BREACH] Enemy reached the base!');

      // Visual Feedback (Red Flash)
      this.cameras.main.flash(500, 255, 0, 0);
      SoundManager.play(this, 'player_hit'); // Or a loud alarm?

      // Instant Game Over
      this.handleGameOver(false);
  }

  handlePlayerHitByProjectile(player, bomb) {
      if (!bomb.active || !player.active || this.godMode) return;

      // TASK FORCE: I-Frame Check
      if (player.isInvulnerable) return;

      bomb.deactivate();
      this.explosionManager.spawn(player.x, player.y, 0.5, 2.0); // High Intensity Shake on Player Hit

      // Damage Calculation (e.g., 10% HP or 1 Heart)
      const damage = Math.max(100, this.playerStats.maxHp * 0.1);
      this.playerStats.hp -= damage;

      this.events.emit('update-health', {
          health: this.playerStats.hp,
          maxHealth: this.playerStats.maxHp
      });

      SoundManager.play(this, 'player_hit');

      if (this.playerStats.hp <= 0) {
          // Extra Lives Logic
          this.playerStats.extraLives--;
          if (this.playerStats.extraLives >= 0) {
              this.playerStats.hp = this.playerStats.maxHp;
              // Flash Player & I-Frames
              this.triggerInvulnerability(2000);
          } else {
              this.handleGameOver();
          }
      } else {
           // Trigger I-Frames
           this.triggerInvulnerability(1500);
      }
  }

  triggerInvulnerability(duration = 1500) {
      if (!this.player || !this.player.active) return;

      this.player.isInvulnerable = true;
      this.player.setTint(0xff0000); // Red Tint for impact

      // Strobe Effect
      this.tweens.add({
          targets: this.player,
          alpha: 0.2,
          duration: 100,
          yoyo: true,
          repeat: -1
      });

      // Clear Tint quickly
      this.time.delayedCall(200, () => {
          if (this.player && this.player.active) {
              this.player.clearTint();
          }
      });

      // End I-Frames
      this.time.delayedCall(duration, () => {
          if (this.player && this.player.active) {
              this.player.isInvulnerable = false;
              this.player.alpha = 1;
              this.tweens.killTweensOf(this.player);
          }
      });
  }

  enemyShoot(enemy) {
      if (!this.player || !this.player.active || !this.enemyProjectiles) return;
      if (this.gamePaused) return;

      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const speed = 200;

      const bomb = this.enemyProjectiles.get(enemy.x, enemy.y);
      if (bomb) {
          bomb.fire(enemy.x, enemy.y, Math.cos(angle) * speed, Math.sin(angle) * speed, 0.5, true);
          bomb.setTint(0xff00ff); // Purple Projectile
          SoundManager.play(this, 'enemy_shoot');
      }
  }

  updatePve(time, delta) {
    // 1. Snapshot for Replay/Debugging
    if (this.enemies && this.enemies.getChildren().length > 0) {
      // Optimization: Only push every 10 frames?
      // Keeping as is for now to avoid breaking existing logic logic, but added time/delta check
    }

    const enemiesToProcess = this.enemies.getChildren().slice();
    enemiesToProcess.forEach((enemy) => {
      // TASK FORCE: BOSS LOGIC UPDATE
      if (enemy.update) {
          enemy.update(time, delta);
      }

      // TASK FORCE: ENEMY SHOOTING (Wave 8+)
      // Standard mobs gain ranged attack to force player to use cover
      if (this.currentWave >= 8 && !enemy.isBoss && enemy.active) {
          // Chance: 0.1% per frame (~1 shot every 16s per enemy on avg)
          // Adjust probability based on difficulty/wave?
          // Let's keep it simple: 0.001
          if (Math.random() < 0.001) {
              this.enemyShoot(enemy);
          }
      }

      // LEAK PENALTY (Bottom Screen)
      // Now handled by 'defenseZone' overlap, but keep safety cleanup if they teleport past it?
      if (enemy?.active && enemy.y > this.scale.height + 100) {
          enemy.destroy();
      }
    });

    // CHECK BOSS DEFEAT
    if (this.isBossLevel && this.bossSpawned) {
        // Check if boss is still alive
        const boss = this.enemies.getChildren().find(e => e.isBoss);
        if (!boss) {
            // Boss Defeated! (Was destroyed in CollisionHandler or similar)
            // But wait, CollisionHandler calls `enemy.destroy()`?
            // Usually we need to intercept the death.
            // Let's assume CollisionHandler handles damage and destroys if HP <= 0.
            // If so, we detect absence here.

            // Wait, CollisionHandler usually emits an event or handles loot.
            // Let's rely on `bossDefeated` flag being set if we hook into it?
            // Actually, simply checking !boss when bossSpawned is true works.

            this.bossSpawned = false; // Prevents re-entry
            this.bossDefeated = true;
            console.log('[GameScene] BOSS DEFEATED!');
            this.events.emit('hide-boss-health');

            this.prepareNextStage();
        }
    }

    // CHECK WAVE PROGRESS (Non-Boss Waves)
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
      if (this.gamePaused || !this.player || !this.player.active) return;

      // Cooldown Check (Using time)
      const now = this.time.now;
      if (this.lastFireTime && now - this.lastFireTime < this.playerStats.fireRate) return;
      this.lastFireTime = now;

      // BRANCH: PvE (Defense Shooter) vs PvP
      if (isPve) {
          // Direction: playerLastDirection (Vector2) or default UP
          let dir = this.playerLastDirection || new Phaser.Math.Vector2(0, -1);
          if (dir.lengthSq() === 0) dir.set(0, -1);

          const speed = 500; // Fast projectile

          // TASK FORCE: DYNAMIC SCALE (RNG + POW)
          // Scale = Base 1 + (Range * 0.15) + (Damage * 0.002)
          // e.g. R=4, D=50 => 1 + 0.6 + 0.1 = 1.7.
          const rng = this.playerStats.bombRange || 1;
          const pow = this.playerStats.damage || 10;
          const scale = 1.0 + (rng * 0.15) + (pow * 0.002);

          // Multishot Logic
          let count = 1 + (this.playerStats.multiShot || 0);
          if (this.playerStats.spells && this.playerStats.spells.includes('multishot')) {
              count = 3;
          }

          const baseAngle = dir.angle();
          const spread = Phaser.Math.DegToRad(10);
          const startAngle = baseAngle - ((count - 1) * spread) / 2;

          for (let i = 0; i < count; i++) {
              const currentAngle = startAngle + i * spread;
              const vx = Math.cos(currentAngle) * speed;
              const vy = Math.sin(currentAngle) * speed;

              const bomb = this.bombs.get(this.player.x, this.player.y);
              if (bomb) {
                  bomb.fire(this.player.x, this.player.y, vx, vy, scale, false);
                  bomb.setTint(0xffa500); // Orange/Gold
              }
          }

          SoundManager.play(this, 'bomb_fire');

          // TASK FORCE: FIRE RATE XP
          if (this.sessionTraining) {
              this.sessionTraining.fireRate += 1;
          }

      } else {
          // PvP Fallback
          const bombGroup = this.bombs;
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

  // New: Record Damage for XP
  recordDamage(amount) {
      if (this.sessionTraining && amount > 0) {
          this.sessionTraining.power += amount;
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
          SoundManager.play(this, 'level_up');
          this.scene.stop('HUDScene');
          this.scene.start(CST.SCENES.POST_MATCH, {
            isVictory: true,
            heroId: this.playerStats.id,
            initialState: this.initialState,
            sessionTraining: this.sessionTraining, // Likely minimal in PvP
            sessionLoot: { coins: response.rewards ? response.rewards.bcoin || 0 : 0, items: [] },
            xpGained: 1000,
            wave: 0, // PvP
            timeSurvived: 270 - this.matchTime
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
      this.scene.start(CST.SCENES.POST_MATCH, {
        isVictory: false,
        heroId: this.playerStats.id,
        initialState: this.initialState,
        sessionTraining: this.sessionTraining,
        sessionLoot: { coins: 0, items: [] },
        xpGained: 0,
        wave: 0,
        timeSurvived: 270 - this.matchTime
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
    SoundManager.play(this, 'level_up'); // Initial cue, full music in PostMatch

    const xpGain = 50;

    // 1. Update Backend/Service
    // Task Force: Save Training Data FIRST
    if (this.playerStats.id) {
        await playerStateService.applySessionTraining(this.playerStats.id, this.sessionTraining);
    }

    // Add Account XP
    const xpResult = playerStateService.addAccountXp(xpGain);

    // Save Loot/Fragments
    if (this.sessionLoot.items && this.sessionLoot.items.length > 0) {
        playerStateService.addSessionLoot(this.sessionLoot.items);
    }

    // Unlock Stage
    if (this.playerStats.id && this.stageConfig) {
        playerStateService.completeStage(this.playerStats.id, this.stageConfig.id);
    }

    // Report to API
    if (this.playerStats.id) {
        try {
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

    // 2. Transition to Dopamine Report
    this.scene.stop('HUDScene');
    this.scene.start(CST.SCENES.POST_MATCH, {
        isVictory: true,
        heroId: this.playerStats.id,
        initialState: this.initialState,
        sessionTraining: this.sessionTraining,
        sessionLoot: this.sessionLoot,
        xpGained: xpGain,
        wave: 30, // Victory = Max Wave
        timeSurvived: 270 - this.matchTime // Total time
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

    const xpGain = this.score;

    // 1. Update Backend/Service
    // Save Training (Eternal Grind)
    if (this.playerStats.id) {
         await playerStateService.applySessionTraining(this.playerStats.id, this.sessionTraining);
    }

    // Report Defeat
    const heroId = this.playerStats.id;
    if (heroId) {
        try {
            await api.completeMatch(
                heroId,
                xpGain,
                0, // Coins lost on defeat usually? Or kept? Prompt said "Loot Recovered", implying kept on Victory only?
                   // But "The Dopamine Report" step 4 says "Loot Recovered... showing quantity collected".
                   // "Risk Zone" text said "Survive to Keep Loot".
                   // So on Game Over, coins = 0.
                this.sessionBestiary || {},
                {},
                [],
                this.currentWave
            );
        } catch (e) {
            console.warn('Failed to report defeat stats', e);
        }
    }

    // Add XP (Even on defeat?) Yes, user gets score as XP usually.
    // playerStateService.addAccountXp(xpGain); // Logic was missing in old handleGameOver, adding it for consistency?
    // Old code: finalXp = this.score. api.completeMatch passes finalXp.
    // But it didn't call playerStateService.addAccountXp().
    // I should probably add it to sync local state?
    // The prompt says "Summoner Gain... anime a barra enchendo com o XP ganho". So yes.
    playerStateService.addAccountXp(xpGain);

    // 2. Transition to Dopamine Report
    this.scene.stop('HUDScene');
    this.scene.start(CST.SCENES.POST_MATCH, {
        isVictory: false,
        heroId: this.playerStats.id,
        initialState: this.initialState,
        sessionTraining: this.sessionTraining,
        sessionLoot: { coins: 0, items: [] }, // Loot lost on death
        xpGained: xpGain,
        wave: this.currentWave,
        timeSurvived: 270 - this.matchTime
    });
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

    // TASK FORCE: SPEED XP (Manual Training)
    // Calculate distance based on movement since LAST FRAME
    if (this.lastPlayerPos) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lastPlayerPos.x, this.lastPlayerPos.y);

        // Filter tiny jitter (e.g. < 0.1px)
        if (this.sessionTraining && dist > 0.1) {
            this.sessionTraining.speed += dist;
        }
    }
    this.lastPlayerPos = { x: this.player.x, y: this.player.y };

    // Track Last Direction for Multishot
    if (this.cursors.left.isDown) this.lastDirection = 'left';
    else if (this.cursors.right.isDown) this.lastDirection = 'right';
    else if (this.cursors.up.isDown) this.lastDirection = 'up';
    else if (this.cursors.down.isDown) this.lastDirection = 'down';

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

        if (this.damageTextManager) {
            this.damageTextManager.show(player.x, player.y - 40, '+1 BCOIN', 'GOLD');
        }
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

      if (this.damageTextManager) {
          this.damageTextManager.show(player.x, player.y - 40, `+1 ${rarity}`, colorHex);
      }
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

      if (this.damageTextManager) {
          this.damageTextManager.show(player.x, player.y - 40, `+${healAmount} HP`, 'HEAL');
      }
      SoundManager.play(this, 'powerup_collect');
    }
  }
}
