import SoundManager from '../utils/sound.js';

// Constantes
const BOSS_INTERVAL = 5;
const MAX_ENEMIES_BASE = 11;
const SPAWN_DELAY_BASE = 800;

export default class EnemySpawner {
  constructor(scene, accountLevel = 1) {
    this.scene = scene;
    this.spawnInterval = SPAWN_DELAY_BASE;
    this.maxEnemiesBase = MAX_ENEMIES_BASE;
    this.accountLevel = accountLevel;
    this.difficultyMultiplier = 1 + (this.accountLevel - 1) * 0.07;

    console.log(`[EnemySpawner] Initialized for Account Level: ${this.accountLevel}. Difficulty Multiplier: ${this.difficultyMultiplier.toFixed(2)}`);

    const manifest = this.scene.cache.json.get('assetManifest');
    if (manifest && manifest.assets) {
      this.enemyKeys = Object.keys(manifest.assets.enemies || {});
      this.bossKeys = Object.keys(manifest.assets.bosses || {});
    } else {
      console.error('[EnemySpawner] Manifesto de assets não encontrado ou inválido.');
      this.enemyKeys = [];
      this.bossKeys = [];
    }
  }

  getSpawnInterval() {
    return this.spawnInterval;
  }

  setSpawnInterval(newInterval) {
    this.spawnInterval = Math.max(50, newInterval);
    console.log(`[EnemySpawner] Spawn interval set to: ${this.spawnInterval}`);
  }

  spawn() {
    if (!this.scene || !this.scene.enemies) {
      console.error('[ENEMY SPAWNER] Cena ou grupo de inimigos inválido');
      return;
    }

    const level = this.scene.level || 1;

    this.scene.enemies.clear(true, true);
    this.scene.bossDefeated = false;
    this.scene.bossSpawned = false;
    this.scene.enemiesSpawned = 0;
    this.scene.enemiesKilled = 0;

    // Lógica de Ondas Infinitas para níveis 21+
    if (level >= 21) {
      const randomEnemyKey = this.enemyKeys[Phaser.Math.Between(0, this.enemyKeys.length - 1)];
      if (!randomEnemyKey) {
        console.error('[EnemySpawner] Nenhuma chave de inimigo encontrada para a onda infinita.');
        return;
      }

      const maxEnemies = this.maxEnemiesBase;
      this._spawnEnemy(randomEnemyKey, level, true); // O 'true' ativa o scaling infinito

      if (maxEnemies > 1) {
        this.scene.enemySpawnTimer = this.scene.time.addEvent({
          delay: this.spawnInterval,
          repeat: maxEnemies - 1,
          callback: () => this._spawnEnemy(randomEnemyKey, level, true)
        });
      }
      console.log(`[ENEMY SPAWNER] Infinite wave ${level} - Spawning ${maxEnemies} ${randomEnemyKey} enemies.`);
      return;
    }

    // Lógica Padrão para níveis 1-20
    const world = Math.min(Math.ceil(level / BOSS_INTERVAL), this.bossKeys.length || 1);
    const stageInWorld = ((level - 1) % BOSS_INTERVAL) + 1;
    this.scene.stageCode = `${world}-${stageInWorld}`;

    if (level % BOSS_INTERVAL === 0) {
      const bossIndex = Math.min(world - 1, this.bossKeys.length - 1);
      const bossKey = this.bossKeys[bossIndex] || this.bossKeys[this.bossKeys.length - 1];

      if (!bossKey) {
        console.error(`[EnemySpawner] Nenhuma chave de chefe encontrada para o mundo ${world}.`);
        return;
      }

      const boss = this.scene.enemies.create(this.scene.scale.width / 2, -50, bossKey);
      boss.setVelocityY(28);
      boss.setDisplaySize(48, 48);
      boss.hp = (this.scene.baseBossHp || 100) + level * 2;
      boss.isBoss = true;
      this.scene.bossSpawned = true;
      this.scene.enemiesSpawned = 1;
      SoundManager.play(this.scene, 'boss_spawn');
      console.log(`[ENEMY SPAWNER] Boss wave ${level} (world ${world}) - Spawned ${bossKey} with HP ${boss.hp}`);
      return;
    }

    const enemyIndex = Math.min(world - 1, this.enemyKeys.length - 1);
    const spriteKey = this.enemyKeys[enemyIndex] || this.enemyKeys[this.enemyKeys.length - 1];

    if (!spriteKey) {
        console.error(`[EnemySpawner] Nenhuma chave de inimigo encontrada para o mundo ${world}.`);
        return;
    }

    // 2.4: Game Balancing - Reduce initial difficulty
    let currentMaxEnemies = this.maxEnemiesBase;
    if (level === 1) {
      currentMaxEnemies = 4; // Further reduced for smoother onboarding (was 5)
    }

    if (this.scene.enemySpawnMultiplierActive) {
      // Apply multiplier to the potentially adjusted base
      currentMaxEnemies = Math.floor(currentMaxEnemies * (this.scene.enemySpawnMultiplier || 1));
    }
    currentMaxEnemies = Math.max(1, currentMaxEnemies);

    // FIX: Set the total number of spawned enemies for the wave upfront
    // This prevents a race condition where the wave advances prematurely if enemies are killed too quickly.
    this.scene.enemiesSpawned = currentMaxEnemies;

    // Schedule the spawning of all enemies
    this.scene.enemySpawnTimer = this.scene.time.addEvent({
      delay: this.spawnInterval,
      repeat: currentMaxEnemies - 1,
      callback: () => this._spawnEnemy(spriteKey, level)
    });
    // Spawn the first one immediately
    this._spawnEnemy(spriteKey, level);

    SoundManager.play(this.scene, 'wave_start');
    console.log(`[ENEMY SPAWNER] Regular wave ${level} (world ${world}) - Spawning up to ${currentMaxEnemies} ${spriteKey} enemies with interval ${this.spawnInterval}ms`);
  }

