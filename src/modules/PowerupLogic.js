import SoundManager from '../utils/sound.js';
import { createFloatingText } from './FloatingText.js';

export default class PowerupLogic {
  constructor(scene) {
    this.scene = scene;
    if (!this.scene.activePowerups) {
      this.scene.activePowerups = {};
    }
    this.activePowerups = this.scene.activePowerups;

    this.powerupConfig = {
      rapid_fire: { name: 'Rapid Fire' },
      multi_shot: { name: 'Multi-Shot' },
      power_bomb: { name: 'Power Bomb' },
      mega_bomb: { name: 'Mega Bomb' },
      energy_shield: { name: 'Energy Shield' },
    };
    this.powerupKeys = Object.keys(this.powerupConfig);
  }

  spawn(x, y) {
    if (Phaser.Math.Between(1, 100) <= 12) {
      const key =
        this.powerupKeys[Phaser.Math.Between(0, this.powerupKeys.length - 1)];
      const powerup = this.scene.powerups.create(x, y, key);
      if (powerup) {
        powerup.setVelocityY(80);
        powerup.setDisplaySize(30, 30);

        // 💫 LOOT POP (Juice)
        // 1. Pop Up & Bounce
        this.scene.tweens.add({
          targets: powerup,
          y: y - 40,
          duration: 300,
          ease: 'Back.out',
          onComplete: () => {
            this.scene.tweens.add({
              targets: powerup,
              y: y,
              duration: 500,
              ease: 'Bounce.out',
              onComplete: () => {
                // 2. Start Float Loop
                this.scene.tweens.add({
                  targets: powerup,
                  y: y - 5,
                  duration: 1000,
                  yoyo: true,
                  repeat: -1,
                  ease: 'Sine.easeInOut',
                });
              },
            });
          },
        });

        // 3. Pulse Scale Loop (Simultaneous)
        this.scene.tweens.add({
          targets: powerup,
          scaleX: powerup.scaleX * 1.2,
          scaleY: powerup.scaleY * 1.2,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      } else {
        console.warn(
          `[PowerupLogic] Falha ao criar powerup com a chave: ${key}`
        );
      }
    }
  }

  collect(player, powerup) {
    const id = powerup?.texture?.key;

    if (!id || !this.powerupKeys.includes(id)) {
      console.warn('[PowerupLogic] Power-up com ID/textura inválida:', powerup);
      powerup?.destroy();
      return;
    }

    // ✨ PICKUP FX
    const buffName = this.powerupConfig[id]?.name || 'BUFF';
    createFloatingText(
      this.scene,
      player.x,
      player.y - 40,
      `+${buffName}`,
      '#00ffff'
    );

    if (this.scene.neonBurst) {
      this.scene.neonBurst.explode(player.x, player.y, 10);
    }

    powerup.destroy();
    SoundManager.play(this.scene, 'powerup_collect');

    let currentEffectDuration = 10000; // Buffs duram 10s

    if (this.activePowerups[id] && this.activePowerups[id].event) {
      this.activePowerups[id].event.remove(false);
    }

    if (
      !this.activePowerups[id] ||
      typeof this.activePowerups[id].time !== 'number'
    ) {
      this.activePowerups[id] = { time: 0 };
      this.applyEffect(id);
      this.activePowerups[id].time = currentEffectDuration;
    } else {
      this.activePowerups[id].time += currentEffectDuration;
      if (id === 'power_bomb' || id === 'energy_shield') {
        this.applyEffect(id);
      }
    }

    this.scene.hud?.showPowerup?.(id, this.activePowerups[id].time / 1000);

    this.activePowerups[id].event = this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const entry = this.activePowerups[id];
        if (!entry || typeof entry.time !== 'number') {
          if (this.activePowerups[id] && this.activePowerups[id].event) {
            this.activePowerups[id].event.remove(false);
          }
          return;
        }
        entry.time -= 1000;
        if (entry.time <= 0) {
          this.removeEffect(id);
          if (this.activePowerups[id] && this.activePowerups[id].event) {
            this.activePowerups[id].event.remove(false);
          }
          delete this.activePowerups[id];
          this.scene.hud?.removePowerup?.(id);
          SoundManager.play(this.scene, 'powerup_expire');
        } else {
          this.scene.hud?.showPowerup?.(id, entry.time / 1000);
        }
      },
    });
  }

  applyEffect(id) {
    const stats = this.scene.playerStats;
    if (!stats) {
      console.error('[PowerupLogic] playerStats não encontrado na cena!');
      return;
    }

    console.log(`[VCL-09] PowerupLogic: Applying effect for power-up: ${id}`);
    switch (id) {
      case 'rapid_fire':
        stats.fireRate = Math.max(100, stats.fireRate - 100);
        this._refreshBombTimer();
        break;
      case 'multi_shot':
        stats.multiShot = Math.min((stats.multiShot || 0) + 1, 3);
        break;
      case 'power_bomb':
        stats.damage = (stats.damage || 1) + 1;
        break;
      case 'mega_bomb':
        stats.bombSize = (stats.bombSize || 1) * 1.5;
        break;
      case 'energy_shield':
        stats.hp = Math.min(stats.maxHp, stats.hp + 50); // Heal for 50 HP
        this.scene.events.emit('update-health', {
          health: stats.hp,
          maxHealth: stats.maxHp,
        });
        break;
      default:
        console.warn(
          `[PowerupLogic] Tipo de power-up desconhecido ao aplicar: ${id}`
        );
    }
    this.scene.hud?.updateHUD?.();
  }

  removeEffect(id) {
    const stats = this.scene.playerStats;
    if (!stats) {
      console.error(
        '[PowerupLogic] playerStats não encontrado na cena ao remover efeito!'
      );
      return;
    }
    const DEFAULT_BOMB_SIZE = this.scene.DEFAULT_STATS?.bombSize || 1;

    console.log(`[PowerupLogic] Removendo efeito para: ${id}`);
    switch (id) {
      case 'rapid_fire':
        stats.fireRate += 100;
        this._refreshBombTimer();
        break;
      case 'multi_shot':
        stats.multiShot = Math.max(0, (stats.multiShot || 0) - 1);
        break;
      case 'power_bomb':
        stats.damage = Math.max(1, (stats.damage || 1) - 1);
        break;
      case 'mega_bomb':
        stats.bombSize = Math.max(
          DEFAULT_BOMB_SIZE,
          (stats.bombSize || DEFAULT_BOMB_SIZE) / 1.5
        );
        break;
      // 'energy_shield' is an instant effect and has no removal logic.
      default:
        console.warn(
          `[PowerupLogic] Tipo de power-up desconhecido ao remover: ${id}`
        );
    }
    this.scene.hud?.updateHUD?.();
  }

  _refreshBombTimer() {
    if (this.scene.bombTimer) {
      this.scene.bombTimer.remove(false);
    }
    if (
      this.scene.playerStats &&
      typeof this.scene.playerStats.fireRate === 'number'
    ) {
      // Adicionado check
      this.scene.bombTimer = this.scene.time.addEvent({
        delay: this.scene.playerStats.fireRate,
        loop: true,
        callback: () => {
          if (
            this.scene &&
            typeof this.scene.fireBomb === 'function' &&
            this.scene.player?.active
          ) {
            // Adicionado this.scene.player?.active
            this.scene.fireBomb();
          }
        },
      });
    } else {
      console.warn(
        '[PowerupLogic] fireRate inválido ou playerStats não definido ao tentar refreshBombTimer.'
      );
    }
  }
}
