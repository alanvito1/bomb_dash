import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import { ethers } from 'ethers';

const BCOIN_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; // From .env
const SPENDER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // TournamentController address
const BCOIN_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)"
];

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
        if (this.playerStats.coins < cost) {
            SoundManager.play(this, 'error');
            this.tweens.add({ targets: button, x: centerX - 5, duration: 50, yoyo: true, repeat: 2, onComplete: () => button.setX(centerX) });
            return;
        }

        try {
            SoundManager.play(this, 'click');

            // 1. Connect to wallet and contract
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);

            // 2. Request approval for the transaction
            const costInWei = ethers.parseUnits(cost.toString(), 18);
            const tx = await bcoinContract.approve(SPENDER_ADDRESS, costInWei);

            // Optional: Show a "waiting for confirmation" message
            button.setText('Confirming...');
            await tx.wait(); // Wait for the transaction to be mined

            // 3. On success, update stats and save to backend
            btn.effect();
            this.playerStats.coins -= cost;
            await api.savePlayerStats(this.playerStats);

            SoundManager.play(this, 'upgrade');
            this.refreshUI();

        } catch (error) {
            console.error('Upgrade failed:', error);
            SoundManager.play(this, 'error');
            // Optional: show an error message to the user
            this.refreshUI(); // Refresh to restore button text
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

    const userFromServer = this.registry.get('loggedInUser') || {};

    // The server is now the single source of truth for player stats.
    const finalStats = {
      ...defaultStats,
      ...userFromServer
    };

    return finalStats;
  }
}