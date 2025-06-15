import { getUpgrades, saveUpgrades } from '../systems/upgrades.js';
import SoundManager from '../utils/sound.js';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  preload() {
    SoundManager.loadAll(this);
  }

  create() {
    const centerX = this.cameras.main.centerX;
    this.playerStats = this.initializeStats();

    this.add.text(centerX, 40, '🛒 ATTRIBUTE SHOP', {
      fontSize: '28px',
      fill: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    const coinsText = this.add.text(centerX, 80, `💰 Coins: ${this.playerStats.coins}`, {
      fontSize: '18px',
      fill: '#ffffff'
    }).setOrigin(0.5);

    const stats = [
      `• Damage: ${this.playerStats.damage}`,
      `• Speed: ${this.playerStats.speed}`,
      `• Extra Lives: ${this.playerStats.extraLives}`,
      `• Fire Rate: ${this.playerStats.fireRate}ms`,
      `• Bomb Size: ${this.playerStats.bombSize}`,
      `• Multi-Shot Level: ${this.playerStats.multiShot}`
    ];

    stats.forEach((text, i) => {
      this.add.text(centerX, 110 + i * 20, text, {
        fontSize: '16px',
        fill: '#cccccc',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
    });

    const buttons = [
      {
        label: () => `[ +1 Damage - ${50 + (this.playerStats.damage - 1) * 20} coins ]`,
        cost: () => 50 + (this.playerStats.damage - 1) * 20,
        effect: () => this.playerStats.damage++
      },
      {
        label: () => `[ +10 Speed - ${40 + ((this.playerStats.speed - 200) / 10) * 15} coins ]`,
        cost: () => 40 + ((this.playerStats.speed - 200) / 10) * 15,
        effect: () => this.playerStats.speed += 10
      },
      {
        label: () => `[ +1 Extra Life - ${30 + this.playerStats.extraLives * 30} coins ]`,
        cost: () => 30 + this.playerStats.extraLives * 30,
        effect: () => this.playerStats.extraLives++
      },
      {
        label: () => `[ -50ms Fire Rate - ${60 + ((600 - this.playerStats.fireRate) / 50) * 25} coins ]`,
        cost: () => 60 + ((600 - this.playerStats.fireRate) / 50) * 25,
        effect: () => this.playerStats.fireRate = Math.max(100, this.playerStats.fireRate - 50)
      },
      {
        label: () => `[ +1 Bomb Size - ${500 + (this.playerStats.bombSize - 1) * 100} coins ]`,
        cost: () => 500 + (this.playerStats.bombSize - 1) * 100,
        effect: () => {
          if (this.playerStats.bombSize < 3) this.playerStats.bombSize++;
        }
      },
      {
        label: () => `[ +1 Multi-Shot - ${500 + this.playerStats.multiShot * 200} coins ]`,
        cost: () => 500 + this.playerStats.multiShot * 200,
        effect: () => {
          if (this.playerStats.multiShot < 5) this.playerStats.multiShot++;
        }
      }
    ];

    buttons.forEach((btn, i) => {
      const y = 280 + i * 40;
      const button = this.add.text(centerX, y, btn.label(), {
        fontSize: '16px',
        fill: '#ffff00',
        fontFamily: 'monospace'
      }).setOrigin(0.5).setInteractive();

      button.on('pointerdown', () => {
        const cost = btn.cost();
        if (this.playerStats.coins >= cost) {
          btn.effect();
          this.playerStats.coins -= cost;
          saveUpgrades(this.playerStats);

          SoundManager.play(this, 'upgrade');

          this.time.delayedCall(50, () => this.scene.restart());
        } else {
          SoundManager.play(this, 'error');
          this.tweens.add({
            targets: button,
            x: centerX - 5,
            duration: 50,
            yoyo: true,
            repeat: 2,
            onComplete: () => button.setX(centerX)
          });
        }
      });
    });

    this.add.text(centerX, 550, '[ BACK TO MENU ]', {
      fontSize: '18px',
      fill: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
      SoundManager.play(this, 'click');
      saveUpgrades(this.playerStats);
      this.scene.start('MenuScene');
    });

    this.events.on('shutdown', () => {
      saveUpgrades(this.playerStats);
    });
  }

  initializeStats() {
    const defaultStats = {
      damage: 1,
      speed: 200,
      extraLives: 1,
      fireRate: 600,
      bombSize: 1,
      multiShot: 0,
      coins: 0
    };
    const saved = getUpgrades();
    return { ...defaultStats, ...(saved || {}) };
  }
}