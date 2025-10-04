import LanguageManager from '../utils/LanguageManager.js';
import { ethers } from 'ethers';
import api from '../api.js';
import { getExperienceForLevel } from '../utils/rpg.js';

// Constants for BCOIN contract interaction
const BCOIN_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const BCOIN_ABI = ["function balanceOf(address account) view returns (uint256)"];


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

        // Listen for a global event to force-refresh the balance
        this.game.events.on('bcoin-balance-changed', this.updateBcoinBalance, this);

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

        this.updateBcoinBalance(); // Initial fetch
        this.fetchAltarStatus(); // Initial fetch for altar status

        // Periodically refresh the BCOIN balance
        this.balanceRefreshTimer = this.time.addEvent({
            delay: 30000, callback: this.updateBcoinBalance, callbackScope: this, loop: true
        });

        // Periodically refresh the Altar status
        this.altarStatusTimer = this.time.addEvent({
            delay: 60000, callback: this.fetchAltarStatus, callbackScope: this, loop: true
        });
    }

    shutdown() {
        // Clean up timers and event listeners when the scene is shut down
        if (this.balanceRefreshTimer) this.balanceRefreshTimer.remove();
        if (this.altarStatusTimer) this.altarStatusTimer.remove();
        this.game.events.off('bcoin-balance-changed', this.updateBcoinBalance, this);
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
             gameScene.events.off('update-health', this.updateHealth, this);
             gameScene.events.off('update-xp', this.updateXP, this);
        }
    }

    createHUD() {
        // Health Bar
        this.add.text(10, 10, LanguageManager.get('hud_hp'), { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#ff0000' });
        this.healthBar = this.add.graphics();
        this.updateHealth({ health: this.playerHealth, maxHealth: this.playerMaxHealth });

        // Account XP Bar
        this.add.text(10, 30, LanguageManager.get('hud_acc_xp'), { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#00ff00' });
        this.accountXpBar = this.add.graphics();
        this.accountLevelText = this.add.text(310, 30, `Lvl ${this.accountLevel}`, { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#00ff00' });

        // Hero XP Bar
        this.add.text(10, 50, LanguageManager.get('hud_hero_xp'), { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#00ffff' });
        this.heroXpBar = this.add.graphics();
        this.heroLevelText = this.add.text(310, 50, `Lvl ${this.heroLevel}`, { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#00ffff' });

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

        this.healthBar.clear();
        this.healthBar.fillStyle(0x333333); // Background
        this.healthBar.fillRect(100, 12, 200, 12);

        const healthPercentage = Math.max(0, this.playerHealth / this.playerMaxHealth);
        this.healthBar.fillStyle(0xff0000); // Foreground
        this.healthBar.fillRect(100, 12, 200 * healthPercentage, 12);
    }

    updateXP(data) {
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
            this.accountXpBar.fillRect(100, 32, 200, 12);
            this.accountXpBar.fillStyle(0x00ff00);
            this.accountXpBar.fillRect(100, 32, 200 * accXpPercentage, 12);
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
            this.heroXpBar.fillRect(100, 52, 200, 12);
            this.heroXpBar.fillStyle(0x00ffff);
            this.heroXpBar.fillRect(100, 52, 200 * heroXpPercentage, 12);
        }
    }

    updateBCoin({ balance }) {
        this.bcoinBalance = balance;
        this.bcoinText.setText(LanguageManager.get('menu_bcoin_balance', { balance: this.bcoinBalance }));
    }

    async updateBcoinBalance() {
        if (!window.ethereum) {
            this.bcoinText.setText(LanguageManager.get('hud_bcoin_no_wallet'));
            return;
        }
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);
            const balance = await bcoinContract.balanceOf(await signer.getAddress());
            const balanceFormatted = parseFloat(ethers.formatUnits(balance, 18)).toFixed(2);
            this.bcoinText.setText(LanguageManager.get('menu_bcoin_balance', { balance: balanceFormatted }));
        } catch (error) {
            console.error("HUD: Failed to fetch BCOIN balance:", error);
            this.bcoinText.setText(LanguageManager.get('hud_bcoin_error'));
        }
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