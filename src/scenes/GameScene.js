// 🎮 GameScene.js – Cena principal do jogo (gameplay)
// Contém toda a lógica da partida, HUD, inimigos, player, fases e sons

import CollisionHandler from '../modules/CollisionHandler.js';
import EnemySpawner from '../modules/EnemySpawner.js';
import ExplosionEffect from '../modules/ExplosionEffect.js';
import HUD from '../modules/hud.js';
import { showNextStageDialog as StageDialog } from '../modules/NextStageDialog.js';
import PlayerController, { fireBomb } from '../modules/PlayerController.js';
import PowerupLogic from '../modules/PowerupLogic.js';
import { createUIButtons } from '../modules/UIMenuButtons.js';
import { getUpgrades, saveUpgrades } from '../systems/upgrades.js';
import SoundManager from '../utils/sound.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.transitioning = false;
  }

  preload() {
    SoundManager.loadAll(this);

    this.load.image('player', 'src/assets/player.png');
    this.load.image('bomb', 'src/assets/bomb.png');
    this.load.image('explosion', 'src/assets/explosion.png');
    this.load.image('btn_pause', 'src/assets/btn_pause.png');
    this.load.image('btn_menu', 'src/assets/btn_menu.png');

    for (let i = 1; i <= 10; i++) {
      this.load.image(`enemy${i}`, `src/assets/enemy${i}.png`);
      this.load.image(`boss${i}`, `src/assets/boss${i}.png`);
    }

    for (let i = 1; i <= 10; i++) {
      this.load.image(`powerup${i}`, `src/assets/powerups/powerup${i}.png`);
    }

    for (let i = 1; i <= 5; i++) {
      this.load.image(`bg${i}`, `src/assets/bg${i}.png`);
    }
  }

  create() {
    // 🛑 Parar música do menu ao iniciar o jogo
    SoundManager.stop(this, 'menu_music');

    // 👤 Status do jogador
    const DEFAULT_STATS = {
      damage: 1,
      speed: 200,
      extraLives: 1,
      fireRate: 600,
      bombSize: 1,
      multiShot: 0,
      coins: 0
    };

    // 🔢 Inicialização
    this.level = 1;
    this.enemyHp = 1;
    this.waveStarted = false;
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
    this.score = 0;
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.activePowerUps = {};
    this.coinsEarned = 0;
    this.baseEnemyHp = 1;
    this.baseBossHp = 10;
    this.gamePaused = false;

    const saved = getUpgrades();
    this.playerStats = { ...DEFAULT_STATS, ...(saved || {}) };

    // 🌆 Fundo do mundo
    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg1')
      .setOrigin(0.5)
      .setDisplaySize(480, 800);

    // 💣 Grupos
    this.bombs = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();

    // 🧠 HUD e controle
    this.hud = new HUD(this);
    this.hud.create(this.playerStats);

    this.playerController = new PlayerController(this);
    this.player = this.playerController.create();
    this.cursors = this.input.keyboard.createCursorKeys();

    // 🔥 Timer de disparo
    this.bombTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      loop: true,
      callback: () => {
        fireBomb(this);
        SoundManager.play(this, 'bomb_fire');
      },
    });

    this.powerupLogic = new PowerupLogic(this);
    this.collisionHandler = new CollisionHandler(this, this.hud, this.powerupLogic);
    this.collisionHandler.register();

    this.enemySpawner = new EnemySpawner(this);
    this.enemySpawner.spawn();

    createUIButtons(this, this.playerStats);

    // 🎵 Música do mundo 1
    SoundManager.playWorldMusic(this, 1);
  }

  fireBomb() {
    fireBomb(this);
    SoundManager.play(this, 'bomb_fire');
  }

  showNextStageDialog() {
    StageDialog(this, () => {
      if (this.level >= 25) {
        this.handleGameOver();
        return;
      }

      this.level++;
      this.enemyHp++;
      this.resetWaveState();
      this.enemySpawner.spawn();
      this.physics.resume();
      this.bombTimer.paused = false;
      SoundManager.play(this, 'next_stage');
    });
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

    // 🎶 Atualiza música do mundo
    SoundManager.playWorldMusic(this, this.stage);
    SoundManager.play(this, 'wave_start');
  }

  updatePowerupDisplay() {
    this.hud.updateHUD();
  }

  handleGameOver() {
    const upgrades = getUpgrades();
    upgrades.coins += this.coinsEarned;
    saveUpgrades(upgrades);

    SoundManager.stopAll(this);
    SoundManager.play(this, 'gameover');

    this.scene.start('GameOverScene', {
      score: this.score,
      coinsEarned: this.coinsEarned
    });
  }

  update() {
    if (this.gamePaused || !this.playerStats) return;

    this.playerController.update(this.cursors, this.playerStats.speed);

    if (
      this.bossSpawned &&
      !this.bossDefeated &&
      this.enemies.countActive(true) === 0 &&
      !this.transitioning
    ) {
      this.transitioning = true;
      this.bossDefeated = true;
      this.showNextStageDialog();
    }

    this.enemies.getChildren().forEach(enemy => {
      if (enemy?.active && enemy.y > this.scale.height + 20) {
        this.enemiesKilled++;
        enemy.destroy();

        if (this.playerStats.extraLives > 0) {
          this.playerStats.extraLives--;
          SoundManager.play(this, 'player_hit');
          this.hud.updateHUD();
        } else {
          this.handleGameOver();
        }
      }
    });

    // 🌊 Início nova wave normal (sem boss)
    if (
      this.enemiesSpawned > 0 &&
      this.enemiesKilled >= this.enemiesSpawned &&
      !this.bossSpawned &&
      !this.waveStarted &&
      !this.transitioning
    ) {
      this.waveStarted = true;

      this.time.delayedCall(500, () => {
        this.level++;
        this.enemyHp++;
        this.resetWaveState();
        this.enemySpawner.spawn();
      });
    }

    this.stage = Math.ceil(this.level / 5);
    this.stageCode = `${this.stage}-${((this.level - 1) % 5) + 1}`;
  }
}
