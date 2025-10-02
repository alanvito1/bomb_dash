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

// Helper functions for localStorage (similar to ShopScene)
function getPlayerStatsFromLocalStorage() {
  const stats = localStorage.getItem('playerStats');
  return stats ? JSON.parse(stats) : null;
}

function savePlayerStatsToLocalStorage(stats) {
  localStorage.setItem('playerStats', JSON.stringify(stats));
}

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.transitioning = false;

    // Definir DEFAULT_STATS como uma propriedade da instância para ser acessível por PowerupLogic via this.scene.DEFAULT_STATS
    this.DEFAULT_STATS = {
      damage: 1,
      speed: 200,
      extraLives: 1,
      fireRate: 600,
      bombSize: 1, // Tamanho base da bomba (multiplicador)
      multiShot: 0, // Níveis de multi-shot (0 = 1 projétil, 1 = 2 projéteis, etc.)
      coins: 0
      // originalBombSizeForDebuff será adicionado a playerStats dinamicamente
    };

    // Default game settings, to be overridden by server values
    this.gameSettings = {
      monsterScaleFactor: 7, // Default value
    };
  }

  preload() {
    // Carrega todos os assets (imagens e sons) a partir do manifesto.
    this.load.json('assetManifest', 'src/config/asset-manifest.json');
  }

  loadAssetsFromManifest() {
    const manifest = this.cache.json.get('assetManifest');

    // Carregar imagens, sons, etc. (código existente omitido por brevidade)
    // ...
  }

  create() {
    // Após o preload do manifesto, carregamos os assets listados nele.
    // this.loadAssetsFromManifest(); // This logic is now inside preload/create of LoadingScene

    // O evento 'complete' é disparado quando o Loader termina de processar todos os arquivos.
    this.load.on('complete', () => {
      this.initializeScene();
    });

    // Inicia o processo de carregamento manualmente, pois estamos fora do ciclo de vida do `preload`.
    this.load.start();
  }

  async initializeScene() {
    try {
        const serverSettings = await api.getGameSettings();
        if (serverSettings.success) {
            this.gameSettings = serverSettings.settings;
            console.log('[GameScene] Game settings loaded from server:', this.gameSettings);
        }
    } catch (error) {
        console.warn('[GameScene] Could not fetch game settings from server. Using default values.', error);
    }

    SoundManager.stop(this, 'menu_music');

    // Inicialização de variáveis de estado do jogo
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

    // Inicialização de stats do jogador
    const localStats = getPlayerStatsFromLocalStorage();
    const selectedCharacterStats = this.registry.get('selectedCharacterStats');

    // Combina os stats: Padrão -> Stats Locais (Loja) -> Stats do Personagem Selecionado
    this.playerStats = {
      ...this.DEFAULT_STATS,
      ...(localStats || {}),
      ...(selectedCharacterStats || {})
    };

    // Garante que os dados do servidor (como moedas) tenham precedência final
    const loggedInUser = this.registry.get('loggedInUser');
    if (loggedInUser && typeof loggedInUser.coins === 'number') {
      this.playerStats.coins = loggedInUser.coins;
    }

    // Limpa os stats do personagem do registro para não serem reutilizados na próxima partida
    this.registry.remove('selectedCharacterStats');

    // Inicializa variáveis para anti-buffs
    this.enemySpawnMultiplier = 1;
    this.enemySpawnMultiplierActive = false;
    this.enemySpawnSpeedActive = false;
    this.increaseEnemySpeedActive = false;
    this.playerStats.originalBombSizeForDebuff = this.playerStats.bombSize;
    this.bombSizeDebuffActive = false;


    this.bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'bg1')
      .setOrigin(0.5)
      .setDisplaySize(480, 800);

    this.bombs = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();

    this.hud = new HUD(this);
    this.hud.create(this.playerStats);

    this.playerController = new PlayerController(this);
    this.player = this.playerController.create();
    this.cursors = this.input.keyboard.createCursorKeys();

    this.bombTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      loop: true,
      callback: () => {
        if (this.player?.active) {
            this.fireBomb();
        }
      },
    });

    this.powerupLogic = new PowerupLogic(this);
    this.collisionHandler = new CollisionHandler(this, this.hud, this.powerupLogic);
    this.collisionHandler.register();

    // 1.3: Pass the monsterScaleFactor to the EnemySpawner
    this.enemySpawner = new EnemySpawner(this, this.gameSettings.monsterScaleFactor);

    if (this.enemySpawner && typeof this.enemySpawner.getSpawnInterval === 'function') {
        this.originalEnemySpawnInterval = this.enemySpawner.getSpawnInterval();
    } else {
        this.originalEnemySpawnInterval = 800;
        console.warn("[GameScene] EnemySpawner ou getSpawnInterval() não disponível.");
    }


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

    const currentBombSizeFactor = this.playerStats.bombSize || this.DEFAULT_STATS.bombSize;
    const bombDisplaySize = 8 * currentBombSizeFactor;

    for (let i = 0; i < count; i++) {
      const bomb = this.bombs.create(startX + spacing * i, this.player.y - 20, 'bomb');
      bomb.setDisplaySize(bombDisplaySize, bombDisplaySize);
      bomb.setVelocityY(-300);
    }
    SoundManager.play(this, 'bomb_fire');
  }

  showNextStageDialog() {
    StageDialog(this, () => {
      this.level++;
      this.resetWaveState();
      const spawnResult = this.enemySpawner.spawn();
      if (spawnResult === 'GAME_SHOULD_END') {
        this.handleGameOver();
        return;
      }
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
    SoundManager.playWorldMusic(this, this.stage);
    SoundManager.play(this, 'wave_start');
  }

  updatePowerupDisplay() {
    this.hud.updateHUD();
  }

  async handleGameOver() {
    if (this.gamePaused || this.transitioning) {
      return;
    }
    this.gamePaused = true;
    if (this.player) {
        this.player.setActive(false);
    }
    if (this.bombTimer) {
        this.bombTimer.paused = true;
    }

    SoundManager.stopAll(this);
    SoundManager.play(this, 'gameover');

    this.coinsEarned = Math.floor(this.score / 10);

    let playerStats = getPlayerStatsFromLocalStorage();
    if (playerStats) {
      playerStats.coins = (playerStats.coins || 0) + this.coinsEarned;
      savePlayerStatsToLocalStorage(playerStats);
    } else {
      savePlayerStatsToLocalStorage({ coins: this.coinsEarned });
    }

    let finalScore = this.score;
    const MAX_ALLOWED_SCORE = 1000000;
    const MAX_REASONABLE_LIVES = 10;
    let cheatDetected = false;
    if (this.score > MAX_ALLOWED_SCORE) {
        finalScore = 0;
        cheatDetected = true;
    }
    if (this.playerStats && this.playerStats.extraLives > MAX_REASONABLE_LIVES) {
        finalScore = 0;
        cheatDetected = true;
    }
    if (cheatDetected) {
        console.warn('Anti-Cheat: Potential cheat detected. Score will be penalized.');
    }

    const loggedInUser = this.registry.get('loggedInUser');
    let serverResponse = null;

    if (loggedInUser && !cheatDetected) {
      try {
        // Save checkpoint (highest wave)
        serverResponse = await api.saveCheckpoint(this.level);
        console.log('Checkpoint saved successfully to server.', serverResponse);

        // Save all player stats (including upgrades and new coin total)
        await api.savePlayerStats(this.playerStats);
        console.log('Player stats saved successfully to server.');

      } catch (error) {
        console.warn('Failed to save game progress to server:', error.message);
      }
    } else if (cheatDetected) {
        console.log(`GameScene: Cheat detected, score for ${loggedInUser ? loggedInUser.address : 'unknown user'} not submitted.`);
    } else {
      console.log('User not logged in. Score and stats not submitted to server.');
    }

    this.scene.start('GameOverScene', {
        score: this.score,
        finalScore: loggedInUser ? loggedInUser.max_score : 0,
        coinsEarned: this.coinsEarned,
        cheatDetected: cheatDetected,
        serverMessage: serverResponse ? (serverResponse.message || (serverResponse.success ? "Score updated!" : "Score not updated.")) : "Could not connect to server or user not logged in."
    });
  }

  update() {
    if (this.gamePaused || !this.playerStats || !this.player?.active) return;

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
        enemy.destroy();

        if (this.gamePaused) return;

        this.playerStats.extraLives--;
        if (this.playerStats.extraLives < 0) this.playerStats.extraLives = 0;

        this.hud.updateHUD();

        if (this.playerStats.extraLives === 0) {
          SoundManager.play(this, 'player_hit');
          this.handleGameOver();
        } else {
          SoundManager.play(this, 'player_hit');
        }
      }
    });

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
        this.resetWaveState();
        const spawnResult = this.enemySpawner.spawn();
        if (spawnResult === 'GAME_SHOULD_END') {
           this.handleGameOver();
        }
      });
    }
  }
}
