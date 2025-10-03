import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import { ethers } from 'ethers';

// These should ideally be loaded from a config file or environment variables
const BCOIN_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; // From old file, assuming it's correct for BSC Testnet
const SPENDER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // TournamentController address

const BCOIN_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
];

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
        this.hero = null;
        this.bcoinBalance = ethers.toBigInt(0);
    }

    init(data) {
        // The selected hero object is passed when this scene is started
        this.hero = data.hero || this.registry.get('selectedHero');
        if (!this.hero) {
            console.error("ShopScene started without a hero. Returning to menu.");
            this.scene.start('MenuScene');
        }
    }

    create() {
        const centerX = this.cameras.main.centerX;

        this.add.text(centerX, 40, LanguageManager.get(this, 'shop_title'), {
            fontSize: '28px',
            fill: '#00ffff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.coinsText = this.add.text(centerX, 80, LanguageManager.get(this, 'shop_coins', { coins: '...' }), {
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.updateBcoinBalance(); // Initial balance fetch

        this.createStatDisplays(centerX);
        this.createUpgradeButtons(centerX);

        this.add.text(centerX, 550, LanguageManager.get(this, 'shop_back_to_menu'), {
            fontSize: '18px', fill: '#00ffff', fontFamily: 'monospace'
        }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
            SoundManager.play(this, 'click');
            this.scene.start('MenuScene');
        });

        this.refreshUI();
    }

    createStatDisplays(centerX) {
        const statGetters = [
            () => LanguageManager.get(this, 'shop_stat_damage', { value: this.hero.damage }),
            () => LanguageManager.get(this, 'shop_stat_speed', { value: this.hero.speed }),
            () => LanguageManager.get(this, 'shop_stat_extra_lives', { value: this.hero.extraLives }),
            () => LanguageManager.get(this, 'shop_stat_fire_rate', { value: this.hero.fireRate }),
            () => LanguageManager.get(this, 'shop_stat_bomb_size', { value: this.hero.bombSize }),
            () => LanguageManager.get(this, 'shop_stat_multi_shot', { value: this.hero.multiShot })
        ];

        this.statTexts = statGetters.map((textFunc, i) => {
            return this.add.text(centerX, 110 + i * 20, textFunc(), {
                fontSize: '16px', fill: '#cccccc', fontFamily: 'monospace'
            }).setOrigin(0.5);
        });
    }

    createUpgradeButtons(centerX) {
        const buttonsConfig = [
            { type: 'damage', cost: (stat) => 50 + (stat.damage - 1) * 20 },
            { type: 'speed', cost: (stat) => 40 + ((stat.speed - 200) / 10) * 15 },
            { type: 'extraLives', cost: (stat) => 30 + stat.extraLives * 30 },
            { type: 'fireRate', cost: (stat) => 60 + ((600 - stat.fireRate) / 50) * 25 },
            { type: 'bombSize', cost: (stat) => 500 + (stat.bombSize - 1) * 100 },
            { type: 'multiShot', cost: (stat) => 500 + stat.multiShot * 200 }
        ];

        this.upgradeButtons = buttonsConfig.map((btnConfig, i) => {
            const y = 280 + i * 40;
            const cost = btnConfig.cost(this.hero);
            const label = () => LanguageManager.get(this, `shop_upgrade_${btnConfig.type}`, { cost });

            const button = this.add.text(centerX, y, label(), {
                fontSize: '16px', fill: '#ffff00', fontFamily: 'monospace'
            }).setOrigin(0.5).setInteractive();

            button.on('pointerdown', async () => {
                const currentCost = btnConfig.cost(this.hero);
                const costInWei = ethers.parseUnits(currentCost.toString(), 18);

                if (this.bcoinBalance < costInWei) {
                    SoundManager.play(this, 'error');
                    this.showToast(LanguageManager.get(this, 'shop_insufficient_bcoin'));
                    this.tweens.add({ targets: button, x: centerX - 5, duration: 50, yoyo: true, repeat: 2 });
                    return;
                }

                try {
                    SoundManager.play(this, 'click');
                    button.setText(LanguageManager.get(this, 'shop_approving')).disableInteractive();

                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);

                    // 1. Approve the spender contract
                    const approveTx = await bcoinContract.approve(SPENDER_ADDRESS, costInWei);
                    await approveTx.wait();

                    // 2. Call the backend to process the upgrade
                    button.setText(LanguageManager.get(this, 'shop_processing'));
                    const result = await api.purchaseHeroUpgrade(this.hero.id, btnConfig.type, currentCost);

                    if (result.success) {
                        SoundManager.play(this, 'upgrade');
                        this.showToast(LanguageManager.get(this, 'shop_upgrade_success'));
                        // Update local hero data with the response from the server
                        this.hero = result.hero;
                        // Fetch the new on-chain balance
                        await this.updateBcoinBalance();
                        this.refreshUI();
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    console.error('Upgrade failed:', error);
                    SoundManager.play(this, 'error');
                    this.showToast(error.message || LanguageManager.get(this, 'shop_upgrade_failed'));
                    this.refreshUI(); // Restore button text and interactivity
                }
            });

            return { button, config: btnConfig, labelFunc: label };
        });
    }

    async updateBcoinBalance() {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);
            this.bcoinBalance = await bcoinContract.balanceOf(await signer.getAddress());
            const balanceFormatted = ethers.formatUnits(this.bcoinBalance, 18);
            this.coinsText.setText(LanguageManager.get(this, 'shop_coins', { coins: parseFloat(balanceFormatted).toFixed(2) }));
        } catch (error) {
            console.error("Failed to fetch BCOIN balance:", error);
            this.coinsText.setText(LanguageManager.get(this, 'shop_coins', { coins: 'Error' }));
        }
    }

    refreshUI() {
        if (!this.hero) return;
        // Refresh stat texts
        this.statTexts[0].setText(LanguageManager.get(this, 'shop_stat_damage', { value: this.hero.damage }));
        this.statTexts[1].setText(LanguageManager.get(this, 'shop_stat_speed', { value: this.hero.speed }));
        this.statTexts[2].setText(LanguageManager.get(this, 'shop_stat_extra_lives', { value: this.hero.extraLives }));
        this.statTexts[3].setText(LanguageManager.get(this, 'shop_stat_fire_rate', { value: this.hero.fireRate }));
        this.statTexts[4].setText(LanguageManager.get(this, 'shop_stat_bomb_size', { value: this.hero.bombSize }));
        this.statTexts[5].setText(LanguageManager.get(this, 'shop_stat_multi_shot', { value: this.hero.multiShot }));

        // Refresh button labels and interactivity
        this.upgradeButtons.forEach(btn => {
            const newCost = btn.config.cost(this.hero);
            const newLabel = LanguageManager.get(this, `shop_upgrade_${btn.config.type}`, { cost: newCost });
            btn.button.setText(newLabel).setInteractive();
        });
    }

    showToast(message) {
        const toast = this.add.text(this.cameras.main.centerX, this.cameras.main.height - 50, message, {
            fontSize: '16px', fill: '#ff0000', backgroundColor: '#000000a0', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: toast,
            alpha: 0,
            y: this.cameras.main.height - 100,
            duration: 3000,
            ease: 'Power2',
            onComplete: () => toast.destroy()
        });
    }
}