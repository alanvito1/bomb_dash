import { CST } from '../CST.js';
import UIHelper from '../utils/UIHelper.js';
import playerStateService from '../services/PlayerStateService.js';
import SoundManager from '../utils/sound.js';

export default class PostMatchScene extends Phaser.Scene {
    constructor() {
        super(CST.SCENES.POST_MATCH);
    }

    create(data) {
        this.stats = data.stats || [];
        this.heroStats = data.heroStats;
        this.isVictory = data.isVictory;

        // Sort stats by placement (ascending 1..16)
        this.stats.sort((a, b) => a.placement - b.placement);

        // Texture Fallbacks
        if (!this.textures.exists('ui_panel')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });
             // Border (White -> Tinted)
             g.fillStyle(0xFFFFFF, 1);
             g.fillRect(0, 0, 32, 32);
             // Center (Black -> Black)
             g.fillStyle(0x000000, 1);
             g.fillRect(2, 2, 28, 28);
             g.generateTexture('ui_panel', 32, 32);
        }
        if (!this.textures.exists('player_default')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });
             g.fillStyle(0x00FF00, 1);
             g.fillRect(0, 0, 32, 32);
             g.generateTexture('player_default', 32, 32);
        }

        this.cameras.main.setBackgroundColor('#000000');

        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // Main Panel
        const panel = UIHelper.createPanel(this, 460, 780, 0xFF5F1F);
        panel.setPosition(centerX, centerY);

        // Title
        this.add.text(centerX, 40, this.isVictory ? "VICTORY ROYALE" : "MATCH RESULTS", {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: this.isVictory ? '#FFFF00' : '#FFFFFF',
            stroke: '#FF5F1F',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Podium (Top 3)
        this.createPodium(centerX, 150);

        // Results Table
        this.createTable(centerX, 450);

        // Buttons
        this.createButtons(centerX, this.scale.height - 70);
    }

    createPodium(x, y) {
        // Top 1
        if (this.stats[0]) this.createPodiumSpot(x, y - 20, this.stats[0], 1, 1.5);
        // Top 2
        if (this.stats[1]) this.createPodiumSpot(x - 150, y + 30, this.stats[1], 2, 1.2);
        // Top 3
        if (this.stats[2]) this.createPodiumSpot(x + 150, y + 30, this.stats[2], 3, 1.2);
    }

    createPodiumSpot(x, y, stat, rank, scale) {
        // Avatar (Placeholder or Sprite)
        const texture = stat.isUser ? 'player_default' : 'player_default';
        // Use 'player_default' if available, otherwise fallback is handled by Phaser (pink box)
        // or check existance. 'player_default' is used in BR scene so it should exist.

        const sprite = this.add.sprite(x, y, texture).setScale(scale);
        if (!stat.isUser) sprite.setTint(0xaaaaaa); // Bot tint

        // Rank Text
        this.add.text(x, y - 50 * scale, `#${rank}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: `${16 * scale}px`,
            color: rank === 1 ? '#FFD700' : (rank === 2 ? '#C0C0C0' : '#CD7F32'),
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Name
        this.add.text(x, y + 40 * scale, stat.name, {
             fontFamily: '"Press Start 2P"',
             fontSize: '10px',
             color: '#ffffff'
        }).setOrigin(0.5);
    }

    createTable(x, y) {
        // Headers
        const headers = ['POS', 'NAME', 'BLOCKS', 'BCOINS', 'SECURED'];
        // Tighter columns to fit 480px width
        const colX = [-210, -120, -20, 80, 180];

        headers.forEach((h, i) => {
            this.add.text(x + colX[i], y - 160, h, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                color: '#FF5F1F' // Neon Orange
            }).setOrigin(0.5);
        });

        // Rows
        // Just show all 16 rows.
        this.stats.forEach((stat, i) => {
            const rowY = y - 130 + (i * 20);
            const color = stat.isUser ? '#00FFFF' : '#FFFFFF'; // Cyan for user

            // Highlight user row background
            if (stat.isUser) {
                 this.add.rectangle(x, rowY, 600, 18, 0x00FFFF, 0.2);
            }

            // Guaranteed Logic: Rank <= 3 gets coins, else 0.
            const guaranteed = (stat.placement <= 3) ? stat.bcoinsCollected : 0;
            const collected = stat.bcoinsCollected;

            // Columns
            this.add.text(x + colX[0], rowY, `#${stat.placement}`, { font: '10px "Press Start 2P"', color }).setOrigin(0.5);
            this.add.text(x + colX[1], rowY, stat.name, { font: '10px "Press Start 2P"', color }).setOrigin(0.5);
            this.add.text(x + colX[2], rowY, `${stat.blocksDestroyed}`, { font: '10px "Press Start 2P"', color }).setOrigin(0.5);
            this.add.text(x + colX[3], rowY, `${collected}`, { font: '10px "Press Start 2P"', color }).setOrigin(0.5);

            const secColor = guaranteed > 0 ? '#00FF00' : '#555555';
            this.add.text(x + colX[4], rowY, `${guaranteed}`, { font: '10px "Press Start 2P"', color: secColor }).setOrigin(0.5);
        });
    }

    createButtons(centerX, y) {
        // Vertical Stack for better mobile fit

        // Play Again
        UIHelper.createNeonButton(this, centerX, y - 70, "PLAY AGAIN (10 BC)", 240, 50, () => {
             this.handlePlayAgain();
        }, 0x00FF00); // Green

        // Return to Menu
        UIHelper.createNeonButton(this, centerX, y, "MENU", 150, 50, () => {
             SoundManager.play(this, 'click');
             this.scene.start(CST.SCENES.MENU);
        }, 0xFF5F1F); // Orange
    }

    handlePlayAgain() {
        SoundManager.play(this, 'click');
        const user = playerStateService.getUser();
        if (user.bcoin >= 10) {
            this.scene.start(CST.SCENES.BATTLE_ROYALE);
        } else {
            // Show alert
            const txt = this.add.text(this.scale.width/2, this.scale.height - 100, "NOT ENOUGH BCOIN!", {
                font: '16px "Press Start 2P"', color: '#FF0000', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5);
            this.tweens.add({
                targets: txt,
                alpha: 0,
                duration: 1000,
                delay: 1000,
                onComplete: () => txt.destroy()
            });
        }
    }
}
