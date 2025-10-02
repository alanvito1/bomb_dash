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
import SoundManager from '../utils/sound.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.transitioning = false;
    this.currentTarget = null;

    // Stats padrão do jogador, incluindo os novos para o V1 HUD
    this.DEFAULT_STATS = {
      hp: 300,
      maxHp: 300,
      mana: 100,
      maxMana: 100,
      damage: 1,
      speed: 200,
      extraLives: 1,
      fireRate: 600,
      bombSize: 1,
      multiShot: 0,
      coins: 0,
    };

    this.gameSettings = {
      monsterScaleFactor: 7, // Default value
    };
  }

  preload() {
    this.load.json('assetManifest', 'src/config/asset-manifest.json');
  }

  create() {
    this.load.on('complete', () => {
      this.initializeScene();
    });
    this.load.start();
  }

  async initializeScene() {
    try {
      const serverSettings = await api.getGameSettings();
      if (serverSettings.success) {
        this.gameSettings = serverSettings.settings;
      }
    } catch (error) {
      console.warn('[GameScene] Could not fetch game settings. Using defaults.', error);
    }

    SoundManager.stop(this, 'menu_music');

    // Inicialização do estado do jogo
    this.level = 1;
    this.waveStarted = false;
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
    this.score = 0;
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.activePowerups = {};
    this.coinsEarned = 0;
    this.baseEnemyHp = 1;
    this.baseBossHp = 100;
    this.gamePaused = false;

    // SIF 21.3: Refactored stat initialization for the new HUD
    const loggedInUser = this.registry.get('loggedInUser') || {};
    const selectedHero = this.registry.get('selectedHero') || {};

    // Build the composite player stats object
    this.playerStats = {
        // Core gameplay defaults that are not hero-specific
        ...this.DEFAULT_STATS,

        // Hero-specific combat stats from the selected hero
        hp: selectedHero.max_hp || this.DEFAULT_STATS.maxHp, // Start with full health
        maxHp: selectedHero.max_hp || this.DEFAULT_STATS.maxHp,
        damage: selectedHero.damage || this.DEFAULT_STATS.damage,
        speed: selectedHero.speed || this.DEFAULT_STATS.speed,

        // Hero progression stats
        hero_xp: selectedHero.xp || 0,
        hero_xp_for_next_level: selectedHero.xp_for_next_level || 100,

        // Account-wide progression stats from the logged-in user
        account_xp: loggedInUser.account_xp || 0,
        account_xp_for_next_level: loggedInUser.account_xp_for_next_level || 100,
        bcoin: loggedInUser.bcoin || 0,
    };

    // Clean up registry key
    this.registry.remove('selectedHero');

    // Setup do cenário
    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg1').setOrigin(0.5).setDisplaySize(480, 800);
    this.bombs = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();

    // SIF 21.3: Launch the HUD Scene
    this.scene.launch('HUDScene');

    // SIF 21.3: Emit initial data to the HUD after it has been launched.
    // A small delay ensures the HUD scene's create() method has finished and listeners are ready.
    this.time.delayedCall(100, () => {
        this.events.emit('update-health', { health: this.playerStats.hp, maxHealth: this.playerStats.maxHp });
        this.events.emit('update-xp', {
            accountXP: this.playerStats.account_xp,
            accountXPForNextLevel: this.playerStats.account_xp_for_next_level,
            heroXP: this.playerStats.hero_xp,
            heroXPForNextLevel: this.playerStats.hero_xp_for_next_level,
        });
        this.events.emit('update-bcoin', { balance: this.playerStats.bcoin });
    });

    // Busca o status inicial do jogo e inicia o timer de atualização (Placeholder for HUD functionality)
    // this.fetchGameStatus();
    // this.gameStatusTimer = this.time.addEvent({
    //   delay: 30000, // Atualiza a cada 30 segundos
    //   callback: this.fetchGameStatus,
    //   callbackScope: this,
    //   loop: true,
    // });

    // Setup dos Módulos do Jogo
    this.playerController = new PlayerController(this);
    this.player = this.playerController.create();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.powerupLogic = new PowerupLogic(this);
    // SIF 21.3: Pass scene events to CollisionHandler so it can emit HUD updates
    this.collisionHandler = new CollisionHandler(this, this.events, this.powerupLogic);
    this.collisionHandler.register();
    this.enemySpawner = new EnemySpawner(this, this.gameSettings.monsterScaleFactor);

    this.bombTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      loop: true,
      callback: () => { if (this.player?.active) this.fireBomb(); },
    });

    const initialSpawnResult = this.enemySpawner.spawn();
    if (initialSpawnResult === 'GAME_SHOULD_END') {
      this.handleGameOver();
      return;
    }

    createUIButtons(this, this.playerStats);
    SoundManager.playWorldMusic(this, 1);

    // SIF 21.4: Add listener for the ESC key to pause the game
    this.input.keyboard.on('keydown-ESC', this.togglePause, this);

    // SIF 21.4: Handle resume event from PauseScene
    this.events.on('resume', () => {
        this.gamePaused = false;
        this.physics.resume();
        this.bombTimer.paused = false;
    });
  }

  fireBomb() {
    if (this.gamePaused || !this.player || !this.player.active) return;
    const count = 1 + (this.playerStats.multiShot ?? 0);
    const spacing = 15;
    const startX = this.player.x - (spacing * (count - 1)) / 2;
    const bombDisplaySize = 8 * (this.playerStats.bombSize || 1);

    for (let i = 0; i < count; i++) {
      const bomb = this.bombs.create(startX + spacing * i, this.player.y - 20, 'bomb');
      bomb.setDisplaySize(bombDisplaySize, bombDisplaySize).setVelocityY(-300);
    }
    SoundManager.play(this, 'bomb_fire');
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
    // this.hud.updateHUD(); // Old HUD call
    // this.hud.addChatMessage(`Stage ${this.stageCode} begins!`, '#00ffff'); // Old HUD call
    SoundManager.playWorldMusic(this, this.stage);
    SoundManager.play(this, 'wave_start');
  }

  async handleGameOver() {
    if (this.gamePaused || this.transitioning) return;
    this.gamePaused = true;
    this.player?.setActive(false);
    if (this.bombTimer) {
      this.bombTimer.paused = true;
    }
    // this.gameStatusTimer?.destroy(); // Para o timer de atualização do status

    SoundManager.stopAll(this);
    SoundManager.play(this, 'gameover');
    // this.hud.addChatMessage('GAME OVER', '#ff0000'); // Old HUD call

    this.coinsEarned = Math.floor(this.score / 10);

    this.scene.stop('HUDScene'); // Stop the HUD on game over
    this.scene.start('GameOverScene', { score: this.score, level: this.level, coins: this.coinsEarned });
  }

  update() {
    if (this.gamePaused || !this.player?.active) return;

    this.playerController.update(this.cursors, this.playerStats.speed);

    // Old HUD updates are removed
    // this.updateTarget();
    // this.hud.update(this.playerStats);
    // this.hud.updatePowerupDisplay(this.activePowerups);

    // Lógica de transição de fase
    if (this.bossSpawned && !this.bossDefeated && this.enemies.countActive(true) === 0 && !this.transitioning) {
      this.transitioning = true;
      this.bossDefeated = true;
      this.showNextStageDialog();
    }

    // Lógica de dano ao jogador (inimigos que passaram)
    this.enemies.getChildren().forEach(enemy => {
      if (enemy?.active && enemy.y > this.scale.height + 20) {
        enemy.destroy();
        if (this.gamePaused) return;

        const damageTaken = 50; // Dano de exemplo
        this.playerStats.hp -= damageTaken;
        // this.hud.addChatMessage(`Took ${damageTaken} damage!`, '#ff5555'); // Old HUD call

        // SIF 21.3: Emit health update event
        this.events.emit('update-health', { health: this.playerStats.hp, maxHealth: this.playerStats.maxHp });


        if (this.playerStats.hp <= 0) {
          this.playerStats.extraLives--;
          if (this.playerStats.extraLives >= 0) {
            this.playerStats.hp = this.playerStats.maxHp;
            // this.hud.addChatMessage(`Life lost! ${this.playerStats.extraLives} remaining.`, '#ffcc00'); // Old HUD call
            SoundManager.play(this, 'player_hit');
            // SIF 21.3: Emit health update event after restoring HP
            this.events.emit('update-health', { health: this.playerStats.hp, maxHealth: this.playerStats.maxHp });
          } else {
            this.playerStats.hp = 0;
            this.playerStats.extraLives = 0;
            // SIF 21.3: Emit final health update
            this.events.emit('update-health', { health: 0, maxHealth: this.playerStats.maxHp });
            this.handleGameOver();
          }
        } else {
          SoundManager.play(this, 'player_hit');
        }
        // this.hud.updateHUD(); // Old HUD call
      }
    });

    // Lógica de início da próxima onda
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
    // Prevent pausing if the game is already paused, over, or in a transition
    if (this.gamePaused || this.transitioning || !this.player.active) {
        return;
    }

    this.gamePaused = true;
    this.physics.pause();
    this.bombTimer.paused = true;

    // Launch the Pause Scene on top of the current scene
    this.scene.launch('PauseScene');
    // Pause this scene, stopping updates and input
    this.scene.pause();
  }

  // --- Old HUD Methods Removed ---
}