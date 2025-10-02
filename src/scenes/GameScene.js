// 🎮 GameScene.js – Cena principal do jogo (gameplay)
import api from '../api.js';
import CollisionHandler from '../modules/CollisionHandler.js';
import EnemySpawner from '../modules/EnemySpawner.js';
import ExplosionEffect from '../modules/ExplosionEffect.js';
import HUD from '../modules/hud.js';
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

    // Combina os stats do jogador
    const selectedCharacterStats = this.registry.get('selectedCharacterStats');
    this.playerStats = {
      ...this.DEFAULT_STATS,
      ...(selectedCharacterStats || {}),
    };
    const loggedInUser = this.registry.get('loggedInUser');
    if (loggedInUser && typeof loggedInUser.coins === 'number') {
      this.playerStats.coins = loggedInUser.coins;
    }
    this.registry.remove('selectedCharacterStats');

    // Setup do cenário
    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg1').setOrigin(0.5).setDisplaySize(480, 800);
    this.bombs = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();

    // --- Nova Integração do HUD V1.0 ---
    this.hud = new HUD(this);
    this.hud.create(this.playerStats);
    this.hud.addChatMessage('Welcome! The battle begins.', '#00ff00');

    // Busca o status inicial do jogo e inicia o timer de atualização
    this.fetchGameStatus();
    this.gameStatusTimer = this.time.addEvent({
      delay: 30000, // Atualiza a cada 30 segundos
      callback: this.fetchGameStatus,
      callbackScope: this,
      loop: true,
    });

    // Setup dos Módulos do Jogo
    this.playerController = new PlayerController(this);
    this.player = this.playerController.create();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.powerupLogic = new PowerupLogic(this);
    this.collisionHandler = new CollisionHandler(this, this.hud, this.powerupLogic);
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
    this.hud.updateHUD();
    this.hud.addChatMessage(`Stage ${this.stageCode} begins!`, '#00ffff');
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
    this.gameStatusTimer?.destroy(); // Para o timer de atualização do status

    SoundManager.stopAll(this);
    SoundManager.play(this, 'gameover');
    this.hud.addChatMessage('GAME OVER', '#ff0000');

    this.coinsEarned = Math.floor(this.score / 10);

    this.scene.start('GameOverScene', { score: this.score, level: this.level, coins: this.coinsEarned });
  }

  update() {
    if (this.gamePaused || !this.player?.active) return;

    this.playerController.update(this.cursors, this.playerStats.speed);

    // --- Atualizações do HUD V1.0 ---
    this.updateTarget();
    this.hud.update(this.playerStats);
    this.hud.updatePowerupDisplay(this.activePowerups);

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
        this.hud.addChatMessage(`Took ${damageTaken} damage!`, '#ff5555');

        if (this.playerStats.hp <= 0) {
          this.playerStats.extraLives--;
          if (this.playerStats.extraLives >= 0) {
            this.playerStats.hp = this.playerStats.maxHp;
            this.hud.addChatMessage(`Life lost! ${this.playerStats.extraLives} remaining.`, '#ffcc00');
            SoundManager.play(this, 'player_hit');
          } else {
            this.playerStats.hp = 0;
            this.playerStats.extraLives = 0;
            this.handleGameOver();
          }
        } else {
          SoundManager.play(this, 'player_hit');
        }
        this.hud.updateHUD();
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

  // --- Novos Métodos para o HUD V1.0 ---

  async fetchGameStatus() {
    try {
      const pvpStatus = await api.getPvpStatus();
      this.hud.updatePvpStatus(pvpStatus);
    } catch (error) {
      console.warn('[GameScene] Could not fetch PvP status.', error);
    }
    try {
      const globalBuffs = await api.getGlobalBuffs();
      this.hud.updateGlobalBuffs(globalBuffs);
    } catch (error) {
      console.warn('[GameScene] Could not fetch global buffs.', error);
    }
  }

  updateTarget() {
    let closestEnemy = null;
    let minDistance = Infinity;

    this.enemies.getChildren().forEach(enemy => {
      if (enemy.active) {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        if (distance < minDistance && enemy.y < this.scale.height) {
          minDistance = distance;
          closestEnemy = enemy;
        }
      }
    });

    if (closestEnemy && minDistance < 400) { // Raio de "lock" do alvo
      this.currentTarget = closestEnemy;
      if (!this.currentTarget.name) this.currentTarget.name = "Monster";
      if (!this.currentTarget.maxHp) this.currentTarget.maxHp = this.baseEnemyHp;
    } else {
      this.currentTarget = null;
    }
    this.hud.showTarget(this.currentTarget);
  }
}