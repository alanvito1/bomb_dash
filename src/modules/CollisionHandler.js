import SoundManager from '../utils/sound.js';
import { showNextStageDialog as StageDialog } from './NextStageDialog.js';
import playerStateService from '../services/PlayerStateService.js';

/**
 * @class CollisionHandler
 * @description Manages all physics overlap and collision events within the main game scene.
 */
export default class CollisionHandler {
  /**
   * @constructor
   * @param {Phaser.Scene} scene - The main game scene instance.
   * @param {Phaser.Events.EventEmitter} events - The scene's event emitter for communicating with the HUD.
   * @param {PowerupLogic} powerupLogic - The instance of the power-up logic manager.
   */
  constructor(scene, events, powerupLogic) {
    this.scene = scene;
    this.events = events;
    this.powerupLogic = powerupLogic;
  }

  /**
   * Registers all the necessary physics overlap detectors for the game.
   */
  register() {
    this.scene.physics.add.overlap(
      this.scene.bombs,
      this.scene.enemies,
      (bomb, enemy) => this.hitEnemy(bomb, enemy),
      null,
      this
    );
    this.scene.physics.add.overlap(
      this.scene.player,
      this.scene.powerups,
      (player, powerup) => this.handlePowerup(player, powerup),
      null,
      this
    );
    this.scene.physics.add.overlap(
      this.scene.player,
      this.scene.enemies,
      (player, enemy) => this.onHit(player, enemy),
      null,
      this
    );
  }

  /**
   * Handles the logic for a player collecting a power-up.
   * @param {Phaser.GameObjects.Sprite} player - The player sprite.
   * @param {Phaser.GameObjects.Sprite} powerup - The power-up sprite.
   */
  handlePowerup(player, powerup) {
    this.powerupLogic.collect(player, powerup);
    SoundManager.play(this.scene, 'powerup_collect');
  }

  /**
   * Handles the logic when a bomb hits an enemy.
   * @param {Phaser.GameObjects.Sprite} bomb - The bomb sprite.
   * @param {Phaser.GameObjects.Sprite} enemy - The enemy sprite.
   */
  hitEnemy(bomb, enemy) {
    if (!enemy.active) return;
    const impactX = bomb.x;
    const impactY = bomb.y;
    bomb.deactivate();

    // --- SPLASH DAMAGE LOGIC ---
    const range = this.scene.playerStats.bombRange || 1;
    const explosionRadius = 20 + range * 12;
    const scale = explosionRadius / 16; // Base 32px / 2 = 16px radius for scale 1.

    // Visual Explosion
    if (this.scene.explosionManager) {
      this.scene.explosionManager.spawn(impactX, impactY, scale);
    }

    const baseDamage = this.scene.playerStats.damage || 1;

    // Identify Targets
    // We use a simple distance check against all active enemies.
    const targets = this.scene.enemies.getChildren().filter((target) => {
      if (!target.active) return false;
      const dist = Phaser.Math.Distance.Between(
        impactX,
        impactY,
        target.x,
        target.y
      );
      return dist <= explosionRadius;
    });

    // Apply Damage
    targets.forEach((target) => {
      this.applyDamage(target, baseDamage);

      // Task Force: Poison Spell
      if (this.scene.playerStats.spells && this.scene.playerStats.spells.includes('poison_bomb')) {
          this.applyPoison(target);
      }
    });
  }

  applyPoison(enemy) {
      if (enemy.poisoned || !enemy.active) return;

      enemy.poisoned = true;
      enemy.setTint(0x00ff00); // Green Tint

      // 3 Ticks over 3 seconds
      this.scene.time.addEvent({
          delay: 1000,
          repeat: 2,
          callback: () => {
              if (enemy.active) {
                  // Poison Damage (Flat or Scaled? Let's use 10% of MaxHP or flat 5)
                  const dmg = Math.max(1, Math.floor(enemy.maxHp * 0.05));
                  this.applyDamage(enemy, dmg, true); // true = isDoT
              }
          }
      });

      // Cleanup
      this.scene.time.delayedCall(3500, () => {
          if (enemy.active) {
              enemy.poisoned = false;
              enemy.clearTint();
          }
      });
  }

