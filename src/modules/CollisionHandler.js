import ExplosionEffect from './ExplosionEffect.js';
import SoundManager from '../utils/sound.js';
import { createFloatingText } from './FloatingText.js';
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
    bomb.destroy();

    // Proficiency: Bomb Mastery
    this.scene.sessionBombHits = (this.scene.sessionBombHits || 0) + 1;

    // Check for Level Up (Logarithmic: Level = sqrt(XP)/2)
    const startXp = this.scene.playerStats.bomb_mastery_xp || 0;
    const currentXp = startXp + this.scene.sessionBombHits;

    // Check if level changed from previous hit
    const prevXp = currentXp - 1;
    const currentLevel = Math.floor(Math.sqrt(currentXp) / 2);
    const prevLevel = Math.floor(Math.sqrt(prevXp) / 2);

    if (currentLevel > prevLevel) {
        createFloatingText(this.scene, impactX, impactY - 20, 'BOMB MASTERY UP!', '#ffff00');
        SoundManager.play(this.scene, 'powerup_collect'); // Reuse sound
    }

    // --- SPLASH DAMAGE LOGIC ---
    const range = this.scene.playerStats.bombRange || 1;
    const explosionRadius = 20 + (range * 12);
    const scale = explosionRadius / 16; // Base 32px / 2 = 16px radius for scale 1.

    // Visual Explosion
    ExplosionEffect(this.scene, impactX, impactY, scale);

    const baseDamage = this.scene.playerStats.damage || 1;

    // Identify Targets
    // We use a simple distance check against all active enemies.
    const targets = this.scene.enemies.getChildren().filter(target => {
        if (!target.active) return false;
        const dist = Phaser.Math.Distance.Between(impactX, impactY, target.x, target.y);
        return dist <= explosionRadius;
    });

    // Apply Damage
    targets.forEach(target => {
        this.applyDamage(target, baseDamage);
    });
  }

  /**
   * Applies damage to a specific enemy, handling bonuses and death logic.
   */
  applyDamage(enemy, baseDamage) {
    if (!enemy.active) return;

    // Bestiary Bonus
    const enemyType = enemy.id || enemy.texture.key; // Prefer ID
    const kills = (this.scene.bestiaryData && this.scene.bestiaryData[enemyType]) || 0;

    let bonus = 0;
    if (kills >= 5000) bonus = 0.15;
    else if (kills >= 1000) bonus = 0.10;
    else if (kills >= 100) bonus = 0.05;

    let damage = baseDamage;
    if (bonus > 0) {
        damage = Math.ceil(damage * (1 + bonus));
    }

    enemy.hp -= damage;

    if (enemy.isBoss) {
        this.events.emit('update-boss-health', {
            health: Math.max(0, enemy.hp),
            maxHealth: enemy.maxHp
        });
    }

    // Show Critical Hit if bonus applies? Or just normal text.
    const color = bonus > 0 ? '#ff00ff' : '#ff4d4d'; // Purple for knowledge bonus
    createFloatingText(this.scene, enemy.x, enemy.y, `-${damage}`, color);

    SoundManager.play(this.scene, 'hit_enemy');

    // ⚪ HIT FLASH
    enemy.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (enemy.active) enemy.clearTint();
    });

    if (enemy.hp <= 0) {
      // 🧃 JUICE: Hit Stop & Shake
      this.scene.cameras.main.shake(50, 0.005);
      if (this.scene.physics.world.isPaused === false) {
          this.scene.physics.pause();
          this.scene.time.delayedCall(50, () => {
              if (this.scene && !this.scene.gamePaused) {
                  this.scene.physics.resume();
              }
          });
      }

      // ✨ DEATH PARTICLES (Digital Disintegration)
      if (this.scene.textures.exists('particle_pixel')) {
        const particles = this.scene.add.particles(
          enemy.x,
          enemy.y,
          'particle_pixel',
          {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 2, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            emitting: false,
          }
        );
        particles.explode(15);

        this.scene.time.delayedCall(700, () => particles.destroy());
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
      createFloatingText(
        this.scene,
        enemy.x,
        enemy.y - 20,
        `+${coinsGained} G`,
        '#ffd700'
      );

      // Update HUD to show SESSION LOOT (The "At Risk" Amount)
      this.events.emit('update-bcoin', { balance: this.scene.sessionLoot.coins });

      // Bestiary Collection (Session + Persistent)
      const type = enemy.id || enemy.texture.key;

      // Session (For Victory Display)
      if (!this.scene.sessionBestiary) this.scene.sessionBestiary = {};
      this.scene.sessionBestiary[type] = (this.scene.sessionBestiary[type] || 0) + 1;

      // Persistent (Immediate) - Task Force Requirement
      playerStateService.incrementBestiaryKill(type);

      // Floating Text Feedback
      createFloatingText(this.scene, enemy.x, enemy.y - 40, 'Bestiary +1', '#00ffff');

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
    player.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => {
      if (player.active) player.clearTint();
    });
    this.scene.cameras.main.shake(200, 0.02);

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
