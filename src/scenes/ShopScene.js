import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import bcoinService from '../web3/bcoin-service.js';
import tournamentService from '../web3/tournament-service.js';
import contracts from '../config/contracts.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

export default class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
        this.hero = null;
        this.bcoinBalance = '0.00';
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

        // --- Guard Clause ---
        if (!this.hero) {
            this.add.text(centerX, centerY, LanguageManager.get('shop_hero_not_found'), {
                fontFamily: '"Press Start 2P"',
                fontSize: '18px',
                color: '#ff0000',
                align: 'center',
                wordWrap: { width: this.scale.width - 60 }
            }).setOrigin(0.5);

            this.time.delayedCall(3000, () => this.scene.start('MenuScene'));
            return; // Stop execution to prevent crash
        }

        // --- Visual Polish: Standard Font Styles ---
        const titleStyle = { fontSize: '24px', fill: '#FFD700', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 };
        const textStyle = { fontSize: '14px', fill: '#ffffff', fontFamily: '"Press Start 2P"' };
        const statStyle = { ...textStyle, fill: '#cccccc', align: 'left', wordWrap: { width: this.scale.width - 100 } };
        const buttonStyle = { fontSize: '14px', fill: '#00ffff', fontFamily: '"Press Start 2P"', backgroundColor: '#00000099', padding: { x: 8, y: 4 } };

        this.add.text(centerX, 60, LanguageManager.get('shop_title'), titleStyle).setOrigin(0.5);

        this.coinsText = this.add.text(centerX, 100, LanguageManager.get('shop_coins', { coins: '...' }), { ...textStyle, fill: '#FFD700' }).setOrigin(0.5);

        // Use the service to get the initial balance and listen for updates
        this.updateBcoinBalanceDisplay();
        GameEventEmitter.on('bcoin-balance-update', this.handleBalanceUpdate, this);

        this.createStatDisplays(centerX, 140, statStyle);
        this.createUpgradeButtons(centerX, 300, buttonStyle);
        this.createBackButton(centerX, this.scale.height - 60, buttonStyle);

        this.refreshUI();
    }

    shutdown() {
        GameEventEmitter.off('bcoin-balance-update', this.handleBalanceUpdate, this);
    }

    createStatDisplays(x, y, style) {
        const statGetters = [
            () => LanguageManager.get('shop_stat_damage', { value: this.hero.damage }),
            () => LanguageManager.get('shop_stat_speed', { value: this.hero.speed }),
            () => LanguageManager.get('shop_stat_fire_rate', { value: this.hero.fireRate })
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
            const label = () => LanguageManager.get(`shop_upgrade_${btnConfig.type}`, { cost });

            const button = this.add.text(x, buttonY, label(), style).setOrigin(0.5).setInteractive({ useHandCursor: true });

            button.on('pointerdown', async () => {
                const currentCost = btnConfig.cost(this.hero);

                if (parseFloat(this.bcoinBalance) < currentCost) {
                    SoundManager.play(this, 'error');
                    this.showToast(LanguageManager.get('shop_insufficient_bcoin'));
                    this.tweens.add({ targets: button, x: x - 5, duration: 50, yoyo: true, repeat: 2 });
                    return;
                }

                try {
                    SoundManager.play(this, 'click');
                    button.setText(LanguageManager.get('shop_approving', {}, 'Approving...')).disableInteractive();

                    // Step 1: Approve BCOIN spending
                    const approveTx = await bcoinService.approve(contracts.tournamentController.address, currentCost);
                    if (approveTx) {
                        button.setText(LanguageManager.get('shop_waiting_approval', {}, 'Confirming...'));
                        await approveTx.wait();
                    }

                    // Step 2: Pay the upgrade fee to the contract
                    button.setText(LanguageManager.get('shop_paying', {}, 'Paying...'));
                    const payTx = await tournamentService.payUpgradeFee(currentCost);

                    // Step 3: Wait for the payment transaction to be mined
                    button.setText(LanguageManager.get('shop_verifying', {}, 'Verifying...'));
                    await payTx.wait();

                    // Step 4: Notify backend to verify and persist the upgrade
                    const result = await api.updateUserStats(this.hero.id, btnConfig.type, payTx.hash);

                    if (result.success) {
                        SoundManager.play(this, 'upgrade');
                        this.showToast(LanguageManager.get('shop_upgrade_success'), true);
                        this.hero = result.hero;

                        GameEventEmitter.emit('bcoin-balance-changed');
                        this.refreshUI();
                    } else {
                        throw new Error(result.message || LanguageManager.get('shop_verification_failed', {}, 'Backend verification failed.'));
                    }
                } catch (error) {
                    console.error('Upgrade process failed:', error);
                    const reason = error.reason || error.data?.message || error.message;
                    this.showToast(reason || LanguageManager.get('shop_upgrade_failed'));
                    this.refreshUI(); // Refresh UI to re-enable the button
                }
            });

            // Visual Polish: Hover Effect
            button.on('pointerover', () => button.setStyle({ fill: '#ffffff' }));
            button.on('pointerout', () => button.setStyle({ fill: '#00ffff' }));

            return { button, config: btnConfig };
        });
    }

    createBackButton(x, y, style) {
        const backButton = this.add.text(x, y, LanguageManager.get('shop_back_to_menu'), style)
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

    handleBalanceUpdate({ balance, error }) {
        if (error) {
            this.coinsText.setText(LanguageManager.get('shop_coins', { coins: 'Error' }));
            return;
        }
        this.bcoinBalance = balance;
        const balanceFormatted = parseFloat(balance).toFixed(2);
        this.coinsText.setText(LanguageManager.get('shop_coins', { coins: balanceFormatted }));
    }

    async updateBcoinBalanceDisplay() {
        const { balance, error } = await bcoinService.getBalance();
        this.handleBalanceUpdate({ balance, error });
    }

    refreshUI() {
        if (!this.hero) return;
        this.statTexts[0].setText(LanguageManager.get('shop_stat_damage', { value: this.hero.damage }));
        this.statTexts[1].setText(LanguageManager.get('shop_stat_speed', { value: this.hero.speed }));
        this.statTexts[2].setText(LanguageManager.get('shop_stat_fire_rate', { value: this.hero.fireRate }));

        this.upgradeButtons.forEach(btn => {
            const newCost = btn.config.cost(this.hero);
            const newLabel = LanguageManager.get(`shop_upgrade_${btn.config.type}`, { cost: newCost });
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