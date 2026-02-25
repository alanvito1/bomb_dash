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
    const spawnRate = Math.max(500, 1500 - difficultyMultiplier * 100);

    this.spawnTimer = this.scene.time.addEvent({
      delay: spawnRate,
      callback: this.spawnCheck,
      callbackScope: this,
      loop: true,
    });

    console.log(
      `[EnemySpawner] Started spawning ${mobConfig.name} (x${difficultyMultiplier})`
    );
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
    const speed = mob.base_speed * (1 + (this.difficultyMultiplier - 1) * 0.1);

    // Task Force: Enemies enter from Top-Center "Portal" (Gap in Hard Blocks)
    const x = this.scene.scale.width / 2;
    const y = -50; // Fly in from top

    // Use asset_key from MobConfig
    let key = mob.asset_key || 'enemy';

    // Check texture exists
    if (!this.scene.textures.exists(key)) {
      console.warn(
        `[EnemySpawner] Missing texture for ${mob.id}: ${key}. Using fallback 'enemy'.`
      );
      key = 'enemy';
    }

    const enemy = this.scene.enemies.create(x, y, key);
    enemy.setDisplaySize(32, 32);

    // TASK FORCE: FLUID ENEMY PHYSICS
    // 1. Reduced Hitbox (24px for 32px sprite -> ~25% reduction)
    // 2. Enable World Bounds & Bounce
    enemy.body.setSize(24, 24);
    // Center the hitbox? Default offset is 0,0.
    // If sprite is 32x32 (Display), body is 24x24.
    // Center offset = (32-24)/2 = 4.
    enemy.body.setOffset(4, 4);

    enemy.setCollideWorldBounds(true);
    enemy.setBounce(0, 0); // Slide, don't bounce

    // Initial Velocity (add slight horizontal drift for "AI" feel)
    enemy.setVelocityY(speed);
    enemy.setVelocityX(Phaser.Math.Between(-20, 20));

    enemy.hp = hp;
    enemy.maxHp = hp; // Useful for UI if needed
    enemy.id = mob.id; // Store mob ID for Bestiary
    enemy.isBoss = false;
    enemy.name = `${mob.id}_${this.enemyIdCounter++}`;

    // TASK FORCE: ENEMY AI (Defense Shooter)
    // Attach update logic for per-frame AI
    enemy.lastThinkTime = 0;

    enemy.update = (time, delta) => {
        if (!enemy.active || !enemy.body) return;

        // AI Throttling (Think every 200ms)
        if (time - enemy.lastThinkTime < 200) return;
        enemy.lastThinkTime = time;

        const isHardcore = this.scene.playerStats.account_level >= 8;
        let target = this.scene.player; // Default Target: Player

        // LEVEL 8+ THREAT: LOOT STEAL & BLOCK BREAKER
        if (isHardcore) {
            // Priority 1: Loot on Ground (Greed)
            let nearestLoot = null;
            let minLootDist = 150; // Vision Range

            this.scene.lootGroup.getChildren().forEach(loot => {
                if (!loot.active) return;
                const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, loot.x, loot.y);
                if (dist < minLootDist) {
                    minLootDist = dist;
                    nearestLoot = loot;
                }
            });

            if (nearestLoot) {
                target = nearestLoot;
                // Steal Logic (Overlap handled by physics or check here)
                if (minLootDist < 30) {
                    // OM NOM NOM
                    nearestLoot.destroy();
                    // Visual feedback: "STOLEN!" text?
                    if (this.scene.damageTextManager) {
                        this.scene.damageTextManager.show(enemy.x, enemy.y - 20, 'STOLEN!', '#ff0000');
                    }
                    return; // Busy eating
                }
            } else {
                // Priority 2: Soft Blocks (Destruction)
                // If blocked or near one?
                // Simple implementation: Find nearest Soft Block in front
                let nearestBlock = null;
                let minBlockDist = 60; // Melee Range

                this.scene.softGroup.getChildren().forEach(block => {
                    if (!block.active) return;
                    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, block.x, block.y);
                    // Check if block is BELOW enemy (since they want to go down)
                    if (block.y > enemy.y && dist < minBlockDist) {
                        minBlockDist = dist;
                        nearestBlock = block;
                    }
                });

                if (nearestBlock) {
                    target = nearestBlock;
                    if (minBlockDist < 40) {
                        // SMASH!
                        nearestBlock.destroy();
                        if (this.scene.explosionManager) {
                            this.scene.explosionManager.spawn(nearestBlock.x, nearestBlock.y, 0.5);
                        }
                        return; // Busy smashing
                    }
                }
            }
        }

        // MOVEMENT LOGIC
        if (target && target.active) {
            this.scene.physics.moveToObject(enemy, target, speed);
        } else {
             // Default: Move Down
             enemy.setVelocityY(speed);
             enemy.setVelocityX(0);
        }
    };
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

    // Task Force: Boss HP Rule -> 5x Common Mob HP (Base 20)
    // Formula: 5 * (20 * 1.15^Wave)
    // Since difficultyMultiplier passed is already (1.15^Wave), we use:
    const COMMON_BASE_HP = 20;
    const hp = Math.ceil(5 * COMMON_BASE_HP * difficultyMultiplier);

    const speed = bossConfig.base_speed * 0.8; // Boss is slower?
    let key = bossConfig.asset_key || 'boss1';

    const x = this.scene.scale.width / 2;
    const y = -100;

    if (!this.scene.textures.exists(key)) {
      console.warn(
        `[EnemySpawner] Missing boss texture: ${key}. Using fallback 'boss1'.`
      );
      key = 'boss1';
    }

    const boss = this.scene.enemies.create(x, y, key);
    // TASK FORCE: BOSS SCALE (3x)
    const size = 96;
    boss.setDisplaySize(size, size);

    // TASK FORCE: BOSS HITBOX
    // 96px sprite -> 72px hitbox (25% reduction)
    boss.body.setSize(72, 72);
    boss.body.setOffset(12, 12); // (96-72)/2 = 12

    boss.setVelocityY(speed); // Fall in

    boss.hp = hp;
    boss.maxHp = hp;
    boss.id = bossConfig.id;
    boss.isBoss = true;
    boss.name = `BOSS_${bossConfig.id}`;

    // Boss State
    boss.isEnraged = false;
    boss.nextShotTime = 0;
    boss.nextSummonTime = 0;
    boss.shootCooldown = 2000; // 2s
    boss.summonCooldown = 8000; // 8s

    // Boss Entry Tween
    this.scene.tweens.add({
      targets: boss,
      y: 150, // Move to fixed position
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        if (!boss.active) return;

        // Start Boss Logic (Movement Pattern)
        boss.setVelocityY(0);
        boss.setVelocityX(50);
        boss.setCollideWorldBounds(true);
        boss.setBounce(1, 1);

        // Movement Loop (Random Direction)
        this.scene.time.addEvent({
          delay: 2000,
          callback: () => {
            if (boss.active) {
              const speedMult = boss.isEnraged ? 1.5 : 1.0;
              boss.setVelocityX(Phaser.Math.Between(-80, 80) * speedMult);
              boss.setVelocityY(Phaser.Math.Between(-20, 20) * speedMult);
            }
          },
          loop: true,
        });
      },
    });

    // TASK FORCE: BOSS AI (Attached to Sprite)
    boss.update = (time, delta) => {
        if (!boss.active || !boss.body) return;

        // 1. Enrage Check
        if (!boss.isEnraged && boss.hp <= boss.maxHp * 0.5) {
            boss.isEnraged = true;
            boss.setTint(0xff4500); // Red-Orange Tint

            // Speed Boost
            boss.shootCooldown = 1000; // Faster shooting

            // Visual Shout
            const shout = this.scene.add.text(boss.x, boss.y - 60, 'ENRAGED!', {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: '#ff0000',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            this.scene.tweens.add({
                targets: shout,
                y: boss.y - 100,
                alpha: 0,
                duration: 1000,
                onComplete: () => shout.destroy()
            });

            SoundManager.play(this.scene, 'boss_spawn'); // Roar
        }

        // 2. Shooting Skill
        if (time > boss.nextShotTime) {
            boss.nextShotTime = time + boss.shootCooldown;
            this.bossShoot(boss);
        }

        // 3. Summoning Skill
        if (time > boss.nextSummonTime) {
            boss.nextSummonTime = time + boss.summonCooldown;
            this.bossSummon(boss);
        }
    };

    this.scene.bossSpawned = true;
    SoundManager.play(this.scene, 'boss_spawn');
    console.log(`[EnemySpawner] Spawned BOSS ${bossConfig.name} (HP: ${hp})`);

    // Update HUD
    this.scene.events.emit('show-boss-health', {
      name: bossConfig.name,
      maxHealth: hp,
    });
  }

  bossShoot(boss) {
      if (!this.scene.player || !this.scene.player.active) return;
      if (!this.scene.enemyProjectiles) return;

      const targetX = this.scene.player.x;
      const targetY = this.scene.player.y;

      const angle = Phaser.Math.Angle.Between(boss.x, boss.y, targetX, targetY);
      const speed = 300;

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const bomb = this.scene.enemyProjectiles.get(boss.x, boss.y + 40); // Spawn below boss center
      if (bomb) {
          // Use 'fire' method from Bomb.js
          // fire(x, y, vx, vy, size, isOpponent)
          // We pass isOpponent=true to trigger Tint logic in Bomb.js
          // But Bomb.js sets tint to 0xff8080 (Reddish).
          // We can override tint here if we want "Poison/Fire" distinct look.

          bomb.fire(boss.x, boss.y + 40, vx, vy, 1.5, true);

          // Override Tint for Boss Projectile (Fire/Magma)
          bomb.setTint(0xff5f1f);

          // Add trail or effect?
          // Bomb.js has bloom if available.
      }
  }

  bossSummon(boss) {
      // Spawn 2 Minions
      for (let i = 0; i < 2; i++) {
          const offsetX = (i === 0 ? -60 : 60);
          const spawnX = Phaser.Math.Clamp(boss.x + offsetX, 50, 430);
          const spawnY = boss.y + 40;

          this.spawnMinion(spawnX, spawnY);
      }

      // Visual Feedback
      // ...
  }

  spawnMinion(x, y) {
      if (!this.currentMob) return; // Use current wave mob

      const mob = this.currentMob;
      const hp = Math.ceil(mob.base_hp * this.difficultyMultiplier * 0.5); // Minions are weaker? Or same? "Common Mobs" -> Same.
      // Let's keep them standard HP.

      let key = mob.asset_key || 'enemy';
      if (!this.scene.textures.exists(key)) key = 'enemy';

      const enemy = this.scene.enemies.create(x, y, key);
      enemy.setDisplaySize(32, 32);
      enemy.body.setSize(24, 24);
      enemy.body.setOffset(4, 4);
      enemy.setCollideWorldBounds(true);
      enemy.setBounce(1, 1);

      enemy.setVelocityY(100);
      enemy.setVelocityX(Phaser.Math.Between(-50, 50));

      enemy.hp = hp;
      enemy.maxHp = hp;
      enemy.id = mob.id;
      enemy.isBoss = false;
      enemy.name = `MINION_${this.enemyIdCounter++}`;

      // Spawn Effect
      if (this.scene.neonBurst) {
          this.scene.neonBurst.explode(x, y, 10);
      }
  }
}
