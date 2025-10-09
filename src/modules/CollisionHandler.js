import ExplosionEffect from './ExplosionEffect.js';
import SoundManager from '../utils/sound.js';
import { createFloatingText } from './FloatingText.js';
import { showNextStageDialog as StageDialog } from './NextStageDialog.js';

export default class CollisionHandler {
  // SIF 21.3: The HUD is now driven by events from the scene
  constructor(scene, events, powerupLogic) {
    this.scene = scene;
    this.events = events; // The scene's event emitter
    this.powerupLogic = powerupLogic;
  }

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

  handlePowerup(player, powerup) {
    this.powerupLogic.collect(player, powerup);
    SoundManager.play(this.scene, 'powerup_collect');
  }

  hitEnemy(bomb, enemy) {
    if (!enemy.active) return;
    bomb.destroy();

    const damage = this.scene.playerStats?.damage ?? 1;
    enemy.hp = enemy.hp - damage;
    createFloatingText(this.scene, enemy.x, enemy.y, `-${damage}`, '#ff4d4d');

    SoundManager.play(this.scene, 'hit_enemy');

    if (enemy.hp <= 0) {
      ExplosionEffect(this.scene, enemy.x, enemy.y);
      SoundManager.play(this.scene, enemy.isBoss ? 'boss_death' : 'enemy_death');

      // SIF 21.3: Update stats and emit events for the HUD
      // HS1-03: Reduce XP gain by ~95%
      const xpGained = enemy.isBoss ? 3 : 1;
      const coinsGained = enemy.isBoss ? 5 : 1;

      // This was the missing piece. The score was never being incremented.
      this.scene.score += xpGained;

      const stats = this.scene.playerStats;
      stats.account_xp += xpGained;
      stats.hero_xp += xpGained;
      stats.bcoin += coinsGained;
      createFloatingText(this.scene, enemy.x, enemy.y - 20, `+${xpGained} XP`, '#ffd700');

      this.events.emit('update-xp', {
          accountXP: stats.account_xp,
          accountXPForNextLevel: stats.account_xp_for_next_level,
          heroXP: stats.hero_xp,
          heroXPForNextLevel: stats.hero_xp_for_next_level,
      });

      this.events.emit('update-bcoin', {
          balance: stats.bcoin,
      });

      this.scene.enemiesKilled++;

      if (enemy.isBoss) {
        this.scene.bossDefeated = true;
        this.scene.bossSpawned = false;

        // HS1-02: The soft-lock was caused because the bombTimer was paused here,
        // but never resumed. The new `prepareNextStage` method in GameScene
        // now handles resuming the physics and the timer. We pass it as a
        // callback to the dialog.
        this.scene.physics.pause();
        // CQ-02: Use the state machine to prevent shooting during the dialog
        this.scene.setPlayerState('CANNOT_SHOOT', 'Boss defeated, dialog showing');
        // Correctly call the imported StageDialog function.
        StageDialog(this.scene, () => this.scene.prepareNextStage());
      }

      enemy.destroy();
      this.powerupLogic.spawn(enemy.x, enemy.y);
    }
  }

  onHit(player, enemy) {
    if (this.scene.gamePaused || this.scene.transitioning) return;

    // CQ-03: Do not destroy the enemy on collision. Only damage the player.
    if (!enemy.isBoss) {
      // The enemy.destroy() call was removed from here.
    }

    const stats = this.scene.playerStats;
    const damageTaken = 100; // Damage from direct collision
    stats.hp -= damageTaken;

    this.events.emit('update-health', { health: stats.hp, maxHealth: stats.maxHp });
    SoundManager.play(this.scene, 'player_hit');

    if (stats.hp <= 0) {
        stats.extraLives--;
        if (stats.extraLives >= 0) {
            stats.hp = stats.maxHp;
            this.events.emit('update-health', { health: stats.hp, maxHealth: stats.maxHp });
        } else {
            stats.hp = 0;
            this.events.emit('update-health', { health: 0, maxHealth: stats.maxHp });
            this.scene.handleGameOver();
        }
    }
  }
}