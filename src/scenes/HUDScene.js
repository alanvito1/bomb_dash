import LanguageManager from '../utils/LanguageManager.js';
import { getExperienceForLevel } from '../utils/rpg.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

export default class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene', active: false });

        // UI Elements
        this.healthText = null;
        this.healthBar = null;
        this.xpText = null;
        this.xpBar = null;
        this.levelText = null;
        this.waveText = null;
        this.bcoinText = null;
        this.buffText = null;
    }

    create() {
        this.createHUD();
        this.setupEventListeners();
    }

    createHUD() {
        const margin = 15;
        const barWidth = 180;
        const barHeight = 16;
        const textStyle = { fontFamily: '"Press Start 2P"', fontSize: '14px' };
        const valueStyle = { ...textStyle, fontSize: '12px', fill: '#ffffff' };

        // --- Left Side (Player Stats) ---
        // Health
        this.add.text(margin, margin, LanguageManager.get('hud_hp'), { ...textStyle, fill: '#ff4d4d' });
        this.healthBar = this.add.graphics();
        this.healthText = this.add.text(margin + 40, margin + 20, '', valueStyle);

        // XP Bar
        this.levelText = this.add.text(margin, margin + 45, `Lvl: 1`, { ...textStyle, fill: '#00ff00' });
        this.xpBar = this.add.graphics();
        this.xpText = this.add.text(margin + 40, margin + 65, '', valueStyle);

        // --- Right Side (Currency & Buffs) ---
        this.bcoinText = this.add.text(this.scale.width - margin, margin, '', { ...textStyle, fill: '#ffd700', align: 'right' }).setOrigin(1, 0);
        this.buffText = this.add.text(this.scale.width - margin, margin + 30, '', { ...textStyle, fontSize: '12px', fill: '#00ffff', align: 'right' }).setOrigin(1, 0);

        // --- Center (Wave Info) ---
        this.waveText = this.add.text(this.scale.width / 2, margin, '', { ...textStyle, fill: '#ffffff', align: 'center' }).setOrigin(0.5, 0);

        // Initial population
        this.updateHealth({ health: 0, maxHealth: 0 });
        this.updateXP({ accountLevel: 1, accountXP: 0 });
    }

    setupEventListeners() {
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.on('update-health', this.updateHealth, this);
            gameScene.events.on('update-xp', this.updateXP, this);
            gameScene.events.on('update-wave', this.updateWave, this);
        }
        GameEventEmitter.on('bcoin-balance-update', this.handleBalanceUpdate, this);
    }

    updateHealth({ health, maxHealth }) {
        const barWidth = 180;
        const barHeight = 16;
        const barX = 100;
        const barY = 15;

        this.healthText.setText(`${health} / ${maxHealth}`);

        const healthPercentage = maxHealth > 0 ? Phaser.Math.Clamp(health / maxHealth, 0, 1) : 0;
        this.healthBar.clear();
        this.healthBar.fillStyle(0x000000, 0.5);
        this.healthBar.fillRect(barX, barY, barWidth, barHeight);
        this.healthBar.fillStyle(0xff4d4d);
        this.healthBar.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
    }

    updateXP({ accountLevel, accountXP }) {
        const barWidth = 180;
        const barHeight = 16;
        const barX = 100;
        const barY = 60;

        this.levelText.setText(`Lvl: ${accountLevel}`);

        const xpForCurrentLevel = getExperienceForLevel(accountLevel);
        const xpForNextLevel = getExperienceForLevel(accountLevel + 1);
        const xpEarnedInLevel = accountXP - xpForCurrentLevel;
        const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

        this.xpText.setText(`${xpEarnedInLevel} / ${xpNeededForLevel}`);

        const xpPercentage = xpNeededForLevel > 0 ? Phaser.Math.Clamp(xpEarnedInLevel / xpNeededForLevel, 0, 1) : 0;
        this.xpBar.clear();
        this.xpBar.fillStyle(0x000000, 0.5);
        this.xpBar.fillRect(barX, barY, barWidth, barHeight);
        this.xpBar.fillStyle(0x00ff00);
        this.xpBar.fillRect(barX, barY, barWidth * xpPercentage, barHeight);
    }

    updateWave({ world, phase, isBoss }) {
        const waveCounter = isBoss ? "BOSS" : `${phase}/7`;
        this.waveText.setText(`World ${world} | Wave ${waveCounter}`);
    }

    handleBalanceUpdate({ balance, error }) {
        if (error) {
            this.bcoinText.setText(LanguageManager.get('hud_bcoin_error'));
        } else {
            const formattedBalance = parseFloat(balance).toFixed(2);
            this.bcoinText.setText(`$BCOIN: ${formattedBalance}`);
        }
    }

    shutdown() {
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            gameScene.events.off('update-health', this.updateHealth, this);
            gameScene.events.off('update-xp', this.updateXP, this);
            gameScene.events.off('update-wave', this.updateWave, this);
        }
        GameEventEmitter.off('bcoin-balance-update', this.handleBalanceUpdate, this);
    }
}