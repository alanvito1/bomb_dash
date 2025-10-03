import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import { ethers } from 'ethers';

// These should ideally be loaded from a config file or environment variables
const BCOIN_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
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
        this.hero = data.hero || this.registry.get('selectedHero');
        if (!this.hero) {
            console.error("ShopScene started without a hero. Returning to menu.");
            this.scene.start('MenuScene');
        }
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // --- Visual Polish: Background and Data Window ---
        this.add.image(centerX, centerY, 'menu_bg_vertical').setOrigin(0.5).setDisplaySize(this.scale.width, this.scale.height);
        this.add.graphics().fillStyle(0x000000, 0.8).fillRect(20, 20, this.scale.width - 40, this.scale.height - 40);

        // --- Visual Polish: Standard Font Styles ---
        const titleStyle = { fontSize: '24px', fill: '#FFD700', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 };
        const textStyle = { fontSize: '14px', fill: '#ffffff', fontFamily: '"Press Start 2P"' };
        const statStyle = { ...textStyle, fill: '#cccccc', align: 'left', wordWrap: { width: this.scale.width - 100 } };
        const buttonStyle = { fontSize: '14px', fill: '#00ffff', fontFamily: '"Press Start 2P"', backgroundColor: '#00000099', padding: { x: 8, y: 4 } };

        this.add.text(centerX, 60, LanguageManager.get(this, 'shop_title'), titleStyle).setOrigin(0.5);

        this.coinsText = this.add.text(centerX, 100, LanguageManager.get(this, 'shop_coins', { coins: '...' }), { ...textStyle, fill: '#FFD700' }).setOrigin(0.5);
        this.updateBcoinBalance();

        this.createStatDisplays(centerX, 140, statStyle);
        this.createUpgradeButtons(centerX, 300, buttonStyle);
        this.createBackButton(centerX, this.scale.height - 60, buttonStyle);

        this.refreshUI();
    }

    createStatDisplays(x, y, style) {
        const statGetters = [
            () => LanguageManager.get(this, 'shop_stat_damage', { value: this.hero.damage }),
            () => LanguageManager.get(this, 'shop_stat_speed', { value: this.hero.speed }),
            () => LanguageManager.get(this, 'shop_stat_fire_rate', { value: this.hero.fireRate })
        ];

        this.statTexts = statGetters.map((textFunc, i) => {
            return this.add.text(x, y + i * 25, textFunc(), style).setOrigin(0.5);
        });
    }

    createUpgradeButtons(x, y, style) {
        const buttonsConfig = [
            { type: 'damage', cost: (stat) => 50 + (stat.damage - 1) * 20 },
            { type: 'speed', cost: (stat) => 40 + ((stat.speed - 200) / 10) * 15 },
            { type: 'fireRate', cost: (stat) => 60 + ((600 - stat.fireRate) / 50) * 25 }
        ];

        this.upgradeButtons = buttonsConfig.map((btnConfig, i) => {
            const buttonY = y + i * 50;
            const cost = btnConfig.cost(this.hero);
            const label = () => LanguageManager.get(this, `shop_upgrade_${btnConfig.type}`, { cost });

            const button = this.add.text(x, buttonY, label(), style).setOrigin(0.5).setInteractive({ useHandCursor: true });

            button.on('pointerdown', async () => {
                const currentCost = btnConfig.cost(this.hero);
                const costInWei = ethers.parseUnits(currentCost.toString(), 18);

                if (this.bcoinBalance < costInWei) {
                    SoundManager.play(this, 'error');
                    this.showToast(LanguageManager.get(this, 'shop_insufficient_bcoin'));
                    this.tweens.add({ targets: button, x: x - 5, duration: 50, yoyo: true, repeat: 2 });
                    return;
                }

                try {
                    SoundManager.play(this, 'click');
                    button.setText(LanguageManager.get(this, 'shop_approving')).disableInteractive();

                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);

                    const approveTx = await bcoinContract.approve(SPENDER_ADDRESS, costInWei);
                    await approveTx.wait();

                    button.setText(LanguageManager.get(this, 'shop_processing'));
                    const result = await api.purchaseHeroUpgrade(this.hero.id, btnConfig.type, currentCost);

                    if (result.success) {
                        SoundManager.play(this, 'upgrade');
                        this.showToast(LanguageManager.get(this, 'shop_upgrade_success'), true);
                        this.hero = result.hero;
                        await this.updateBcoinBalance();
                        this.refreshUI();
                    } else {
                        throw new Error(result.message);
                    }
                } catch (error) {
                    console.error('Upgrade failed:', error);
                    SoundManager.play(this, 'error');
                    this.showToast(error.message || LanguageManager.get(this, 'shop_upgrade_failed'));
                    this.refreshUI();
                }
            });

            // Visual Polish: Hover Effect
            button.on('pointerover', () => button.setStyle({ fill: '#ffffff' }));
            button.on('pointerout', () => button.setStyle({ fill: '#00ffff' }));

            return { button, config: btnConfig };
        });
    }

    createBackButton(x, y, style) {
        const backButton = this.add.text(x, y, LanguageManager.get(this, 'shop_back_to_menu'), style)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        backButton.on('pointerdown', () => {
            SoundManager.play(this, 'click');
            this.scene.start('MenuScene');
        });

        // Visual Polish: Hover Effect
        backButton.on('pointerover', () => backButton.setStyle({ fill: '#ffffff' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#00ffff' }));
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
        this.statTexts[0].setText(LanguageManager.get(this, 'shop_stat_damage', { value: this.hero.damage }));
        this.statTexts[1].setText(LanguageManager.get(this, 'shop_stat_speed', { value: this.hero.speed }));
        this.statTexts[2].setText(LanguageManager.get(this, 'shop_stat_fire_rate', { value: this.hero.fireRate }));

        this.upgradeButtons.forEach(btn => {
            const newCost = btn.config.cost(this.hero);
            const newLabel = LanguageManager.get(this, `shop_upgrade_${btn.config.type}`, { cost: newCost });
            btn.button.setText(newLabel).setInteractive();
        });
    }

    showToast(message, isSuccess = false) {
        const toast = this.add.text(this.cameras.main.centerX, this.cameras.main.height - 100, message, {
            fontSize: '14px',
            fill: isSuccess ? '#00ff00' : '#ff0000', // Green for success, red for error
            backgroundColor: '#000000a0',
            padding: { x: 10, y: 5 },
            fontFamily: '"Press Start 2P"'
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: toast,
            alpha: 0,
            y: toast.y - 50,
            duration: 3000,
            ease: 'Power2',
            onComplete: () => toast.destroy()
        });
    }
}