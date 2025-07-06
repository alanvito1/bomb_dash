// 🎮 GameScene.js – Cena principal do jogo (gameplay)
import { submitScore, savePlayerStatsToServer } from '../api.js'; // Import savePlayerStatsToServer
import CollisionHandler from '../modules/CollisionHandler.js';
import EnemySpawner from '../modules/EnemySpawner.js';
import ExplosionEffect from '../modules/ExplosionEffect.js';
import HUD from '../modules/hud.js';
import { showNextStageDialog as StageDialog } from '../modules/NextStageDialog.js';
import PlayerController, { fireBomb } from '../modules/PlayerController.js'; // fireBomb import might be unused if class method is preferred
import PowerupLogic from '../modules/PowerupLogic.js';
import { createUIButtons } from '../modules/UIMenuButtons.js';
// import { getUpgrades, saveUpgrades } from '../systems/upgrades.js'; // REMOVIDO
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
  }

  preload() {
    SoundManager.loadAll(this);
    this.load.image('player', 'src/assets/player.png');
    this.load.image('bomb', 'src/assets/bomb.png');
    this.load.image('explosion', 'src/assets/explosion.png');
    this.load.image('btn_pause', 'src/assets/btn_pause.png');
    this.load.image('btn_menu', 'src/assets/btn_menu.png');
    const MAX_ASSET_COUNT = 5;
    for (let i = 1; i <= MAX_ASSET_COUNT; i++) {
      this.load.image(`enemy${i}`, `src/assets/enemy${i}.png`);
      this.load.image(`boss${i}`, `src/assets/boss${i}.png`);
    }
    // Powerup assets de 1 a 10 já são carregados, cobrindo 1-5 para buffs e 6-8 para anti-buffs
    for (let i = 1; i <= 10; i++) {
      this.load.image(`powerup${i}`, `src/assets/powerups/powerup${i}.png`);
    }
    for (let i = 1; i <= MAX_ASSET_COUNT; i++) {
      this.load.image(`bg${i}`, `src/assets/bg${i}.png`);
    }
  }

  create() {
    SoundManager.stop(this, 'menu_music');

    // Inicialização de variáveis de estado do jogo
    this.level = 1;
    // this.enemyHp = 1; // HP do inimigo é agora calculado em _spawnEnemy baseado no nível
    this.waveStarted = false;
    this.enemiesSpawned = 0;
    this.enemiesKilled = 0;
    this.score = 0;
    this.bossDefeated = false;
    this.bossSpawned = false;
    this.activePowerups = {}; // Movido para PowerupLogic, mas a cena pode precisar referenciá-lo ou o PowerupLogic o inicializa na cena.
                              // PowerupLogic constructor agora garante que this.scene.activePowerups exista.
    this.coinsEarned = 0;
    this.baseEnemyHp = 1; // HP base para o primeiro inimigo do nível 1
    this.baseBossHp = 100; // HP base para o primeiro boss
    this.gamePaused = false;

    // Inicialização de stats do jogador e flags de anti-buff
    const localStats = getPlayerStatsFromLocalStorage();
    // Start with defaults, then layer localStats (from shop purchases), then server coins for authoritative coin count.
    this.playerStats = { ...this.DEFAULT_STATS, ...(localStats || {}) };
    console.log('[GameScene] Player stats initialized with DEFAULT_STATS and merged with localStorage stats:', this.playerStats);

    const loggedInUser = this.registry.get('loggedInUser');
    if (loggedInUser && typeof loggedInUser.coins === 'number') { // Check if coins exist and is a number
      console.log('[GameScene] Usuário logado encontrado:', loggedInUser.username, 'Moedas do servidor:', loggedInUser.coins);
      this.playerStats.coins = loggedInUser.coins; // Server coins override local/default coins
      console.log('[GameScene] Player stats coins updated from server:', this.playerStats.coins);
    } else {
      console.log('[GameScene] Nenhum usuário logado ou sem moedas no servidor. Usando moedas dos stats locais/padrão:', this.playerStats.coins);
    }
    // Ensure playerStats always has all DEFAULT_STATS fields, even if localStats was partial or null
    // The spread operator logic above should handle this, but an explicit merge can be added if issues arise.

    // Inicializa variáveis para anti-buffs
    this.enemySpawnMultiplier = 1;
    this.enemySpawnMultiplierActive = false;
    // this.originalEnemySpawnInterval será definido após a criação do enemySpawner
    this.enemySpawnSpeedActive = false;
    this.increaseEnemySpeedActive = false; // Initialize new flag for powerup7
    this.playerStats.originalBombSizeForDebuff = this.playerStats.bombSize; // Salva o tamanho inicial/base
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
        if (this.player?.active) { // Adicionado check se player está ativo
            this.fireBomb(); // fireBomb agora é um método da cena
        }
      },
    });

    this.powerupLogic = new PowerupLogic(this); // PowerupLogic agora pode acessar this.scene.DEFAULT_STATS
    this.collisionHandler = new CollisionHandler(this, this.hud, this.powerupLogic);
    this.collisionHandler.register();

    this.enemySpawner = new EnemySpawner(this);
    // Definir originalEnemySpawnInterval APÓS enemySpawner ser criado
    if (this.enemySpawner && typeof this.enemySpawner.getSpawnInterval === 'function') {
        this.originalEnemySpawnInterval = this.enemySpawner.getSpawnInterval();
    } else {
        this.originalEnemySpawnInterval = 800; // Fallback para o valor base se getSpawnInterval não estiver pronto
        console.warn("[GameScene] EnemySpawner ou getSpawnInterval() não disponível no momento da inicialização de originalEnemySpawnInterval.");
    }


    const initialSpawnResult = this.enemySpawner.spawn();
    if (initialSpawnResult === 'GAME_SHOULD_END') {
      this.handleGameOver();
      return;
    }

    createUIButtons(this, this.playerStats);
    SoundManager.playWorldMusic(this, 1);
  }

  fireBomb() { // Movido para ser um método da cena para consistência
    if (this.gamePaused || !this.player || !this.player.active) return;

    const count = 1 + (this.playerStats.multiShot ?? 0);
    const spacing = 15;
    const startX = this.player.x - (spacing * (count - 1)) / 2;

    // Usa this.playerStats.bombSize que pode ser modificado por power-ups/debuffs
    const currentBombSizeFactor = this.playerStats.bombSize || this.DEFAULT_STATS.bombSize;
    const bombDisplaySize = 8 * currentBombSizeFactor;

    for (let i = 0; i < count; i++) {
      const bomb = this.bombs.create(startX + spacing * i, this.player.y - 20, 'bomb');
      bomb.setDisplaySize(bombDisplaySize, bombDisplaySize);
      bomb.setVelocityY(-300);
    }
    SoundManager.play(this, 'bomb_fire'); // Som de disparo movido para cá
  }

  showNextStageDialog() {
    StageDialog(this, () => {
      this.level++;
      // this.enemyHp++; // HP do inimigo é agora calculado em _spawnEnemy
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
    this.waveStarted = false; // Resetado aqui
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
    // Prevent multiple calls or actions if already game over
    if (this.gamePaused || this.transitioning) {
      // 'transitioning' might be set by next stage dialog, gamePaused is more general for game over
      // If gamePaused is set by this function, this check prevents re-entry.
      // If another path sets transitioning (like next stage), we also want to avoid conflict.
      // A more robust way could be to check if the 'GameOverScene' is already starting/active.
      // For now, this.gamePaused should suffice if set early.
      return;
    }
    this.gamePaused = true; // Stop player input, enemy movement/spawning via update() checks
    if (this.player) {
        this.player.setActive(false); // Make player non-interactive
    }
    if (this.bombTimer) {
        this.bombTimer.paused = true; // Stop bomb firing
    }
    // Stop enemy spawners, etc. EnemySpawner's spawn() method should check this.gamePaused.

    SoundManager.stopAll(this);
    SoundManager.play(this, 'gameover');

    // const upgrades = getUpgrades(); // REMOVIDO
    // upgrades.coins += this.coinsEarned; // REMOVIDO - Moedas serão gerenciadas pelo servidor
    // saveUpgrades(upgrades); // REMOVIDO

    // Calculate coins earned from the current game's score
    this.coinsEarned = Math.floor(this.score / 10);

    // Update total coins in localStorage
    let playerStats = getPlayerStatsFromLocalStorage();
    if (playerStats) {
      playerStats.coins = (playerStats.coins || 0) + this.coinsEarned;
      savePlayerStatsToLocalStorage(playerStats);
      console.log(`[GameScene] Updated coins in localStorage. New total: ${playerStats.coins}`);
    } else {
      // If no stats in localStorage, save current earnings (and default stats if needed)
      // This case might indicate first game or cleared storage.
      // For simplicity, just saving coins earned. ShopScene initializes with defaults if no stats.
      savePlayerStatsToLocalStorage({ coins: this.coinsEarned });
      console.log(`[GameScene] No existing stats in localStorage. Saved current earnings: ${this.coinsEarned}`);
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

    const token = localStorage.getItem('jwtToken') || this.registry.get('jwtToken');
    const loggedInUser = this.registry.get('loggedInUser');
    let serverResponse = null; // For score submission
    let statsSaveResponse = null; // For stats submission

    if (token && loggedInUser && loggedInUser.username && !cheatDetected) {
      // Submit score
      console.log(`Submitting score: ${finalScore} for user: ${loggedInUser.username}`);
      serverResponse = await submitScore(finalScore, token);
      if (serverResponse.success) {
        console.log('Score submitted successfully to server.', serverResponse);
        if (serverResponse.new_max_score !== undefined) {
            loggedInUser.max_score = serverResponse.new_max_score; // Update local registry for immediate use
        }
      } else {
        console.warn('Failed to submit score to server:', serverResponse.message);
      }

      // Save all player stats (including updated coins and any upgrades)
      // this.playerStats should be up-to-date here from GameScene's own logic and ShopScene purchases via localStorage
      console.log(`Saving full player stats for user: ${loggedInUser.username}`, this.playerStats);
      statsSaveResponse = await savePlayerStatsToServer(this.playerStats, token);
      if (statsSaveResponse.success) {
        console.log('Player stats saved successfully to server.', statsSaveResponse);
        // If server modifies/confirms coin total, update registry:
        // For example, if savePlayerStatsToServer returned the confirmed stats object including coins:
        // if (statsSaveResponse.data && typeof statsSaveResponse.data.coins === 'number') {
        //    loggedInUser.coins = statsSaveResponse.data.coins;
        // }
        // For now, we assume this.playerStats.coins is authoritative from client perspective after game
      } else {
        console.warn('Failed to save player stats to server:', statsSaveResponse.message);
      }
      this.registry.set('loggedInUser', { ...loggedInUser }); // Save any updates to registry (e.g. max_score)

    } else if (cheatDetected) {
        console.log(`GameScene: Cheat detected, score and stats for ${loggedInUser ? loggedInUser.username : 'unknown user'} not submitted.`);
    } else {
      console.log('User not logged in or token not found. Score and stats not submitted to server.');
    }

    this.scene.start('GameOverScene', {
        score: this.score,
        finalScore: loggedInUser ? loggedInUser.max_score : 0,
        coinsEarned: this.coinsEarned, // Ainda passa coinsEarned, mesmo que não salvas localmente
        cheatDetected: cheatDetected,
        serverMessage: serverResponse ? (serverResponse.message || (serverResponse.success ? "Score updated!" : "Score not updated.")) : "Could not connect to server or user not logged in."
    });
  }

  update() {
    if (this.gamePaused || !this.playerStats || !this.player?.active) return; // Adicionado !this.player?.active

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
        enemy.destroy(); // Enemy is gone

        if (this.gamePaused) return; // Already game over or paused

        this.playerStats.extraLives--;
        if (this.playerStats.extraLives < 0) this.playerStats.extraLives = 0; // Clamp to 0 for display

        this.hud.updateHUD(); // Update HUD to show new life count

        if (this.playerStats.extraLives === 0) {
          SoundManager.play(this, 'player_hit'); // Sound for losing the last life this way
          this.handleGameOver(); // Trigger game over
        } else {
          SoundManager.play(this, 'player_hit'); // Sound for losing a life but surviving
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
        // this.enemyHp++; // HP do inimigo é agora calculado em _spawnEnemy
        this.resetWaveState();
        const spawnResult = this.enemySpawner.spawn();
        if (spawnResult === 'GAME_SHOULD_END') {
           this.handleGameOver();
        }
      });
    }
    // this.stage = Math.ceil(this.level / 5); // Já calculado em resetWaveState
    // this.stageCode = `${this.stage}-${((this.level - 1) % 5) + 1}`; // Já calculado em resetWaveState
  }
}
