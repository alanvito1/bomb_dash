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

    // TASK FORCE: ROUTING FIX (Stage Config)
    // If no stageConfig passed, fallback to Stage 1 (Default)
    this.stageConfig = data.stageConfig || {
      id: 1,
      name: 'The Cave Entrance',
      difficulty_multiplier: 1.0,
      background_asset: 'bg1',
      enemy_config: {
        wave_count: 30,
        wave_quota: 6,
        mob_a: { id: 'slime_green', asset_key: 'enemy1', base_hp: 10, base_speed: 50 },
        mob_b: { id: 'bat_black', asset_key: 'enemy1', base_hp: 25, base_speed: 70 },
        boss: { id: 'king_slime', asset_key: 'enemy1', base_hp: 1000, base_speed: 40 },
      },
    };

    // TASK FORCE: ROUTING FIX (Hero Data)
    // Priority: 1. Passed in init(data) 2. Registry 3. Fail
    this.initialHeroData = data.hero || this.registry.get('selectedHero');

    this.lastBombSoundTime = 0;

    // Check for God Mode from Service (if set by Admin)
    this.godMode = playerStateService.godMode || false;

    // TASK FORCE: MEMORY LEAK HOTFIX (Play Again Crash)
    // Explicitly nullify physics groups to force recreation in generateMap()
    // This prevents accessing destroyed World references.
    this.hardGroup = null;
    this.softGroup = null;

    // TASK FORCE: ZERO STATE RULE (Cleanup)
    this.scene.stop('PauseScene');
    this.scene.stop('HUDScene');
    if (this.input && this.input.keyboard) this.input.keyboard.resetKeys();
    if (this.physics) this.physics.resume();

    console.log(
      `[GameScene] Initialized with mode: ${this.gameMode}, Match ID: ${
        this.matchId
      }, Stage: ${this.stageConfig.name}`
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

    // Task Force: Load User Data from Service
    const user = playerStateService.getUser();
    const userAccountData = {
        address: user.walletAddress || 'Guest',
        account_level: user.accountLevel || 1,
        account_xp: user.accountXp || 0,
        coins: user.bcoin || 0
    };

    // Task Force: Priority to data passed via init (Routing fix), then Registry
    const selectedHero = this.initialHeroData;

    if (!selectedHero || !selectedHero.id) {
      console.error(
        '[GameScene] CRITICAL: Scene started without a valid selected hero. Aborting.'
      );
      this.scene.start('MenuScene');
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

    // TASK FORCE: SPEED CAP (Level Dependent)
    // Speed = Base 160 + (AccountLevel * 5). Cap at 300.
    // This prevents "Speed 11" runaway.
    const acctLvl = userAccountData.account_level || 1;
    const lockedSpeed = Math.min(300, 160 + (acctLvl * 5));

    this.playerStats = {
      ...this.DEFAULT_STATS,
      ...selectedHero,
      // Overwrite with Calculated Effective Stats (or Fallback to NFT Base)
      damage: calculatedStats ? calculatedStats.damage : (selectedHero.damage || 10),
      speed: lockedSpeed, // Locked Speed
      maxHp: calculatedStats ? calculatedStats.hp : (selectedHero.maxHp || 1000),
      hp: calculatedStats ? calculatedStats.hp : (selectedHero.hp || 1000),
      bombRange: calculatedStats ? calculatedStats.range : (selectedHero.range || 1),
      fireRate: calculatedStats ? calculatedStats.fireRate : (selectedHero.fireRate || 600),

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

    // Task Force: Do not remove selectedHero from registry to allow re-entry
    // this.registry.remove('selectedHero');

    const bgAsset = this.stageConfig
      ? this.stageConfig.background_asset
      : 'bg1';
    this.bg = this.add
      .image(this.scale.width / 2, this.scale.height / 2, bgAsset)
      .setOrigin(0.5)
      .setDisplaySize(480, 800);

    // TASK FORCE: HUD SYNCHRONIZATION (Handshake)
    this.scene.launch('HUDScene');

    const sendInitialData = () => {
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
    };

    // Listen for HUD Ready signal
    GameEventEmitter.once('HUD_READY', sendInitialData);

    // Fallback: If HUD is already running (hot restart), send immediately
    if (this.scene.isActive('HUDScene')) {
        GameEventEmitter.off('HUD_READY', sendInitialData); // Prevent double send
        sendInitialData();
    }

    // --- TASK FORCE: THE HEART OF GAME JUICE ---
    this.damageTextManager = new DamageTextManager(this);
    this.explosionManager = new ExplosionManager(this);
    this.neonBurst = new NeonBurstManager(this);

    this.playerController = new PlayerController(this);
    this.player = this.playerController.create();

    // TASK FORCE: FORCE SPAWN POSITION (Safe Zone)
    // Overwrite PlayerController's default
    const px = 2;
    const py = this.GRID_H - 3;
    this.player.setPosition((px + 0.5) * this.TILE_SIZE, (py + 0.5) * this.TILE_SIZE);

    // 1. O Efeito Bloom (Hero) - Subtle
    if (this.player.preFX) {
      const bloom = this.player.preFX.addBloom(0xffffff, 1, 1, 1.2, 1.2);
    }

    // TASK FORCE: FORCE DEBUG OFF
    if (this.physics.world.debugGraphic) {
        this.physics.world.debugGraphic.setVisible(false);
        this.physics.world.debugGraphic.clear(); // Clear any existing lines
    }
    this.physics.world.drawDebug = false;

    // Force check in a few frames to ensure it stays off
    this.time.delayedCall(500, () => {
        if (this.physics.world.debugGraphic) {
            this.physics.world.debugGraphic.setVisible(false);
            this.physics.world.drawDebug = false;
        }
    });

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

    // TASK FORCE: AUTO-ATTACK MONETIZATION
    this.autoFirePurchased = false;
    this.autoFire = false;

    const autoBtn = createRetroButton(this, this.scale.width - 100, 100, 160, 40, 'AUTO: OFF', 'neutral', async () => {
        if (!this.autoFirePurchased) {
            const result = await playerStateService.purchaseAutoFire();
            if (result.success) {
                this.autoFirePurchased = true;
                this.autoFire = true;
                autoBtn.setText('AUTO: ON');
                // Visual feedback
                if (this.damageTextManager) this.damageTextManager.show(autoBtn.x, autoBtn.y + 40, '-1 BCOIN', 'GOLD');
            } else {
                if (this.damageTextManager) this.damageTextManager.show(autoBtn.x, autoBtn.y + 40, 'NEED 1 BCOIN', 'CRIT');
            }
        } else {
            this.autoFire = !this.autoFire;
            autoBtn.setText(this.autoFire ? 'AUTO: ON' : 'AUTO: PAUSED');
        }
    });
    autoBtn.setScrollFactor(0).setDepth(2000);

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
      if (!this.textures.exists('hard_block')) TextureGenerator.createHardBlock(this);
      if (!this.textures.exists('soft_block')) TextureGenerator.createSoftBlock(this);

      // TASK FORCE: CONNECTABLE MAZE (Guaranteed Explorability)
      const width = this.GRID_W;
      const height = this.GRID_H;
      // TASK FORCE: SPAWN LOGIC FIX (Move to safe inner zone)
      const px = 2;
      const py = height - 3; // (2, 13) - Safe from borders
      const ex = Math.floor(width / 2);
      const ey = 1; // Top-Center Enemy Spawn

      // 1. Initial Hard Block Placement (Random + Borders)
      const hardBlocks = new Set();

      for(let y=0; y<height; y++) {
          for(let x=0; x<width; x++) {
              const key = `${x},${y}`;

              // Borders
              if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                  hardBlocks.add(key);
                  continue;
              }

              // Safe Zones (Player & Enemy)
              // TASK FORCE: SPAWN CROSS (3x3 Exclusion)
              const isPlayerZone = (Math.abs(x - px) <= 1 && Math.abs(y - py) <= 1);
              const isEnemyZone = (Math.abs(x - ex) <= 1 && Math.abs(y - ey) <= 1);

              if (isPlayerZone || isEnemyZone) continue;

              // Random Hard Blocks (25% for structure)
              if (Math.random() < 0.25) {
                  hardBlocks.add(key);
              }
          }
      }

      // TASK FORCE: FORCE CLEAR SPAWN AREA (Zero Tolerance)
      // Remove any accidental hard blocks in 3x3 radius
      for(let y=py-1; y<=py+1; y++) {
          for(let x=px-1; x<=px+1; x++) {
              hardBlocks.delete(`${x},${y}`);
          }
      }

      // 2. Connectivity Check (Flood Fill)
      // Goal: Ensure ALL non-hard blocks are reachable from Player Spawn.
      // If not, remove blocking Hard Blocks until they are.

      const getReachable = () => {
          const visited = new Set();
          const queue = [{x: px, y: py}];
          visited.add(`${px},${py}`);

          while(queue.length > 0) {
              const {x, y} = queue.shift();
              const dirs = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];

              for(const d of dirs) {
                  const nx = x + d.x;
                  const ny = y + d.y;
                  const key = `${nx},${ny}`;

                  // Check bounds
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                      if (!visited.has(key) && !hardBlocks.has(key)) {
                          visited.add(key);
                          queue.push({x: nx, y: ny});
                      }
                  }
              }
          }
          return visited;
      };

      let reachable = getReachable();
      // Calculate total expected reachable cells (Total Grid - Hard Blocks)
      let attempts = 0;

      // While we haven't reached all non-hard blocks...
      while (reachable.size < (width * height - hardBlocks.size) && attempts < 1000) {
          attempts++;

          // Find Hard Blocks that separate Visited from Unvisited
          const candidates = [];

          // Iterate all Hard Blocks (skipping borders)
          for(let y=1; y<height-1; y++) {
              for(let x=1; x<width-1; x++) {
                  const key = `${x},${y}`;
                  if (hardBlocks.has(key)) {
                      const dirs = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];
                      let isAdjacentToVisited = false;
                      let isAdjacentToUnvisited = false;

                      for(const d of dirs) {
                          const nx = x + d.x;
                          const ny = y + d.y;
                          const nKey = `${nx},${ny}`;

                          if (reachable.has(nKey)) isAdjacentToVisited = true;
                          else if (!hardBlocks.has(nKey)) isAdjacentToUnvisited = true; // Not Hard = Soft/Empty = Unvisited (since not in reachable)
                      }

                      if (isAdjacentToVisited && isAdjacentToUnvisited) {
                          candidates.push(key);
                      }
                  }
              }
          }

          if (candidates.length > 0) {
              // Remove a random candidate to open a path
              const toRemove = candidates[Math.floor(Math.random() * candidates.length)];
              hardBlocks.delete(toRemove);

              // Re-evaluate reachability
              reachable = getReachable();
          } else {
              // No candidates? Should be impossible if unvisited nodes exist.
              // Break to prevent infinite loop.
              break;
          }
      }

      // 3. Instantiate
      for(let y=0; y<height; y++) {
          for(let x=0; x<width; x++) {
              const key = `${x},${y}`;
              if (hardBlocks.has(key)) {
                  this.placeBlock(x, y, true);
              } else {
                  // Spawn Zone Checks (Prevent Soft Blocks on top of player/enemy)
                  const isPlayerZone = (Math.abs(x - px) <= 1 && Math.abs(y - py) <= 1);
                  const isEnemyZone = (Math.abs(x - ex) <= 1 && Math.abs(y - ey) <= 1);

                  if (!isPlayerZone && !isEnemyZone) {
                      this.placeBlock(x, y, false);
                  }
              }
          }
      }
  }

  placeBlock(gridX, gridY, isHard) {
      const x = gridX * this.TILE_SIZE + this.TILE_SIZE / 2;
      const y = gridY * this.TILE_SIZE + this.TILE_SIZE / 2;

      const texture = isHard ? 'hard_block' : 'soft_block';
      const group = isHard ? this.hardGroup : this.softGroup;

      const block = group.create(x, y, texture);
      block.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
      block.refreshBody(); // Update static body

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

            // Task Force: Block HP Logic
            if (crate.hp === undefined) crate.hp = 1;
            crate.hp--;

            if (crate.hp <= 0) {
                // TASK FORCE: Fix Movement - Disable body before destroying to ensure space is cleared
                if (crate.body) crate.disableBody(true, true);
                crate.destroy();
                // Loot Chance (30%)
                if (Math.random() < 0.3) this.trySpawnLoot(crate.x, crate.y);
            } else {
                // Flash on hit
                crate.setTint(0xffffff);
                this.time.delayedCall(100, () => {
                    if (crate.active) crate.clearTint();
                });
            }

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
          // Task Force: Auto-Aim Logic
          // Find nearest enemy
          let nearest = null;
          let minDist = Infinity;
          this.enemies.getChildren().forEach(enemy => {
              if (enemy.active) {
                  const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                  if (d < minDist) {
                      minDist = d;
                      nearest = enemy;
                  }
              }
          });

          if (nearest) {
              const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y);
              // Update direction vector
              if (!this.playerLastDirection) this.playerLastDirection = new Phaser.Math.Vector2();
              this.playerLastDirection.set(Math.cos(angle), Math.sin(angle));
          }

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

    // Reset Player to Spawn Position (Safe Zone)
    if (this.player && this.player.active) {
        // (2, 13) => Grid coords. World coords = (2+0.5)*TILE, (13+0.5)*TILE
        const px = 2;
        const py = this.GRID_H - 3;
        this.player.setPosition((px + 0.5) * this.TILE_SIZE, (py + 0.5) * this.TILE_SIZE);
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

      // No Game Over anymore. Just logging or visual warning?
      // Maybe enemies disappear if they enter the zone?
      // Or just ignore.
      // Let's just log it for now to confirm behavior.
      // console.log('[DEFENSE BREACH] Enemy reached the base! (No Penalty)');
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

    // Task Force: Apply Match XP first, THEN Penalty
    playerStateService.addAccountXp(xpGain);

    // Task Force: Death Penalty (Point 4 Hookup)
    if (!isVictory) {
        playerStateService.applyDeathPenalty(this.playerStats.id);
    }

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

    // TASK FORCE: SPEED XP (Manual Training) - DISABLED
    // Speed is now locked to Account Level.
    /*
    if (this.lastPlayerPos) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lastPlayerPos.x, this.lastPlayerPos.y);

        if (this.sessionTraining && dist > 0.1) {
            this.sessionTraining.speed += dist;
        }
    }
    this.lastPlayerPos = { x: this.player.x, y: this.player.y };
    */

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
    this.pauseManager.pause('UserKey');
  }

  toggleAutoFire() {
    this.autoFire = !this.autoFire;
    return this.autoFire;
  }

  trySpawnLoot(x, y) {
    // Task Force: Level 1-7 Starter Blocks drop NOTHING.
    if (this.playerStats.account_level < 8) {
        return;
    }

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
