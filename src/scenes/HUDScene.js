import LanguageManager from '../utils/LanguageManager.js';

export default class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene', active: false });

        // Player Stats
        this.playerHealth = 100;
        this.playerMaxHealth = 100;
        this.accountXP = 0;
        this.accountXPForNextLevel = 100;
        this.heroXP = 0;
        this.heroXPForNextLevel = 100;
        this.bcoinBalance = 0;

        // UI Elements
        this.healthBar = null;
        this.accountXpBar = null;
        this.heroXpBar = null;
        this.bcoinText = null;
    }

    create() {
        // Listen for events from the GameScene
        const gameScene = this.scene.get('GameScene');
        gameScene.events.on('update-health', this.updateHealth, this);
        gameScene.events.on('update-xp', this.updateXP, this);
        gameScene.events.on('update-bcoin', this.updateBCoin, this);

        this.createHUD();
    }

    createHUD() {
        // Health Bar
        this.add.text(10, 10, 'HP', { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#ff0000' });
        this.healthBar = this.add.graphics();
        this.updateHealth({ health: this.playerHealth, maxHealth: this.playerMaxHealth }); // Initial draw

        // Account XP Bar
        this.add.text(10, 30, 'ACC XP', { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#00ff00' });
        this.accountXpBar = this.add.graphics();
        this.updateXP({ accountXP: this.accountXP, accountXPForNextLevel: this.accountXPForNextLevel }); // Initial draw

        // Hero XP Bar
        this.add.text(10, 50, 'HERO XP', { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#0000ff' });
        this.heroXpBar = this.add.graphics();
        this.updateXP({ heroXP: this.heroXP, heroXPForNextLevel: this.heroXPForNextLevel }); // Initial draw

        // BCOIN Balance
        this.bcoinText = this.add.text(this.scale.width - 10, 10, `BCOIN: ${this.bcoinBalance}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffd700',
            align: 'right'
        }).setOrigin(1, 0);
    }

    updateHealth({ health, maxHealth }) {
        this.playerHealth = health;
        this.playerMaxHealth = maxHealth;

        this.healthBar.clear();
        this.healthBar.fillStyle(0x808080); // Background
        this.healthBar.fillRect(100, 12, 200, 12);

        const healthPercentage = Math.max(0, this.playerHealth / this.playerMaxHealth);
        this.healthBar.fillStyle(0xff0000); // Foreground
        this.healthBar.fillRect(100, 12, 200 * healthPercentage, 12);
    }

    updateXP(data) {
        if (data.accountXP !== undefined) {
            this.accountXP = data.accountXP;
            this.accountXPForNextLevel = data.accountXPForNextLevel;

            this.accountXpBar.clear();
            this.accountXpBar.fillStyle(0x808080);
            this.accountXpBar.fillRect(100, 32, 200, 12);

            const accXpPercentage = this.accountXPForNextLevel > 0 ? (this.accountXP / this.accountXPForNextLevel) : 0;
            this.accountXpBar.fillStyle(0x00ff00);
            this.accountXpBar.fillRect(100, 32, 200 * accXpPercentage, 12);
        }

        if (data.heroXP !== undefined) {
            this.heroXP = data.heroXP;
            this.heroXPForNextLevel = data.heroXPForNextLevel;

            this.heroXpBar.clear();
            this.heroXpBar.fillStyle(0x808080);
            this.heroXpBar.fillRect(100, 52, 200, 12);

            const heroXpPercentage = this.heroXPForNextLevel > 0 ? (this.heroXP / this.heroXPForNextLevel) : 0;
            this.heroXpBar.fillStyle(0x0000ff);
            this.heroXpBar.fillRect(100, 52, 200 * heroXpPercentage, 12);
        }
    }

    updateBCoin({ balance }) {
        this.bcoinBalance = balance;
        this.bcoinText.setText(`BCOIN: ${this.bcoinBalance}`);
    }
}