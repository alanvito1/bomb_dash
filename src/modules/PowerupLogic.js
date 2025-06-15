import SoundManager from '../utils/sound.js';

export default class PowerupLogic {
  constructor(scene) {
    this.scene = scene;
    this.activePowerups = scene.activePowerups || {};
  }

  spawn(x, y) {
    if (Phaser.Math.Between(1, 100) <= 12) {
      const type = Phaser.Math.Between(1, 5);
      const key = `powerup${type}`;
      const powerup = this.scene.powerups.create(x, y, key);
      powerup.setVelocityY(80);
      powerup.setDisplaySize(30, 30);
    }
  }

  collect(player, powerup) {
    const id = powerup?.texture?.key;

    if (!id || typeof id !== 'string') {
      console.warn('[PowerupLogic] Power-up inválido:', powerup);
      return;
    }

    powerup.destroy();
    SoundManager.play(this.scene, 'powerup_collect'); // 🔊 Coleta de powerup

    const duration = 10000;
    const existing = this.activePowerups[id];
    const isValid = existing && typeof existing === 'object' && typeof existing.time === 'number';

    if (!isValid) {
      this.activePowerups[id] = { time: duration };
      this.applyEffect(id);
    } else {
      this.activePowerups[id].time += duration;
    }

    this.scene.hud?.showPowerup?.(id, duration / 1000);

    this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const entry = this.activePowerups[id];
        if (!entry || typeof entry.time !== 'number') return;

        entry.time -= 1000;

        if (entry.time <= 0) {
          this.removeEffect(id);
          delete this.activePowerups[id];
          this.scene.hud?.removePowerup?.(id);
          SoundManager.play(this.scene, 'powerup_expire'); // 🔊 Efeito expirado
        } else {
          this.scene.hud?.showPowerup?.(id, entry.time / 1000);
        }

        this.scene.updatePowerupDisplay?.();
      }
    });

    this.scene.updatePowerupDisplay?.();
  }

  applyEffect(id) {
    const stats = this.scene.playerStats;

    switch (id) {
      case 'powerup1':
        stats.fireRate = Math.max(100, stats.fireRate - 100);
        this._refreshBombTimer();
        break;

      case 'powerup2':
        stats.multiShot = Math.min(stats.multiShot + 1, 3);
        break;

      case 'powerup3':
        stats.extraLives++;
        break;

      case 'powerup4':
        stats.damage += 1;
        break;

      case 'powerup5':
        stats.bombSize = (stats.bombSize || 1) * 3;
        break;

      default:
        console.warn(`[PowerupLogic] Tipo de power-up desconhecido: ${id}`);
    }

    this.scene.hud?.updateHUD?.();
  }

  removeEffect(id) {
    const stats = this.scene.playerStats;

    switch (id) {
      case 'powerup1':
        stats.fireRate += 100;
        this._refreshBombTimer();
        break;

      case 'powerup2':
        stats.multiShot = Math.max(0, stats.multiShot - 1);
        break;

      case 'powerup4':
        stats.damage = Math.max(1, stats.damage - 1);
        break;

      case 'powerup5':
        stats.bombSize = Math.max(1, (stats.bombSize || 1) / 3);
        break;
    }

    this.scene.hud?.updateHUD?.();
  }

  _refreshBombTimer() {
    this.scene.bombTimer?.remove(false);
    this.scene.bombTimer = this.scene.time.addEvent({
      delay: this.scene.playerStats.fireRate,
      loop: true,
      callback: () => this.scene.fireBomb()
    });
  }
}
