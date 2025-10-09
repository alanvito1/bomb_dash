import SoundManager from '../utils/sound.js';

const BOSS_PHASE = 7;

export default class EnemySpawner {
  constructor(scene, accountLevel = 1) {
    this.scene = scene;
    this.accountLevel = accountLevel;
    this.difficultyMultiplier = 1 + (this.accountLevel - 1) * 0.07;

    console.log(`[EnemySpawner V2] Initialized for Account Level: ${this.accountLevel}. Difficulty Multiplier: ${this.difficultyMultiplier.toFixed(2)}`);

    const manifest = this.scene.cache.json.get('assetManifest');
    if (manifest && manifest.assets) {
      this.enemyKeys = Object.keys(manifest.assets.enemies || {});
      this.bossKeys = Object.keys(manifest.assets.bosses || {});
    } else {
      console.error('[EnemySpawner V2] Asset manifest not found or invalid.');
      this.enemyKeys = [];
      this.bossKeys = [];
    }
  }

  /**
   * Spawns a wave of enemies based on the current world and phase.
   * @param {number} world - The current world number (e.g., 1, 2, 3).
   * @param {number} phase - The current phase within the world (e.g., 1-7).
   */
  spawnWave(world, phase) {
    if (!this.scene || !this.scene.enemies) {
      console.error('[EnemySpawner V2] Scene or enemies group is invalid.');
      return;
    }

    this.scene.enemies.clear(true, true);
    this.scene.bossDefeated = false;
    this.scene.bossSpawned = false;
    this.scene.enemiesSpawned = 0;
    this.scene.enemiesKilled = 0;

    if (phase === BOSS_PHASE) {
      this._spawnBossWave(world);
    } else {
      this._spawnRegularWave(world, phase);
    }

    SoundManager.play(this.scene, 'wave_start');
  }

  /**
   * Spawns a regular wave of enemies.
   * @private
   */
  _spawnRegularWave(world, phase) {
    const enemySpriteKey = this.enemyKeys[Math.min(world - 1, this.enemyKeys.length - 1)] || this.enemyKeys[0];
    if (!enemySpriteKey) {
        console.error(`[EnemySpawner V2] No enemy sprite key found for world ${world}.`);
        return;
    }

    // --- Difficulty Scaling Logic ---
    const baseCount = 3;
    const enemyCount = baseCount + (world - 1) * 2 + phase;

    const baseHp = 1;
    const enemyHp = Math.ceil((baseHp + (world - 1) * 5 + (phase - 1) * 1) * this.difficultyMultiplier);

    const baseSpeed = 80;
    const enemySpeed = (baseSpeed + (world - 1) * 15 + (phase - 1) * 5) * this.difficultyMultiplier;

    const spawnInterval = Math.max(200, 800 - (world * 50));
    // --------------------------------

    console.log(`[EnemySpawner V2] World ${world}-${phase}: Spawning ${enemyCount} '${enemySpriteKey}' (HP: ${enemyHp}, Speed: ${enemySpeed.toFixed(0)})`);

    this.scene.enemiesSpawned = enemyCount;

    // Spawn all enemies with a delay
    for (let i = 0; i < enemyCount; i++) {
        this.scene.time.delayedCall(i * spawnInterval, () => {
            this._spawnSingleEnemy(enemySpriteKey, enemyHp, enemySpeed);
        });
    }
  }

  /**
   * Spawns a boss wave.
   * @private
   */
  _spawnBossWave(world) {
    const bossSpriteKey = this.bossKeys[Math.min(world - 1, this.bossKeys.length - 1)] || this.bossKeys[0];
     if (!bossSpriteKey) {
        console.error(`[EnemySpawner V2] No boss sprite key found for world ${world}.`);
        return;
    }

    // --- Boss Difficulty Scaling ---
    const baseHp = 100;
    const bossHp = Math.ceil((baseHp + (world - 1) * 150) * this.difficultyMultiplier);
    const bossSpeed = 28 + (world - 1) * 4;
    // ----------------------------

    console.log(`[EnemySpawner V2] World ${world}-7 (BOSS): Spawning '${bossSpriteKey}' (HP: ${bossHp}, Speed: ${bossSpeed})`);

    this.scene.enemiesSpawned = 1;
    this.scene.bossSpawned = true;

    const boss = this.scene.enemies.create(this.scene.scale.width / 2, -50, bossSpriteKey);
    boss.setVelocityY(bossSpeed);
    boss.setDisplaySize(48, 48);
    boss.hp = bossHp;
    boss.isBoss = true;

    SoundManager.play(this.scene, 'boss_spawn');
  }

  /**
   * Creates a single enemy instance.
   * @private
   */
  _spawnSingleEnemy(spriteKey, hp, speed) {
    if (!this.scene.player || !this.scene.player.active) {
      return;
    }

    const enemy = this.scene.enemies.create(
      Phaser.Math.Between(50, this.scene.scale.width - 50),
      -50,
      spriteKey
    );

    enemy.setVelocityY(speed);
    enemy.setDisplaySize(32, 32);
    enemy.hp = hp;
    enemy.isBoss = false;
  }
}