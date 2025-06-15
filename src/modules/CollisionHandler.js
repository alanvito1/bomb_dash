import ExplosionEffect from './ExplosionEffect.js';
import SoundManager from '../utils/sound.js';

export default class CollisionHandler {
  constructor(scene, hud, powerupLogic) {
    this.scene = scene;
    this.hud = hud;
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
    this.scene.hud.updateHUD();
  }

  hitEnemy(bomb, enemy) {
    if (!enemy.active) return;
    bomb.destroy();

    const damage = this.scene.playerStats?.damage ?? 1; // Manter ?? 1 para damage, pois é de playerStats
    enemy.hp = enemy.hp - damage; // Fallback ?? 1 removido para enemy.hp

    SoundManager.play(this.scene, 'hit_enemy');

    if (enemy.hp <= 0) {
      ExplosionEffect(this.scene, enemy.x, enemy.y);
      SoundManager.play(this.scene, enemy.isBoss ? 'boss_death' : 'enemy_death');

      this.scene.score += enemy.isBoss ? 50 : 10;
      this.scene.coinsEarned += enemy.isBoss ? 5 : 1;

      this.scene.enemiesKilled++;
      this.scene.hud.updateHUD();

      if (enemy.isBoss) {
        this.scene.bossDefeated = true;
        this.scene.bossSpawned = false;
        this.scene.physics.pause();
        this.scene.bombTimer.paused = true;
        this.scene.showNextStageDialog();
      }

      enemy.destroy();
      this.powerupLogic.spawn(enemy.x, enemy.y);
    }
  }

  onHit(player, enemy) {
    const stats = this.scene.playerStats;
    stats.extraLives = Math.max(0, stats.extraLives - 1);

    SoundManager.play(this.scene, 'player_hit');
    this.scene.hud.updateHUD();

    if (stats.extraLives > 0) {
      enemy.destroy();
    } else {
      // localStorage.setItem('playerStats', JSON.stringify(stats)); // Removido
      SoundManager.play(this.scene, 'gameover'); // Som de gameover ainda é relevante aqui
      // A chamada para handleGameOver() já está implícita ao perder todas as vidas,
      // e GameScene.handleGameOver() centralizará o salvamento e a transição de cena.
      // this.scene.scene.start('GameOverScene', ...); // Será chamado por handleGameOver
      this.scene.handleGameOver(); // Chama o método centralizado em GameScene
    }
  }
}
