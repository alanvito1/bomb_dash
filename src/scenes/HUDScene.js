import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import { getExperienceForLevel } from '../utils/rpg.js';
import bcoinService from '../web3/bcoin-service.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';


export default class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene', active: false });

        // Player Stats
        this.playerHealth = 100;
        this.playerMaxHealth = 100;
        this.accountXP = 0;
        this.accountLevel = 1;
        this.heroXP = 0;
        this.heroLevel = 1;

        // UI Elements
        this.healthBar = null;
        this.accountXpBar = null;
        this.accountLevelText = null;
        this.heroXpBar = null;
        this.heroLevelText = null; // To display the hero's level
        this.bcoinText = null;
        this.buffText = null;
        this.balanceRefreshTimer = null;
        this.altarStatusTimer = null;
    }

    create() {
        // Listen for events from the GameScene
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.on('update-health', this.updateHealth, this);
            gameScene.events.on('update-xp', this.updateXP, this);
        }

        // Listen for balance updates from the BcoinService
        GameEventEmitter.on('bcoin-balance-update', this.handleBalanceUpdate, this);

        this.createHUD();

        // Fetch initial data from registry to populate HUD immediately
        const selectedHero = this.registry.get('selectedHero');
        const userData = this.registry.get('user');

        const initialXPData = {};
        if (selectedHero) {
            initialXPData.heroXP = selectedHero.xp;
            initialXPData.heroLevel = selectedHero.level;
        }
        if (userData) {
            initialXPData.accountXP = userData.account_xp;
            initialXPData.accountLevel = userData.account_level;
        }
        this.updateXP(initialXPData);

        // Request initial balance and altar status
        bcoinService.updateBalance(); // Force update on HUD creation
        this.fetchAltarStatus();

        // Periodically refresh the Altar status
        this.altarStatusTimer = this.time.addEvent({
            delay: 60000, callback: this.fetchAltarStatus, callbackScope: this, loop: true
        });
    }

    shutdown() {
        // Clean up timers and event listeners when the scene is shut down
        GameEventEmitter.off('bcoin-balance-update', this.handleBalanceUpdate, this);
        if (this.altarStatusTimer) this.altarStatusTimer.remove();
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
             gameScene.events.off('update-health', this.updateHealth, this);
             gameScene.events.off('update-xp', this.updateXP, this);
        }
    }

    createHUD() {
        const iconStyle = { x: 25, y: 20 };
        const barStyle = { x: 55, y: 18, width: 200, height: 14 };
        const levelTextStyle = { x: barStyle.x + barStyle.width + 15, y: 18 };

        // Health Bar
        this.add.image(iconStyle.x, iconStyle.y, 'rapid_fire').setDisplaySize(24, 24); // Heart Icon Placeholder
        this.healthBar = this.add.graphics();
        this.updateHealth({ health: this.playerHealth, maxHealth: this.playerMaxHealth });

        // Account XP Bar
        this.add.image(iconStyle.x, iconStyle.y + 25, 'multi_shot').setDisplaySize(24, 24); // Star Icon Placeholder
        this.accountXpBar = this.add.graphics();
        this.accountLevelText = this.add.text(levelTextStyle.x, levelTextStyle.y + 25, `Lvl ${this.accountLevel}`, { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#00ff00' });

        // Hero XP Bar
        this.add.image(iconStyle.x, iconStyle.y + 50, 'power_bomb').setDisplaySize(24, 24); // Hero Icon Placeholder
        this.heroXpBar = this.add.graphics();
        this.heroLevelText = this.add.text(levelTextStyle.x, levelTextStyle.y + 50, `Lvl ${this.heroLevel}`, { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#00ffff' });

        // BCOIN Balance
        this.bcoinText = this.add.text(this.scale.width - 10, 10, LanguageManager.get('hud_bcoin_loading'), {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffd700',
            align: 'right'
        }).setOrigin(1, 0);

        // Global Buff Display
        this.buffText = this.add.text(this.scale.width - 10, 30, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#00ffff', // Cyan color for buffs
            align: 'right'
        }).setOrigin(1, 0);
    }

    updateHealth({ health, maxHealth }) {
        this.playerHealth = health;
        this.playerMaxHealth = maxHealth;
        const barStyle = { x: 55, y: 18, width: 200, height: 14 };

        this.healthBar.clear();
        this.healthBar.fillStyle(0x333333); // Background
        this.healthBar.fillRect(barStyle.x, barStyle.y, barStyle.width, barStyle.height);

        const healthPercentage = Math.max(0, this.playerHealth / this.playerMaxHealth);
        this.healthBar.fillStyle(0xff0000); // Foreground
        this.healthBar.fillRect(barStyle.x, barStyle.y, barStyle.width * healthPercentage, barStyle.height);
    }

    updateXP(data) {
        const barStyle = { x: 55, y: 18, width: 200, height: 14 };
        // Handle Account Level and XP
        if (data.accountXP !== undefined && data.accountLevel !== undefined) {
            this.accountXP = data.accountXP;
            this.accountLevel = data.accountLevel;
            this.accountLevelText.setText(`Lvl ${data.accountLevel}`);

            const xpForCurrentLevel = getExperienceForLevel(data.accountLevel);
            const xpForNextLevel = getExperienceForLevel(data.accountLevel + 1);
            const xpEarnedInCurrentLevel = this.accountXP - xpForCurrentLevel;
            const xpNeededForLevelUp = xpForNextLevel - xpForCurrentLevel;
            const accXpPercentage = xpNeededForLevelUp > 0 ? Phaser.Math.Clamp(xpEarnedInCurrentLevel / xpNeededForLevelUp, 0, 1) : 0;

            this.accountXpBar.clear();
            this.accountXpBar.fillStyle(0x333333);
            this.accountXpBar.fillRect(barStyle.x, barStyle.y + 25, barStyle.width, barStyle.height);
            this.accountXpBar.fillStyle(0x00ff00);
            this.accountXpBar.fillRect(barStyle.x, barStyle.y + 25, barStyle.width * accXpPercentage, barStyle.height);
        }

        // Handle Hero Level and XP
        if (data.heroXP !== undefined && data.heroLevel !== undefined) {
            this.heroXP = data.heroXP;
            this.heroLevel = data.heroLevel;
            this.heroLevelText.setText(`Lvl ${this.heroLevel}`);

            const xpForCurrentLevel = getExperienceForLevel(this.heroLevel);
            const xpForNextLevel = getExperienceForLevel(this.heroLevel + 1);
            const xpEarnedInCurrentLevel = this.heroXP - xpForCurrentLevel;
            const xpNeededForLevelUp = xpForNextLevel - xpForCurrentLevel;
            const heroXpPercentage = xpNeededForLevelUp > 0 ? Phaser.Math.Clamp(xpEarnedInCurrentLevel / xpNeededForLevelUp, 0, 1) : 0;

            this.heroXpBar.clear();
            this.heroXpBar.fillStyle(0x333333);
            this.heroXpBar.fillRect(barStyle.x, barStyle.y + 50, barStyle.width, barStyle.height);
            this.heroXpBar.fillStyle(0x00ffff);
            this.heroXpBar.fillRect(barStyle.x, barStyle.y + 50, barStyle.width * heroXpPercentage, barStyle.height);
        }
    }

    handleBalanceUpdate({ balance, error }) {
        if (error) {
            console.error(`[HUDScene] Received balance update error: ${error}`);
            this.bcoinText.setText(LanguageManager.get('hud_bcoin_error'));
            return;
        }
        const balanceFormatted = parseFloat(balance).toFixed(2);
        this.bcoinText.setText(LanguageManager.get('menu_bcoin_balance', { balance: balanceFormatted }));
    }

    async fetchAltarStatus() {
        try {
            const response = await api.fetch('/altar/status', {}, false);
            if (response.success && response.status) {
                this.updateBuffDisplay(response.status);
            }
        } catch (error) {
            console.error("HUD: Failed to fetch altar status:", error);
            this.buffText.setText(''); // Clear on error
        }
    }

    updateBuffDisplay(status) {
        if (status.active_buff_type && status.buff_expires_at) {
            const expiration = new Date(status.buff_expires_at).getTime();
            const now = Date.now();

            if (expiration > now) {
                const remaining = expiration - now;
                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const buffName = status.active_buff_type.replace('_', ' ');

                const line1 = LanguageManager.get('hud_buff', { buff: buffName });
                const line2 = LanguageManager.get('hud_buff_time_left', { hours, minutes });

                this.buffText.setText(`${line1}\n${line2}`);
            } else {
                this.buffText.setText(''); // Buff expired
            }
        } else {
            this.buffText.setText(''); // No active buff
        }
    }
}