import { CST } from '../CST.js';
import UIHelper from '../utils/UIHelper.js';
import playerStateService from '../services/PlayerStateService.js';
import SoundManager from '../utils/sound.js';
import { createRetroButton } from '../utils/ui.js';

export default class PostMatchScene extends Phaser.Scene {
    constructor() {
        super(CST.SCENES.POST_MATCH);
    }

    create(data) {
        // Data Payload from GameScene
        this.dataPayload = data;

        // Unpack Data
        this.isVictory = data.isVictory;
        this.heroId = data.heroId;
        this.initialState = data.initialState || {};
        this.sessionTraining = data.sessionTraining || {};
        this.sessionLoot = data.sessionLoot || { coins: 0, items: [] };
        this.xpGained = data.xpGained || 0;
        this.wave = data.wave || 1;
        this.timeSurvived = data.timeSurvived || 0;

        // Current State (After Match)
        this.currentAccountLevel = playerStateService.getAccountLevel();
        this.currentAccountXP = playerStateService.getAccountXp();
        this.currentHeroStats = playerStateService.getHeroStats(this.heroId);

        // Visual Setup
        this.cameras.main.setBackgroundColor('#050505');
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // 1. Header (Result)
        this.createHeader(centerX, 80);

        // 2. Summoner Gain (Account XP)
        this.createAccountProgress(centerX, 180);

        // 3. Hero Training (The Grind)
        this.createHeroTraining(centerX, 320);

        // 4. Financial Summary (Loot)
        this.createLootSummary(centerX, 580);

        // 5. Actions
        this.createActionButtons(centerX, 700);

        // 6. Guest Warning
        if (playerStateService.isGuest) {
            this.createGuestWarning(centerX, 760);
        }

        // Audio
        if (this.isVictory) {
            SoundManager.play(this, 'menu_music'); // Victory theme placeholder
        }
    }

    createHeader(x, y) {
        const titleText = this.isVictory ? "VICTORY!" : "GAME OVER";
        const titleColor = this.isVictory ? '#FFD700' : '#FF0000';

        this.add.text(x, y, titleText, {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, fill: true }
        }).setOrigin(0.5);

        // Sub-header: Wave & Time
        const minutes = Math.floor(this.timeSurvived / 60);
        const seconds = Math.floor(this.timeSurvived % 60).toString().padStart(2, '0');

        const statsText = `WAVE ${this.wave} | TIME ${minutes}:${seconds}`;

