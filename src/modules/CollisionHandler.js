import ExplosionEffect from './ExplosionEffect.js';
import SoundManager from '../utils/sound.js';
import { createFloatingText } from './FloatingText.js';
import { showNextStageDialog as StageDialog } from './NextStageDialog.js';

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
    bomb.destroy();

    const damage = this.scene.playerStats?.damage ?? 1;
    enemy.hp -= damage;
    createFloatingText(this.scene, enemy.x, enemy.y, `-${damage}`, '#ff4d4d');
    SoundManager.play(this.scene, 'hit_enemy');

    // ⚪ HIT FLASH
    enemy.setTint(0xffffff);
    this.scene.time.delayedCall(100, () => {
      if (enemy.active) enemy.clearTint();
    });

    if (enemy.hp <= 0) {
      ExplosionEffect(this.scene, enemy.x, enemy.y);

      // ✨ DEATH PARTICLES (Digital Disintegration)
      if (this.scene.textures.exists('particle_pixel')) {
        // Support both Phaser < 3.60 (Manager) and 3.60+ (Emitter)
        const particles = this.scene.add.particles('particle_pixel');

        if (typeof particles.createEmitter === 'function') {
          // Legacy Phaser
          particles.createEmitter({
            x: enemy.x,
            y: enemy.y,
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 2, end: 0 },
            lifespan: 600,
            quantity: 15,
            blendMode: 'ADD',
          });
        } else {
          // Modern Phaser (3.60+)
          particles.setPosition(enemy.x, enemy.y);
          particles.setConfig({
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 2, end: 0 },
            lifespan: 600,
            blendMode: 'ADD',
            emitting: false,
          });
          particles.explode(15);
        }

        this.scene.time.delayedCall(700, () => particles.destroy());
      }

      SoundManager.play(
        this.scene,
        enemy.isBoss ? 'boss_death' : 'enemy_death'
      );

      const xpGained = enemy.isBoss ? 3 : 1;
      this.scene.score += xpGained;

      const stats = this.scene.playerStats;
      stats.account_xp += xpGained;
      stats.hero_xp += xpGained;
      stats.bcoin += enemy.isBoss ? 5 : 1;
      createFloatingText(
        this.scene,
        enemy.x,
        enemy.y - 20,
        `+${xpGained} XP`,
        '#ffd700'
      );

      this.events.emit('update-xp', {
        /* ... */
      });
      this.events.emit('update-bcoin', { balance: stats.bcoin });

      this.scene.enemiesKilled++;

      if (enemy.isBoss) {
        this.scene.bossDefeated = true;
        this.scene.bossSpawned = false;
        this.scene.physics.pause();
        this.scene.setPlayerState('CANNOT_SHOOT', 'Boss defeated');
        StageDialog(this.scene, () => this.scene.prepareNextStage());
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
