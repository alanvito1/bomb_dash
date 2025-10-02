import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';

async function saveUpgradesToLocalStorageAndServer(sceneContext, stats) {
  // Always save to localStorage as a backup
  localStorage.setItem('playerStats', JSON.stringify(stats));
  console.log('[ShopScene] Stats saved to localStorage.');

  try {
    const result = await api.savePlayerStats(stats);
    if (result.success) {
      console.log('[ShopScene] Stats successfully saved to server.');
      // Optional: Update registry with the confirmed state from server if needed
      const loggedInUser = sceneContext.registry.get('loggedInUser');
      if (loggedInUser) {
          const updatedUser = { ...loggedInUser, ...stats };
          sceneContext.registry.set('loggedInUser', updatedUser);
      }
    } else {
      console.warn('[ShopScene] Failed to save stats to server:', result.message);
    }
  } catch (error) {
     console.error('[ShopScene] Error saving stats to server:', error);
  }
}

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    this.playerStats = this.initializeStats();

    this.add.text(centerX, 40, LanguageManager.get(this, 'shop_title'), {
      fontSize: '28px',
      fill: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // 1.4: Display coins from the synchronized playerStats
    this.coinsText = this.add.text(centerX, 80, LanguageManager.get(this, 'shop_coins', { coins: Math.floor(this.playerStats.coins) }), {
      fontSize: '18px',
      fill: '#ffffff'
    }).setOrigin(0.5);

    const stats = [
      () => LanguageManager.get(this, 'shop_stat_damage', { value: this.playerStats.damage }),
      () => LanguageManager.get(this, 'shop_stat_speed', { value: this.playerStats.speed }),
      () => LanguageManager.get(this, 'shop_stat_extra_lives', { value: this.playerStats.extraLives }),
      () => LanguageManager.get(this, 'shop_stat_fire_rate', { value: this.playerStats.fireRate }),
      () => LanguageManager.get(this, 'shop_stat_bomb_size', { value: this.playerStats.bombSize }),
      () => LanguageManager.get(this, 'shop_stat_multi_shot', { value: this.playerStats.multiShot })
    ];

    this.statTexts = stats.map((textFunc, i) => {
        return this.add.text(centerX, 110 + i * 20, textFunc(), {
            fontSize: '16px',
            fill: '#cccccc',
            fontFamily: 'monospace'
        }).setOrigin(0.5);
    });


    const buttons = [
      {
        label: () => LanguageManager.get(this, 'shop_upgrade_damage', { cost: 50 + (this.playerStats.damage - 1) * 20 }),
        cost: () => 50 + (this.playerStats.damage - 1) * 20,
        effect: () => this.playerStats.damage++
      },
      {
        label: () => LanguageManager.get(this, 'shop_upgrade_speed', { cost: 40 + ((this.playerStats.speed - 200) / 10) * 15 }),
        cost: () => 40 + ((this.playerStats.speed - 200) / 10) * 15,
        effect: () => this.playerStats.speed += 10
      },
      {
        label: () => LanguageManager.get(this, 'shop_upgrade_extra_life', { cost: 30 + this.playerStats.extraLives * 30 }),
        cost: () => 30 + this.playerStats.extraLives * 30,
        effect: () => this.playerStats.extraLives++
      },
      {
        label: () => LanguageManager.get(this, 'shop_upgrade_fire_rate', { cost: 60 + ((600 - this.playerStats.fireRate) / 50) * 25 }),
        cost: () => 60 + ((600 - this.playerStats.fireRate) / 50) * 25,
        effect: () => this.playerStats.fireRate = Math.max(100, this.playerStats.fireRate - 50)
      },
      {
        label: () => LanguageManager.get(this, 'shop_upgrade_bomb_size', { cost: 500 + (this.playerStats.bombSize - 1) * 100 }),
        cost: () => 500 + (this.playerStats.bombSize - 1) * 100,
        effect: () => { if (this.playerStats.bombSize < 3) this.playerStats.bombSize++; }
      },
      {
        label: () => LanguageManager.get(this, 'shop_upgrade_multi_shot', { cost: 500 + this.playerStats.multiShot * 200 }),
        cost: () => 500 + this.playerStats.multiShot * 200,
        effect: () => { if (this.playerStats.multiShot < 5) this.playerStats.multiShot++; }
      }
    ];

    this.upgradeButtons = buttons.map((btn, i) => {
      const y = 280 + i * 40;
      const button = this.add.text(centerX, y, btn.label(), {
        fontSize: '16px',
        fill: '#ffff00',
        fontFamily: 'monospace'
      }).setOrigin(0.5).setInteractive();

      button.on('pointerdown', async () => {
        const cost = btn.cost();
        if (this.playerStats.coins >= cost) {
          btn.effect();
          this.playerStats.coins -= cost;
          await saveUpgradesToLocalStorageAndServer(this, this.playerStats);
          SoundManager.play(this, 'upgrade');
          this.refreshUI(); // Refresh UI instead of restarting scene
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
      return { button, labelFunc: btn.label };
    });

    this.add.text(centerX, 550, LanguageManager.get(this, 'shop_back_to_menu'), {
      fontSize: '18px',
      fill: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('MenuScene');
    });
  }

  refreshUI() {
    this.coinsText.setText(LanguageManager.get(this, 'shop_coins', { coins: Math.floor(this.playerStats.coins) }));

    const stats = [
      () => LanguageManager.get(this, 'shop_stat_damage', { value: this.playerStats.damage }),
      () => LanguageManager.get(this, 'shop_stat_speed', { value: this.playerStats.speed }),
      () => LanguageManager.get(this, 'shop_stat_extra_lives', { value: this.playerStats.extraLives }),
      () => LanguageManager.get(this, 'shop_stat_fire_rate', { value: this.playerStats.fireRate }),
      () => LanguageManager.get(this, 'shop_stat_bomb_size', { value: this.playerStats.bombSize }),
      () => LanguageManager.get(this, 'shop_stat_multi_shot', { value: this.playerStats.multiShot })
    ];

    this.statTexts.forEach((text, i) => {
        text.setText(stats[i]());
    });

    this.upgradeButtons.forEach(btn => {
        btn.button.setText(btn.labelFunc());
    });
  }

  initializeStats() {
    const defaultStats = {
      damage: 1, speed: 200, extraLives: 1,
      fireRate: 600, bombSize: 1, multiShot: 0, coins: 0
    };

    const localStats = JSON.parse(localStorage.getItem('playerStats')) || {};
    const userFromServer = this.registry.get('loggedInUser') || {};

    // Combine stats: start with defaults, layer locally saved progress,
    // then overwrite with authoritative data from the server (especially coins).
    const finalStats = {
      ...defaultStats,
      ...localStats,
      ...userFromServer // Server data (like coins) takes precedence
    };

    return finalStats;
  }
}