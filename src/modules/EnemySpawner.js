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

    // TASK FORCE: Exponential Spawn Logic (Kill 1 -> Spawn 2)
    // No more time-based loop. Reactive to kills.
    // Initial Seed: 2 Enemies
    this.spawnQueue = 2;
    this.totalSpawnedInWave = 0; // Track total spawned to respect Quota

    // Queue Processor (Fast Check)
    this.spawnTimer = this.scene.time.addEvent({
      delay: 100, // Check queue frequently
      callback: this.processQueue,
      callbackScope: this,
      loop: true,
    });

    console.log(
      `[EnemySpawner] Started spawning ${mobConfig.name} (x${difficultyMultiplier}) [Reactive Mode]`
    );
  }

  /**
   * Called when an enemy is killed. Triggers exponential respawn.
   */
  onEnemyKilled() {
      if (!this.isSpawning) return;

      // Exponential Rule: Kill 1 -> Spawn 2
      this.spawnQueue += 2;
  }

  processQueue() {
    if (!this.isSpawning) return;
    if (this.scene.gamePaused) return;

    // Check Quota (Don't spawn more than needed for the wave)
    const quota = this.scene.waveQuota || 100;

    if (this.totalSpawnedInWave >= quota) {
        this.spawnQueue = 0; // Clear queue, we are done
        return;
    }

    // Concurrency Limit (Safety Cap)
    const maxEnemies = 20; // Increased from 8 for "Horde" feel
    const currentCount = this.scene.enemies.countActive();

    // FAILSAFE: If no enemies active, queue empty, and quota not met -> Spawn 1 to keep game going (avoid softlock)
    if (currentCount === 0 && this.spawnQueue === 0 && this.totalSpawnedInWave < quota) {
        this.spawnQueue = 1;
    }

    if (currentCount < maxEnemies && this.spawnQueue > 0) {
        let activeCount = currentCount;
        // Loop to fill up to max
        while (activeCount < maxEnemies && this.spawnQueue > 0 && this.totalSpawnedInWave < quota) {
            this.spawnEnemy();
            this.spawnQueue--;
            this.totalSpawnedInWave++;
            activeCount++;
        }
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

    // TASK FORCE: FLUID ENEMY PHYSICS (Sliding Circles)
    enemy.body.setCircle(11); // Radius 11 -> Diameter 22px
    enemy.body.setOffset(5, 5); // Center on 32x32 sprite ((32-22)/2 = 5)

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

    // TASK FORCE: HYBRID AI
    this.attachAI(enemy, speed);
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

    // TASK FORCE: BOSS HITBOX (Sliding Circle)
    // 96px sprite. 72px diameter circle?
    // Radius 36. Offset: (96-72)/2 = 12.
    boss.body.setCircle(36);
    boss.body.setOffset(12, 12);

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
          bomb.fire(boss.x, boss.y + 40, vx, vy, 1.5, true);
          bomb.setTint(0xff5f1f);
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
  }

  spawnMinion(x, y) {
      if (!this.currentMob) return; // Use current wave mob

      const mob = this.currentMob;
      const hp = Math.ceil(mob.base_hp * this.difficultyMultiplier * 0.5);

      let key = mob.asset_key || 'enemy';
      if (!this.scene.textures.exists(key)) key = 'enemy';

      const enemy = this.scene.enemies.create(x, y, key);
      enemy.setDisplaySize(32, 32);

      // TASK FORCE: MINION HITBOX (Sliding Circle)
      enemy.body.setCircle(11);
      enemy.body.setOffset(5, 5);

      enemy.setCollideWorldBounds(true);
      enemy.setBounce(0, 0); // Slide, don't bounce (Minions are smart now)

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

      // Hybrid AI
      this.attachAI(enemy, 80); // Minion Speed 80
  }

  /**
   * Attaches Hybrid AI (Seek/Wander) to an enemy sprite.
   */
  attachAI(enemy, speed) {
      enemy.lastThinkTime = 0;
      enemy.aiState = 'SEEK';
      enemy.wanderTarget = null;
      enemy.wanderEndTime = 0;
      enemy.lastPos = { x: enemy.x, y: enemy.y };

      enemy.update = (time, delta) => {
          if (!enemy.active || !enemy.body) return;

          // --- 1. HIGH-LEVEL AI (Throttled: 250ms) ---
          if (time - enemy.lastThinkTime > 250) {
              enemy.lastThinkTime = time;

              const player = this.scene.player;
              if (!player || !player.active) {
                  enemy.aiState = 'WANDER';
                  return;
              }

              // A. Line of Sight Check (Raycast)
              const line = new Phaser.Geom.Line(enemy.x, enemy.y, player.x, player.y);
              let hasLineOfSight = true;

              if (this.scene.hardGroup) {
                  const blocks = this.scene.hardGroup.getChildren();
                  for (const block of blocks) {
                      if (block.active && Phaser.Geom.Intersects.LineToRectangle(line, block.body)) {
                          hasLineOfSight = false;
                          break;
                      }
                  }
              }

              // B. State Decision
              if (hasLineOfSight) {
                  enemy.aiState = 'SEEK';
              } else {
                  if (enemy.aiState !== 'WANDER' || time > enemy.wanderEndTime) {
                      enemy.aiState = 'WANDER';
                      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                      const dist = Phaser.Math.FloatBetween(50, 150);
                      enemy.wanderTarget = {
                          x: Phaser.Math.Clamp(enemy.x + Math.cos(angle) * dist, 50, 430),
                          y: Phaser.Math.Clamp(enemy.y + Math.sin(angle) * dist, 50, 750)
                      };
                      enemy.wanderEndTime = time + 2000;
                  }
              }
          }

          // --- 2. LOW-LEVEL MOVEMENT ---
          let targetX = enemy.x;
          let targetY = enemy.y;

          if (enemy.aiState === 'SEEK' && this.scene.player) {
              targetX = this.scene.player.x;
              targetY = this.scene.player.y;
          } else if (enemy.aiState === 'WANDER' && enemy.wanderTarget) {
              targetX = enemy.wanderTarget.x;
              targetY = enemy.wanderTarget.y;
          }

          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;

          enemy.setVelocity(vx, vy);
      };
  }
}
