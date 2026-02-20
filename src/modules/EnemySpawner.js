import SoundManager from '../utils/sound.js';
import { MOBS } from '../config/MobConfig.js';

/**
 * @class EnemySpawner
 * @description Manages the creation and progression of enemy waves.
 * Refactored for Task Force Step 2: 30-Wave Engine.
 */
export default class EnemySpawner {
  /**
   * @constructor
   * @param {Phaser.Scene} scene - The main game scene instance.
   */
  constructor(scene) {
    this.scene = scene;
    this.spawnTimer = null;
    this.isSpawning = false;
    this.currentMob = null;
    this.difficultyMultiplier = 1.0;
    this.enemyIdCounter = 0;
  }

  /**
   * Starts continuous spawning of a specific mob type.
   * @param {Object} mobConfig - The mob configuration object from MobConfig.js.
   * @param {number} difficultyMultiplier - Multiplier for stats.
   */
  startSpawning(mobConfig, difficultyMultiplier = 1.0) {
    this.stopSpawning(); // Clear any existing timer

    this.currentMob = mobConfig;
    this.difficultyMultiplier = difficultyMultiplier;
    this.isSpawning = true;

    // Initial Spawn
    this.spawnEnemy();

    // Loop
    // Spawn rate: Base 1.5s, decreases with difficulty?
    // Let's use a fixed rate for now, e.g. 1000ms.
    const spawnRate = Math.max(500, 1500 - (difficultyMultiplier * 100));

    this.spawnTimer = this.scene.time.addEvent({
        delay: spawnRate,
        callback: this.spawnCheck,
        callbackScope: this,
        loop: true
    });

    console.log(`[EnemySpawner] Started spawning ${mobConfig.name} (x${difficultyMultiplier})`);
  }

  spawnCheck() {
      if (!this.isSpawning) return;
      if (this.scene.gamePaused) return;

      // Concurrency Limit (Don't flood the screen)
      const maxEnemies = 8;
      const currentCount = this.scene.enemies.countActive();

      if (currentCount < maxEnemies) {
          this.spawnEnemy();
      }
  }

  spawnEnemy() {
      if (!this.scene.enemies) return;

      const mob = this.currentMob;
      if (!mob) return;

      // Calculate Stats
      const hp = Math.ceil(mob.base_hp * this.difficultyMultiplier);
      const speed = mob.base_speed * (1 + ((this.difficultyMultiplier - 1) * 0.1));

      const x = Phaser.Math.Between(50, this.scene.scale.width - 50);
      const y = -50; // Top of screen

      // Use asset_key from MobConfig
      let key = mob.asset_key || 'enemy';

      // Check texture exists
      if (!this.scene.textures.exists(key)) {
          console.warn(`[EnemySpawner] Missing texture for ${mob.id}: ${key}. Using fallback 'enemy'.`);
          key = 'enemy';
      }

      const enemy = this.scene.enemies.create(x, y, key);
      enemy.setDisplaySize(32, 32);
      enemy.setVelocityY(speed);

      enemy.hp = hp;
      enemy.maxHp = hp; // Useful for UI if needed
      enemy.id = mob.id; // Store mob ID for Bestiary
      enemy.isBoss = false;
      enemy.name = `${mob.id}_${this.enemyIdCounter++}`;

      // Optional: Add simple zigzag or sine wave movement based on mob type?
      // For now, straight down.
  }

  stopSpawning() {
      this.isSpawning = false;
      if (this.spawnTimer) {
          this.spawnTimer.remove();
          this.spawnTimer = null;
      }
  }

  /**
   * Spawns the Boss for the current stage.
   * @param {Object} bossConfig - The boss configuration object.
   * @param {number} difficultyMultiplier - Multiplier for stats.
   */
  spawnBoss(bossConfig, difficultyMultiplier = 1.0) {
      this.stopSpawning(); // Ensure no mobs interfere

      if (!bossConfig) return;

      const hp = Math.ceil(bossConfig.base_hp * difficultyMultiplier * 2); // Boss HP scaling
      const speed = bossConfig.base_speed * 0.8; // Boss is slower?
      let key = bossConfig.asset_key || 'boss1';

      const x = this.scene.scale.width / 2;
      const y = -100;

      if (!this.scene.textures.exists(key)) {
          console.warn(`[EnemySpawner] Missing boss texture: ${key}. Using fallback 'boss1'.`);
          key = 'boss1';
      }

      const boss = this.scene.enemies.create(x, y, key);
      boss.setDisplaySize(64, 64); // Bigger boss
      boss.setVelocityY(speed); // Fall in

      boss.hp = hp;
      boss.maxHp = hp;
      boss.id = bossConfig.id;
      boss.isBoss = true;
      boss.name = `BOSS_${bossConfig.id}`;

      // Boss Entry Tween
      this.scene.tweens.add({
          targets: boss,
          y: 150, // Move to fixed position
          duration: 2000,
          ease: 'Power2',
          onComplete: () => {
             // Start Boss Logic (Movement Pattern)
             boss.setVelocityY(0);
             boss.setVelocityX(50);
             boss.setCollideWorldBounds(true);
             boss.setBounce(1, 1);

             // Simple AI: Change direction randomly?
             this.scene.time.addEvent({
                 delay: 2000,
                 callback: () => {
                     if (boss.active) {
                         boss.setVelocityX(Phaser.Math.Between(-80, 80));
                         boss.setVelocityY(Phaser.Math.Between(-20, 20));
                     }
                 },
                 loop: true
             });
          }
      });

      this.scene.bossSpawned = true;
      SoundManager.play(this.scene, 'boss_spawn');
      console.log(`[EnemySpawner] Spawned BOSS ${bossConfig.name} (HP: ${hp})`);

      // Update HUD
      this.scene.events.emit('show-boss-health', {
          name: bossConfig.name,
          maxHealth: hp
      });
  }
}
