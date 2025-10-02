import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';

export default class ProfileScene extends Phaser.Scene {
  constructor() {
    super('ProfileScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.createTitle(centerX);
    this.createStatDisplays(centerX);
    this.createLevelUpButton(centerX, centerY + 150);
    this.createBackButton(centerX, centerY + 220);

    this.refreshStats(); // Initial population of stats
  }

  createTitle(centerX) {
    this.add.text(centerX, 50, LanguageManager.get(this, 'stats_title'), {
      fontSize: '28px',
      fill: '#00ffff',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5);
  }

  createStatDisplays(centerX) {
    const labels = [
      LanguageManager.get(this, 'stats_damage'), LanguageManager.get(this, 'stats_speed'),
      LanguageManager.get(this, 'stats_extra_lives'), LanguageManager.get(this, 'stats_fire_rate'),
      LanguageManager.get(this, 'stats_bomb_size'), LanguageManager.get(this, 'stats_multi_shot'),
      LanguageManager.get(this, 'stats_coins')
    ];

    this.statValues = [];
    labels.forEach((label, i) => {
      this.add.text(centerX - 10, 120 + i * 35, `${label}:`, {
        fontSize: '20px', fill: '#ffffff', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2
      }).setOrigin(1, 0.5);

      const valueText = this.add.text(centerX + 10, 120 + i * 35, '', {
        fontSize: '20px', fill: '#ffff00', fontFamily: 'monospace', stroke: '#000', strokeThickness: 2
      }).setOrigin(0, 0.5);
      this.statValues.push(valueText);
    });
  }

  refreshStats() {
    const defaultStats = {
      damage: 1, speed: 200, extraLives: 1,
      fireRate: 600, bombSize: 1, multiShot: 0, coins: 0, level: 1
    };

    const localStats = JSON.parse(localStorage.getItem('playerStats')) || {};
    const userFromServer = this.registry.get('loggedInUser') || {};

    const finalStats = { ...defaultStats, ...localStats, ...userFromServer };

    const values = [
      finalStats.damage, finalStats.speed, finalStats.extraLives,
      finalStats.fireRate, finalStats.bombSize, finalStats.multiShot,
      Math.floor(finalStats.coins)
    ];

    this.statValues.forEach((text, i) => text.setText(values[i]));

    // Update player level display separately if needed
    if (this.levelText) {
        this.levelText.setText(`Nível: ${finalStats.level}`);
    } else {
        this.levelText = this.add.text(this.cameras.main.centerX, 90, `Nível: ${finalStats.level}`, {
            fontSize: '22px', fill: '#FFD700', fontFamily: 'monospace'
        }).setOrigin(0.5);
    }
  }

  createLevelUpButton(centerX, y) {
    const levelUpButton = this.add.text(centerX, y, 'Subir de Nível (1 BCOIN)', {
        fontSize: '18px', fill: '#00ff00', backgroundColor: '#00000099',
        padding: { x: 10, y: 5 }, fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.messageText = this.add.text(centerX, y + 40, '', {
        fontSize: '16px', fill: '#ff0000', fontFamily: 'monospace'
    }).setOrigin(0.5);

    levelUpButton.on('pointerdown', async () => {
        try {
            SoundManager.play(this, 'click');
            const result = await api.levelUp();
            if (result.success) {
                this.messageText.setStyle({ fill: '#00ff00' }).setText(result.message);

                // Update registry and refresh UI
                const user = this.registry.get('loggedInUser');
                this.registry.set('loggedInUser', { ...user, level: result.newLevel, coins: result.newCoinBalance });
                this.refreshStats();
            } else {
                this.messageText.setStyle({ fill: '#ff0000' }).setText(result.message);
            }
        } catch (error) {
            this.messageText.setStyle({ fill: '#ff0000' }).setText('Erro de comunicação.');
            console.error('Level up failed:', error);
        }
    });
  }

  createBackButton(centerX, y) {
    const backBtn = this.add.text(centerX, y, LanguageManager.get(this, 'shop_back_to_menu'), {
      fontSize: '20px', fill: '#00ffff', backgroundColor: '#111',
      padding: { x: 10, y: 5 }, fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('MenuScene');
    });
  }
}
