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
        const barWidth = 180;
        const barHeight = 16;
        const margin = 15;

        // Health Bar
        this.add.text(margin, margin, LanguageManager.get('hud_hp'), { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#ff4d4d' });
        this.healthBar = this.add.graphics();
        this.updateHealth({ health: this.playerHealth, maxHealth: this.playerMaxHealth });

        // Account XP Bar
        this.accountLevelText = this.add.text(margin, margin + 30, ``, { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#00ff00' });
        this.accountXpBar = this.add.graphics();

        // BCOIN Balance
        this.bcoinText = this.add.text(this.scale.width - margin, margin, LanguageManager.get('hud_bcoin_loading'), {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffd700',
            align: 'right'
        }).setOrigin(1, 0);

        // Global Buff Display
        this.buffText = this.add.text(this.scale.width - margin, margin + 30, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#00ffff', // Cyan color for buffs
            align: 'right'
        }).setOrigin(1, 0);
    }

    updateHealth({ health, maxHealth }) {
        this.playerHealth = health;
        this.playerMaxHealth = maxHealth;
        const barWidth = 180;
        const barHeight = 16;
        const margin = 15;
        const barX = 60;

        this.healthBar.clear();
        // Background
        this.healthBar.fillStyle(0x000000, 0.5);
        this.healthBar.fillRect(barX, margin, barWidth, barHeight);

        // Foreground
        const healthPercentage = maxHealth > 0 ? Phaser.Math.Clamp(health / maxHealth, 0, 1) : 0;
        this.healthBar.fillStyle(0xff4d4d);
        this.healthBar.fillRect(barX, margin, barWidth * healthPercentage, barHeight);
    }

    updateXP(data) {
        const barWidth = 180;
        const barHeight = 16;
        const margin = 15;
        const barX = 60;

        // Handle Account Level and XP
        if (data.accountXP !== undefined && data.accountLevel !== undefined) {
            this.accountXP = data.accountXP;
            this.accountLevel = data.accountLevel;
            this.accountLevelText.setText(`Lvl: ${this.accountLevel}`);

            const xpForCurrentLevel = getExperienceForLevel(data.accountLevel);
            const xpForNextLevel = getExperienceForLevel(data.accountLevel + 1);
            const xpEarnedInCurrentLevel = this.accountXP - xpForCurrentLevel;
            const xpNeededForLevelUp = xpForNextLevel - xpForCurrentLevel;
            const accXpPercentage = xpNeededForLevelUp > 0 ? Phaser.Math.Clamp(xpEarnedInCurrentLevel / xpNeededForLevelUp, 0, 1) : 0;

            const barY = margin + 30;
            this.accountXpBar.clear();
            // Background
            this.accountXpBar.fillStyle(0x000000, 0.5);
            this.accountXpBar.fillRect(barX, barY, barWidth, barHeight);
            // Foreground
            this.accountXpBar.fillStyle(0x00ff00);
            this.accountXpBar.fillRect(barX, barY, barWidth * accXpPercentage, barHeight);
        }
        // Removed Hero XP bar logic for a cleaner HUD
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