        this.add.text(x, y + 40, statsText, {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#FFFFFF'
        }).setOrigin(0.5);
    }

    createAccountProgress(x, y) {
        // Container
        const width = 400;
        const height = 80;

        // Label
        this.add.text(x - width/2, y - 20, "SUMMONER LEVEL", {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#00FFFF'
        });

        // Current Level Badge
        const levelText = this.add.text(x + width/2, y - 20, `LVL ${this.currentAccountLevel}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#FFD700'
        }).setOrigin(1, 0);

        // XP Bar Background
        const barW = width;
        const barH = 20;
        const barX = x - width/2;
        const barY = y;

        const bgBar = this.add.rectangle(barX, barY, barW, barH, 0x333333).setOrigin(0);

        // Calculate Progress
        // Needed: XP for Next Level.
        // Logic from Service: 1000 * (1.5 ^ Level)
        const getReqXp = (lvl) => Math.floor(1000 * Math.pow(1.5, lvl));
        const maxXP = getReqXp(this.currentAccountLevel);
        const prevXP = this.initialState.accountXp || 0;
        const currXP = this.currentAccountXP;

        // Visual Ratio
        // Case: Level Up. If currentLevel > initialLevel, we fill bar, then reset.
        // Simplified: Just show current progress %
        const progress = Math.min(1, Math.max(0, currXP / maxXP));

        // Bar Fill (Tween it)
        const fillBar = this.add.rectangle(barX, barY, 0, barH, 0x00FFFF).setOrigin(0);

        this.tweens.add({
            targets: fillBar,
            width: barW * progress,
            duration: 1500,
            ease: 'Cubic.out'
        });

        // XP Text Overlay
        this.add.text(x, y + 10, `${currXP} / ${maxXP} XP`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#000000'
        }).setOrigin(0.5);

        // Level Up Animation
        if (this.currentAccountLevel > (this.initialState.accountLevel || 1)) {
            const levelUpTxt = this.add.text(x, y - 40, "LEVEL UP!", {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                color: '#FFFF00',
                stroke: '#FF5F1F',
                strokeThickness: 4
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: levelUpTxt,
                alpha: 1,
                y: y - 50,
                duration: 500,
                yoyo: true,
                repeat: 3
            });
            SoundManager.play(this, 'level_up');
        }
    }

    createHeroTraining(x, y) {
        // "MANUAL TRAINING" Header
        this.add.text(x, y - 20, "MANUAL TRAINING (MICRO-PROGRESS)", {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#00FF00'
        }).setOrigin(0.5);

        // Panel Background for Stats
        const statsPanel = UIHelper.createPanel(this, 420, 220, 0x111111); // Dark bg
        statsPanel.setPosition(x, y + 100);

        // 4 Attributes: Speed, Power, Range, Fire Rate
        const attributes = [
            { key: 'speed', label: 'SPEED', color: 0x00FFFF },
            { key: 'power', label: 'POWER', color: 0xFF0000 },
            { key: 'range', label: 'RANGE', color: 0x00FF00 },
            { key: 'fireRate', label: 'FIRE RATE', color: 0xFFFF00 }
        ];

        const startY = y + 40;
        const gapY = 45;

        attributes.forEach((attr, index) => {
            const rowY = startY + (index * gapY);
            this.createStatRow(x, rowY, attr);
        });
    }

    createStatRow(x, y, attr) {
        // Init vs Curr Levels
        // Handle nulls safely
        const oldLvl = (this.initialState.heroStats && this.initialState.heroStats.levels)
            ? (this.initialState.heroStats.levels[attr.key] || 0)
            : 0;

        const newLvl = (this.currentHeroStats && this.currentHeroStats.levels)
            ? (this.currentHeroStats.levels[attr.key] || 0)
            : 0;

        // Display: "SPEED: Lv 10.42 -> 10.85"
        const label = this.add.text(x - 180, y, `${attr.label}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: `#${attr.color.toString(16).padStart(6, '0')}`
        }).setOrigin(0, 0.5);

        const valText = this.add.text(x + 180, y, `Lv ${oldLvl.toFixed(2)} -> ${newLvl.toFixed(2)}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            color: '#FFFFFF'
        }).setOrigin(1, 0.5);

        // Micro-Progress Bar (The Decimal Part)
        // 0.42 -> 0.85
        const oldDec = oldLvl % 1;
        const newDec = newLvl % 1;

        // If leveled up whole number (e.g. 0.90 -> 1.10), visually fill to 100 then wrap?
        // Simplified: Just show the *new* decimal progress.
        // Prompt says: "Visual: Se possível, faça uma pequena barra de progresso encher..."

        const barW = 360;
        const barH = 6;
        const barX = x - 180;
        const barY = y + 12;

        // Background
        this.add.rectangle(barX, barY, barW, barH, 0x333333).setOrigin(0);

        // Fill
        const fillW = barW * newDec;
        const fillBar = this.add.rectangle(barX, barY, 0, barH, attr.color).setOrigin(0);

        this.tweens.add({
            targets: fillBar,
            width: fillW,
            duration: 1000,
            delay: 500 + (y * 0.5), // Staggered
            ease: 'Cubic.out'
        });
    }

    createLootSummary(x, y) {
        this.add.text(x, y - 30, "LOOT RECOVERED", {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // Loot Panel
        const panel = UIHelper.createPanel(this, 420, 80, 0x222222);
        panel.setPosition(x, y + 20);

        // 1. BCOINS
        const coinCount = this.sessionLoot.coins || 0;
        // Icon (Text placeholder if asset missing)
        // Check `item_bcoin` exists? GameScene uses it.
        const coinIcon = this.add.image(x - 100, y + 20, 'item_bcoin').setDisplaySize(32, 32);
        this.add.text(x - 60, y + 20, `x${coinCount}`, {
             fontFamily: '"Press Start 2P"',
             fontSize: '14px',
             color: '#FFD700'
        }).setOrigin(0, 0.5);

        // 2. Fragments
        const items = this.sessionLoot.items || [];
        const fragmentCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

        const fragIcon = this.add.image(x + 60, y + 20, 'item_fragment').setDisplaySize(32, 32).setTint(0x00FF00); // Generic Green tint
        this.add.text(x + 100, y + 20, `x${fragmentCount}`, {
             fontFamily: '"Press Start 2P"',
             fontSize: '14px',
             color: '#00FF00'
        }).setOrigin(0, 0.5);

        if (fragmentCount > 0) {
            this.add.text(x + 100, y + 40, "FRAGMENTS", { fontSize: '8px', fontFamily: '"Press Start 2P"' }).setOrigin(0, 0.5);
        }
    }

    createActionButtons(x, y) {
        // Play Again (Highlighted)
        // Using "success" type (Green) for highlight/dopamine or "primary" (Orange)
        // Prompt says "Destacado/Néon"

        const btnPlay = createRetroButton(this, x - 100, y, 180, 50, "PLAY AGAIN", "primary", () => {
            // Restart Game (Solo)
            this.scene.start(CST.SCENES.GAME, { gameMode: 'solo' });
        });

        // Add Glow to Play Again
        if (this.isVictory) {
             this.tweens.add({
                 targets: btnPlay,
                 scaleX: 1.05,
                 scaleY: 1.05,
                 yoyo: true,
                 repeat: -1,
                 duration: 800
             });
        }

        // Menu
        createRetroButton(this, x + 100, y, 160, 50, "MENU", "metal", () => {
            this.scene.start(CST.SCENES.MENU);
        });
    }

    createGuestWarning(x, y) {
        // Small warning text at bottom
        const txt = this.add.text(x, y, "⚠️ GUEST MODE: LOGIN TO SAVE PROGRESS", {
             fontFamily: '"Press Start 2P"',
             fontSize: '10px',
             color: '#FF0000',
             backgroundColor: '#000000'
        }).setOrigin(0.5);

        txt.setInteractive({ useHandCursor: true });
        txt.on('pointerdown', () => {
             if (window.overlayManager && window.overlayManager.authManager) {
                  window.overlayManager.authManager.loginGoogle();
             }
        });
    }
}
