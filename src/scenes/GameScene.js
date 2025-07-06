// 🎮 GameScene.js – Cena principal do jogo (gameplay)
import { submitScore } from '../api.js';
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
    // const saved = getUpgrades(); // REMOVIDO
    this.playerStats = JSON.parse(JSON.stringify(this.DEFAULT_STATS)); // Sempre começa com stats padrão
    console.log('[GameScene] Player stats inicializados com DEFAULT_STATS.');

    const loggedInUser = this.registry.get('loggedInUser');
    if (loggedInUser && loggedInUser.coins) { // Verifica se coins existem no usuário logado
      console.log('[GameScene] Usuário logado encontrado:', loggedInUser.username, 'Moedas:', loggedInUser.coins);
      this.playerStats.coins = loggedInUser.coins; // Carrega moedas do servidor
    } else {
      console.log('[GameScene] Nenhum usuário logado ou sem moedas no servidor, usando DEFAULT_STATS puros para moedas.');
    }

    // Inicializa variáveis para anti-buffs
    this.enemySpawnMultiplier = 1;
    this.enemySpawnMultiplierActive = false;
    // this.originalEnemySpawnInterval será definido após a criação do enemySpawner
    this.enemySpawnSpeedActive = false;
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
    SoundManager.stopAll(this);
    SoundManager.play(this, 'gameover');

    // const upgrades = getUpgrades(); // REMOVIDO
    // upgrades.coins += this.coinsEarned; // REMOVIDO - Moedas serão gerenciadas pelo servidor
    // saveUpgrades(upgrades); // REMOVIDO

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
    let serverResponse = null;

    if (token && loggedInUser && loggedInUser.username && !cheatDetected) {
      console.log(`Submitting score: ${finalScore} for user: ${loggedInUser.username}`);
      serverResponse = await submitScore(finalScore, token);
      if (serverResponse.success) {
        console.log('Score submitted successfully to server.', serverResponse);
        if (serverResponse.new_max_score !== undefined) {
            loggedInUser.max_score = serverResponse.new_max_score;
            this.registry.set('loggedInUser', { ...loggedInUser });
        }
      } else {
        console.warn('Failed to submit score to server:', serverResponse.message);
      }
      // Lógica de submissão de moedas será adicionada aqui quando implementada (Passo 5)
      // Ex: await api.updateUserCoins(this.coinsEarned, token);
      //     loggedInUser.coins = await api.getUserCoins(token); // ou algo similar para atualizar
      //     this.registry.set('loggedInUser', { ...loggedInUser });
    } else if (cheatDetected) {
        console.log(`GameScene: Cheat detected, score for ${loggedInUser ? loggedInUser.username : 'unknown user'} not submitted.`);
    } else {
      console.log('User not logged in or token not found. Score not submitted to server.');
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
        // this.enemiesKilled++; // Não incrementar aqui, pois o inimigo não foi derrotado pelo jogador
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
