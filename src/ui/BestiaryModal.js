import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';

export default class BestiaryModal extends UIModal {
    constructor(scene) {
        super(scene, 460, 600, 'THE CODEX');
        this.bestiaryData = {};
        this.populate();
    }

    async populate() {
        try {
            const res = await api.getBestiary();
            if (res.success) {
                this.bestiaryData = res.bestiary;
                this.renderGrid();
            } else {
                this.showError('Failed to load bestiary.');
            }
        } catch (e) {
            console.error(e);
            this.showError('Network Error.');
        }
    }

    renderGrid() {
        if (this.gridContainer) {
            this.gridContainer.destroy();
        }
        this.gridContainer = this.scene.add.container(0, 0);
        this.windowContainer.add(this.gridContainer);

        const startX = -this.modalWidth / 2 + 50;
        const startY = -this.modalHeight / 2 + 80;
        const slotSize = 80;
        const gap = 20;
        const cols = 4;

        // Known enemies - Ideally this comes from a config, but we can iterate active assets
        // or just iterate the bestiary keys if we only show encountered ones.
        // Let's show all known types from a list to encourage discovery?
        // For now, let's just show what we have in bestiary + some placeholders if empty.

        let enemies = Object.keys(this.bestiaryData);
        if (enemies.length === 0) {
            this.showError('No monsters encountered yet.');
            return;
        }

        enemies.forEach((type, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (slotSize + gap);
            const y = startY + row * (slotSize + gap);

            this.createEnemySlot(x, y, slotSize, type, this.bestiaryData[type]);
        });
    }

    createEnemySlot(x, y, size, type, kills) {
        const container = this.scene.add.container(x, y);

        // Slot Bg
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x222222, 1);
        bg.fillRect(0, 0, size, size);
        bg.lineStyle(2, 0x444444);
        bg.strokeRect(0, 0, size, size);
        container.add(bg);

        // Enemy Icon (use texture if exists, else text)
        if (this.scene.textures.exists(type)) {
            const icon = this.scene.add.image(size / 2, size / 2, type).setDisplaySize(size - 20, size - 20);
            container.add(icon);
        } else {
            const text = this.scene.add.text(size / 2, size / 2, '?', { fontSize: '24px', fill: '#666' }).setOrigin(0.5);
            container.add(text);
        }

        // Progress Bar
        const barWidth = size - 10;
        const barHeight = 6;
        const barX = 5;
        const barY = size - 15;

        // Calculate Level and Next Target
        let level = 0;
        let nextTarget = 100;
        if (kills >= 5000) { level = 3; nextTarget = 5000; }
        else if (kills >= 1000) { level = 2; nextTarget = 5000; }
        else if (kills >= 100) { level = 1; nextTarget = 1000; }

        const progress = Math.min(kills / nextTarget, 1);

        const barBg = this.scene.add.rectangle(barX, barY, barWidth, barHeight, 0x000000).setOrigin(0);
        const barFill = this.scene.add.rectangle(barX, barY, barWidth * progress, barHeight, 0x00ff00).setOrigin(0);

        container.add([barBg, barFill]);

        // Kills Text
        const killsText = this.scene.add.text(size / 2, size - 5, `${kills}/${nextTarget}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        container.add(killsText);

        // Level Badge
        if (level > 0) {
            const badge = this.scene.add.circle(size - 10, 10, 8, 0xffff00);
            const levelText = this.scene.add.text(size - 10, 10, level.toString(), {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                fill: '#000000'
            }).setOrigin(0.5);
            container.add([badge, levelText]);
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
