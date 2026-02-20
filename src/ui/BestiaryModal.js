import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import api from '../api.js';
import { MOBS } from '../config/MobConfig.js';

export default class BestiaryModal extends UIModal {
    constructor(scene) {
        super(scene, 500, 640, 'THE BESTIARY'); // Slightly wider/taller
        this.bestiaryData = {};
        this.populate();
    }

    async populate() {
        try {
            // Fetch latest data
            const res = await api.getBestiary();
            if (!this.scene || !this.active) return;

            if (res.success) {
                this.bestiaryData = res.bestiary || {};
                this.renderGrid();
            } else {
                this.showError('Failed to load bestiary.');
            }
        } catch (e) {
            console.error(e);
            if (this.scene && this.windowContainer) {
                this.showError('Network Error.');
            }
        }
    }

    renderGrid() {
        if (this.gridContainer) {
            this.gridContainer.destroy();
        }
        this.gridContainer = this.scene.add.container(0, 0);
        this.windowContainer.add(this.gridContainer);

        const startX = -this.modalWidth / 2 + 55;
        const startY = -this.modalHeight / 2 + 80;
        const slotSize = 90; // Bigger slots
        const gap = 20;
        const cols = 3; // 3 Columns

        const allMobs = Object.values(MOBS); // Iterate all defined mobs

        if (allMobs.length === 0) {
            this.showError('No monster data found.');
            return;
        }

        allMobs.forEach((mob, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (slotSize + gap);
            const y = startY + row * (slotSize + gap);

            // Get Kills
            // bestiaryData is keyed by mob ID? Or texture key?
            // PlayerStateService uses mobId.
            // CollisionHandler uses mobId if available, else texture key.
            // EnemySpawner sets enemy.id = mob.id.
            // So we should use mob.id.
            const kills = this.bestiaryData[mob.id] || 0;

            this.createEnemySlot(x, y, slotSize, mob, kills);
        });

        // Adjust Scroll?
        // If row count > 4, we might need scroll.
        // For now, assume it fits or simple static grid.
        // If 15 mobs / 3 cols = 5 rows.
        // 5 * (90+20) = 550px. Height 640. Fits.
    }

    createEnemySlot(x, y, size, mob, kills) {
        const container = this.scene.add.container(x, y);

        const isCompleted = kills >= 5000;
        const isDiscovered = kills > 0;

        // Slot Bg
        const bg = this.scene.add.graphics();
        // If completed: Gold/Platinum Background
        if (isCompleted) {
             bg.fillStyle(0x332200, 1);
             bg.lineStyle(3, 0xffd700); // Gold Border
        } else {
             bg.fillStyle(0x222222, 1);
             bg.lineStyle(2, 0x444444);
        }
        bg.fillRect(0, 0, size, size);
        bg.strokeRect(0, 0, size, size);
        container.add(bg);

        // Enemy Icon
        const assetKey = mob.asset_key || 'enemy';
        if (this.scene.textures.exists(assetKey)) {
            const icon = this.scene.add.image(size / 2, size / 2 - 10, assetKey);
            // Scale to fit
            const maxIconSize = size - 30;
            const scale = Math.min(maxIconSize / icon.width, maxIconSize / icon.height);
            icon.setScale(scale);

            if (!isDiscovered) {
                icon.setTint(0x000000); // Silhouette
                icon.setAlpha(0.5);
            }
            container.add(icon);
        } else {
            const text = this.scene.add.text(size / 2, size / 2, '?', { fontSize: '24px', fill: '#666' }).setOrigin(0.5);
            container.add(text);
        }

        // Name
        const nameText = this.scene.add.text(size / 2, 10, isDiscovered ? mob.name : '???', {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            fill: isCompleted ? '#ffd700' : '#ffffff',
            align: 'center'
        }).setOrigin(0.5, 0); // Top aligned
        container.add(nameText);

        // Progress Bar
        const barWidth = size - 10;
        const barHeight = 6;
        const barX = 5;
        const barY = size - 15;

        const target = 5000;
        const progress = Math.min(kills / target, 1);

        const barBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x000000).setOrigin(0);
        const barColor = isCompleted ? 0xffd700 : 0x00ff00;
        const barFill = this.scene.add.rectangle(barX, barY, barWidth * progress, barHeight, barColor).setOrigin(0);

        container.add([barBg, barFill]);

        // Kills Text
        const killsText = this.scene.add.text(size / 2, size - 5, `${kills}/${target}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        container.add(killsText);

        // Crown Icon (Visual Bonus)
        if (isCompleted) {
            // Draw a simple crown or use text
            const crown = this.scene.add.text(5, 5, '👑', { fontSize: '12px' });
            container.add(crown);
        }

        this.gridContainer.add(container);
    }

    showError(msg) {
        const text = this.scene.add.text(0, 0, msg, {
             fontFamily: '"Press Start 2P"',
             fontSize: '12px',
             fill: '#ff0000'
        }).setOrigin(0.5);
        this.windowContainer.add(text);
    }
}
