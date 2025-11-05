import SoundManager from '../utils/sound.js';

const BOSS_PHASE = 7;

/**
 * @class EnemySpawner
 * @description Manages the creation and progression of enemy waves.
 * It scales enemy count, health, and speed based on the player's current world, phase,
 * and account level, ensuring a balanced difficulty curve.
 */
export default class EnemySpawner {
  /**
   * @constructor
   * @param {Phaser.Scene} scene - The main game scene instance.
   * @param {number} [accountLevel=1] - The player's account level, used to calculate a difficulty multiplier.
   */
  constructor(scene, accountLevel = 1) {
    this.scene = scene;
    this.accountLevel = accountLevel;
    this.enemyIdCounter = 0;
    this.difficultyMultiplier = 1 + (this.accountLevel - 1) * 0.07;

    const manifest = this.scene.cache.json.get('assetManifest');
    if (manifest && manifest.assets) {
      this.enemyKeys = Object.keys(manifest.assets.enemies || {});
      this.bossKeys = Object.keys(manifest.assets.bosses || {});
    } else {
      this.enemyKeys = [];
      this.bossKeys = [];
    }
  }

  /**
   * Spawns a complete wave of enemies or a boss, depending on the phase.
   * @param {number} world - The current world number (e.g., 1, 2, 3).
   * @param {number} phase - The current phase within the world (1-7).
   */
  spawnWave(world, phase) {
    if (!this.scene || !this.scene.enemies) {
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
   * Spawns a standard wave of multiple enemies.
   * @param {number} world - The current world number.
   * @param {number} phase - The current phase number.
   * @private
   */
  _spawnRegularWave(world, phase) {
    const enemySpriteKey = this.enemyKeys[Math.min(world - 1, this.enemyKeys.length - 1)] || this.enemyKeys[0];
    if (!enemySpriteKey) {
        return;
    }

    const baseCount = 3;
    const enemyCount = baseCount + (world - 1) * 2 + phase;
    const baseHp = 1;
    const enemyHp = Math.ceil((baseHp + (world - 1) * 5 + (phase - 1) * 1) * this.difficultyMultiplier);
    const baseSpeed = 80;
    const enemySpeed = (baseSpeed + (world - 1) * 15 + (phase - 1) * 5) * this.difficultyMultiplier;
    const spawnInterval = Math.max(200, 800 - (world * 50));

    this.scene.enemiesSpawned = enemyCount;

    for (let i = 0; i < enemyCount; i++) {
        this.scene.time.delayedCall(i * spawnInterval, () => {
            this._spawnSingleEnemy(enemySpriteKey, enemyHp, enemySpeed);
        });
    }
  }

  /**
   * Spawns a single, powerful boss enemy.
   * @param {number} world - The current world number, which determines the boss type.
   * @private
   */
  _spawnBossWave(world) {
    const bossSpriteKey = this.bossKeys[Math.min(world - 1, this.bossKeys.length - 1)] || this.bossKeys[0];
     if (!bossSpriteKey) {
        return;
    }

    const baseHp = 100;
    const bossHp = Math.ceil((baseHp + (world - 1) * 150) * this.difficultyMultiplier);
    const bossSpeed = 28 + (world - 1) * 4;

    this.scene.enemiesSpawned = 1;
    this.scene.bossSpawned = true;

    const boss = this.scene.enemies.create(this.scene.scale.width / 2, -50, bossSpriteKey);
    boss.setVelocityY(bossSpeed);
    boss.setDisplaySize(48, 48);
    boss.hp = bossHp;
    boss.isBoss = true;
    boss.name = `boss_${this.enemyIdCounter++}`;

    SoundManager.play(this.scene, 'boss_spawn');
  }

  /**
   * Creates and configures a single enemy instance and adds it to the scene.
   * @param {string} spriteKey - The asset key for the enemy's sprite.
   * @param {number} hp - The health points for the enemy.
   * @param {number} speed - The vertical speed for the enemy.
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
    enemy.name = `enemy_${this.enemyIdCounter++}`;
  }
}