  applyFreeze(enemy) {
      if (enemy.frozen || !enemy.active) return;

      enemy.frozen = true;
      enemy.setTint(0x00ffff); // Cyan Tint

      // Freeze Movement
      // Store original speed if available, or just assume handled by update logic
      // Most movement logic multiplies speed. We can inject a "speedMultiplier" or modify speed directly.
      if (enemy.body) enemy.body.setVelocity(0, 0);

      // We rely on enemy.update checking `enemy.frozen` or we can hack `enemy.speed`
      // Let's assume we modify speed and restore it.
      const originalSpeed = enemy.speed || 50;
      enemy.speed = 0;

      // Restore after 2 seconds
      this.scene.time.delayedCall(2000, () => {
          if (enemy.active) {
              enemy.frozen = false;
              enemy.speed = originalSpeed;
              enemy.clearTint();
          }
      });
  }

  /**
   * Applies damage to a specific enemy, handling bonuses and death logic.
   */
  applyDamage(enemy, baseDamage, isDoT = false) {
    if (!enemy.active) return;

    // Bestiary Bonus
    const enemyType = enemy.id || enemy.texture.key; // Prefer ID
    const kills =
      (this.scene.bestiaryData && this.scene.bestiaryData[enemyType]) || 0;

    let bonus = 0;
    if (kills >= 5000) bonus = 0.15;
    else if (kills >= 1000) bonus = 0.1;
    else if (kills >= 100) bonus = 0.05;

    let damage = baseDamage;
    if (bonus > 0) {
      damage = Math.ceil(damage * (1 + bonus));
    }

    // TASK FORCE: POWER XP (Record Damage Dealt)
    if (this.scene.recordDamage) {
        this.scene.recordDamage(damage);
    }

    enemy.hp -= damage;

    if (enemy.isBoss) {
      this.events.emit('update-boss-health', {
        health: Math.max(0, enemy.hp),
        maxHealth: enemy.maxHp,
      });
    }

    // 4. Floating Combat Text
    if (this.scene.damageTextManager) {
      // Critical if bonus > 0 or random chance
      const isCrit = bonus > 0;
      this.scene.damageTextManager.show(
        enemy.x,
        enemy.y,
        damage,
        isCrit,
        enemy.isBoss
      );
    }

    SoundManager.play(this.scene, 'hit_enemy');

    // ⚪ HIT FLASH
    if (!isDoT) {
        enemy.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (enemy.active) {
                if (enemy.poisoned) enemy.setTint(0x00ff00);
                else enemy.clearTint();
            }
        });
    }

    if (enemy.hp <= 0) {
      // 3. Screen Shake & Hit Pause
      if (enemy.isBoss) {
        // Boss Death: Epic Shake & Long Pause
        this.scene.shakeCamera(500, 0.03);

        if (this.scene.physics.world.isPaused === false) {
          this.scene.physics.pause();
          // Slow motion / Freeze for 100ms
          this.scene.time.delayedCall(100, () => {
            if (
              this.scene &&
              !this.scene.gamePaused &&
              !this.scene.bossDefeated
            ) {
              // Ensure we don't resume if transitioning
              this.scene.physics.resume();
            }
          });
        }
      } else {
        // Normal Death: Quick Shake (optional, or rely on impact shake?)
        // User said: "Quando o Chefão morrer... shake(500, 0.03)".
        // For impact/damage taken by hero: shake(100, 0.01).
        // For normal enemy death, user asked for "Neon Burst".
        // The current code had `shake(50, 0.005)` for death. Let's keep a tiny one.
        this.scene.shakeCamera(50, 0.005);
      }

      // 2. Neon Burst Particles (Global Emitter)
      if (this.scene.neonBurst) {
        this.scene.neonBurst.explode(enemy.x, enemy.y, enemy.isBoss ? 50 : 20);
      }

      SoundManager.play(
        this.scene,
        enemy.isBoss ? 'boss_death' : 'enemy_death'
      );

      const xpGained = enemy.isBoss ? 3 : 1;
      const coinsGained = enemy.isBoss ? 5 : 1;
      this.scene.score += xpGained;

      // ⚠️ RISK MECHANIC: Update Session Loot (Not Persistent Stats yet)
      if (!this.scene.sessionLoot) this.scene.sessionLoot = { coins: 0, xp: 0 };
      this.scene.sessionLoot.coins += coinsGained;
      this.scene.sessionLoot.xp += xpGained;

      // Visual Feedback
      if (this.scene.damageTextManager) {
        this.scene.damageTextManager.show(
          enemy.x,
          enemy.y - 20,
          `+${coinsGained} G`,
          true
        );
      }

      // Update HUD to show SESSION LOOT (The "At Risk" Amount)
      this.events.emit('update-bcoin', {
        balance: this.scene.sessionLoot.coins,
      });

      // Bestiary Collection (Session + Persistent)
      const type = enemy.id || enemy.texture.key;

      // Session (For Victory Display)
      if (!this.scene.sessionBestiary) this.scene.sessionBestiary = {};
      this.scene.sessionBestiary[type] =
        (this.scene.sessionBestiary[type] || 0) + 1;

      // Persistent (Immediate) - Task Force Requirement
      playerStateService.incrementBestiaryKill(type);

      // Floating Text Feedback
      if (this.scene.damageTextManager) {
        this.scene.damageTextManager.show(
          enemy.x,
          enemy.y - 40,
          'Bestiary +1',
          false
        );
      }

      this.scene.enemiesKilled++;

      if (enemy.isBoss) {
        this.events.emit('hide-boss-health');
        this.scene.bossDefeated = true;
        this.scene.bossSpawned = false;
        this.scene.physics.pause();
        this.scene.setPlayerState('CANNOT_SHOOT', 'Boss defeated');
        StageDialog(this.scene, () => this.scene.prepareNextStage());
      }

      if (this.scene.trySpawnLoot) {
        this.scene.trySpawnLoot(enemy.x, enemy.y);
      }

      enemy.destroy();
      this.powerupLogic.spawn(enemy.x, enemy.y);
    }
  }

  /**
   * Handles the logic when the player is hit by an enemy.
   * @param {Phaser.GameObjects.Sprite} player - The player sprite.
   * @param {Phaser.GameObjects.Sprite} enemy - The enemy sprite.
   */
  onHit(player, enemy) {
    if (this.scene.gamePaused || this.scene.transitioning) return;

    // 🔴 PLAYER HIT FX
    // 3. Screen Shake & Hit Pause (Hero Damage)
    player.setTint(0xff0000); // Red Flash
    this.scene.time.delayedCall(200, () => {
      if (player.active) player.clearTint();
    });

    // User requested: shake(100, 0.01)
    this.scene.shakeCamera(100, 0.01);

    const stats = this.scene.playerStats;
    stats.hp -= 100;

    this.events.emit('update-health', {
      health: stats.hp,
      maxHealth: stats.maxHp,
    });
    SoundManager.play(this.scene, 'player_hit');

    if (stats.hp <= 0) {
      stats.extraLives--;
      if (stats.extraLives >= 0) {
        stats.hp = stats.maxHp;
        this.events.emit('update-health', {
          health: stats.hp,
          maxHealth: stats.maxHp,
        });
      } else {
        stats.hp = 0;
        this.events.emit('update-health', {
          health: 0,
          maxHealth: stats.maxHp,
        });
        this.scene.handleGameOver();
      }
    }
  }
}