  _spawnEnemy(spriteKey, level, isInfinite = false) {
    if (!this.scene.enemies || !this.scene.player || !this.scene.player.active) {
      return;
    }

    const enemy = this.scene.enemies.create(
      Phaser.Math.Between(50, this.scene.scale.width - 50),
      -50,
      spriteKey
    );

    // CQ-06: Increase difficulty scaling per wave
    let baseSpeed = (100 + level * 4) * 0.7; // Increased speed scaling
    let enemyHp = (this.scene.baseEnemyHp || 1) + (level - 1); // HP now increases every wave

    // Apply account-level difficulty scaling
    baseSpeed *= this.difficultyMultiplier;
    enemyHp = Math.ceil(enemyHp * this.difficultyMultiplier);

    console.log(`[EnemySpawner] Wave ${level}, Account ${this.accountLevel}: BaseHP=${(this.scene.baseEnemyHp || 1)}, BaseSpeed=${(100 + level * 2) * 0.7}, Multiplier=${this.difficultyMultiplier.toFixed(2)}, FinalHP=${enemyHp}, FinalSpeed=${baseSpeed.toFixed(2)}`);


    // 2.4: Game Balancing - Reduce initial speed
    if (level === 1) {
      baseSpeed *= 0.8; // Reduce speed by 20% for the first wave
    }

    if (isInfinite) {
      const scalingFactor = 1 + 0.07 * (level - 20);
      const baselineHp = (this.scene.baseEnemyHp || 1) + Math.floor((20 - 1) / 2);
      const baselineSpeed = (100 + 20 * 2) * 0.7;

      enemyHp = Math.floor(baselineHp * scalingFactor);
      baseSpeed = baselineSpeed * scalingFactor;
    }

    if (this.scene.increaseEnemySpeedActive) {
      baseSpeed *= 1.5;
    }
    enemy.setVelocityY(baseSpeed);
    enemy.setDisplaySize(32, 32);
    enemy.hp = enemyHp;
    enemy.isBoss = false;
  }

  spawnImmediateWave(count = 10, specificSpriteKey = null) {
    if (!this.scene || !this.scene.enemies || !this.scene.player || !this.scene.player.active) {
      return;
    }
    console.log(`[EnemySpawner] Spawning immediate wave of ${count} enemies.`);

    const level = this.scene.level || 1;
    const world = Math.min(Math.ceil(level / BOSS_INTERVAL), this.enemyKeys.length || 1);

    const enemyIndex = Math.min(world - 1, this.enemyKeys.length - 1);
    const defaultSpriteKey = this.enemyKeys[enemyIndex] || this.enemyKeys[this.enemyKeys.length - 1];
    const enemySpriteKey = specificSpriteKey || defaultSpriteKey;

    if (!enemySpriteKey) {
        console.error(`[EnemySpawner] Nenhuma chave de inimigo padrão encontrada para spawn imediato.`);
        return;
    }

    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        if (!this.scene.player || !this.scene.player.active || this.scene.gamePaused) return;

        const enemy = this.scene.enemies.create(
          Phaser.Math.Between(50, this.scene.scale.width - 50),
          Phaser.Math.Between(-20, -100),
          enemySpriteKey
        );

        enemy.setVelocityY((100 + level * 2) * 0.7);
        enemy.setDisplaySize(32, 32);
        enemy.hp = (this.scene.baseEnemyHp || 1) + Math.floor((level - 1) / 2);
        enemy.isBoss = false;
      });
    }
    SoundManager.play(this.scene, 'boss_spawn');
  }
}
