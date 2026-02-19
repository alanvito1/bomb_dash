import UIModal from './UIModal.js';
import playerStateService from '../services/PlayerStateService.js';
import SoundManager from '../utils/sound.js';

export default class ForgeModal extends UIModal {
    constructor(scene) {
        super(scene, 600, 600, 'THE UPGRADE FORGE');
        this.selectedHero = null;
        this.populate();
    }

    populate() {
        // Get selected hero from registry or service
        const savedHero = this.scene.registry.get('selectedHero');
        if (savedHero) {
            // Find the up-to-date hero object from service to ensure we have latest stats
            const heroes = playerStateService.getHeroes();
            this.selectedHero = heroes.find(h => h.id === savedHero.id) || savedHero;
        } else {
            // Fallback
            this.selectedHero = playerStateService.getHeroes()[0];
        }

        this.refreshUI();
    }

    refreshUI() {
        this.windowContainer.removeAll(true);

        if (!this.selectedHero) {
            this.addText(0, 0, 'No Hero Selected', '#888');
            return;
        }

        // 1. Resources Header (Fragments)
        this.createResourcesHeader();

        // 2. Hero Showcase (Sprite + Stats)
        this.createHeroShowcase();

        // 3. Upgrade Controls
        this.createUpgradeControls();
    }

    createResourcesHeader() {
        const y = -this.modalHeight / 2 + 60;

        // Background Panel for Resources
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x222222, 0.8);
        bg.fillRoundedRect(-200, y - 20, 400, 40, 4);
        bg.lineStyle(1, 0x444444);
        bg.strokeRoundedRect(-200, y - 20, 400, 40, 4);
        this.windowContainer.add(bg);

        // Common Fragments
        const commonCount = playerStateService.getFragmentCount('Common');
        const cIcon = this.scene.add.circle(-100, y, 8, 0xAAAAAA); // Grey dot
        const cText = this.scene.add.text(-80, y, `COMMON: ${commonCount}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#AAAAAA'
        }).setOrigin(0, 0.5);

        // Rare Fragments
        const rareCount = playerStateService.getFragmentCount('Rare');
        const rIcon = this.scene.add.circle(50, y, 8, 0x00FF00); // Green dot
        const rText = this.scene.add.text(70, y, `RARE: ${rareCount}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#00FF00'
        }).setOrigin(0, 0.5);

        this.windowContainer.add([cIcon, cText, rIcon, rText]);
    }

    createHeroShowcase() {
        const y = -80;

        // Hero Sprite
        const spriteKey = this.selectedHero.sprite_name || 'ninja_hero';
        if (this.scene.textures.exists(spriteKey)) {
            const sprite = this.scene.add.image(0, y, spriteKey).setScale(2);
            // Floating animation
            this.scene.tweens.add({
                targets: sprite,
                y: y - 5,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            this.windowContainer.add(sprite);
        }

        // Hero Name
        this.addText(0, y + 60, this.selectedHero.name || 'Unknown Hero', '#FFFFFF', '14px');

        // Level / XP ?
        // Keep it simple as per prompt: "Display do Herói: Mostre... atributos atuais"
    }

    createUpgradeControls() {
        const y = 80;
        const gap = 80;

        // Ensure stats object exists
        const stats = this.selectedHero.stats || {};
        const power = stats.power || 0;
        const speed = stats.speed || 0;

        // POWER ROW
        this.createStatRow(y, 'POWER', power, 'power');

        // SPEED ROW
        this.createStatRow(y + gap, 'SPEED', speed, 'speed');
    }

    createStatRow(y, label, value, statKey) {
        const xStart = -180;

        // Label
        const lbl = this.scene.add.text(xStart, y, label, {
            fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#FFD700'
        }).setOrigin(0, 0.5);
        this.windowContainer.add(lbl);

        // Value
        const val = this.scene.add.text(xStart + 100, y, `${value}`, {
            fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#FFF'
        }).setOrigin(0, 0.5);
        this.windowContainer.add(val);

        // Upgrade Button
        const cost = 50;
        const btnX = 100;

        const btn = this.createButton(btnX, y, `UPGRADE (+1)\nCOST: ${cost} Common`, 180, 40, () => {
             this.handleUpgrade(statKey);
        });

        this.windowContainer.add(btn);
    }

    handleUpgrade(statKey) {
        const res = playerStateService.upgradeHeroStatWithFragments(this.selectedHero.id, statKey);

        if (res.success) {
            SoundManager.play(this.scene, 'powerup_collect'); // Or 'upgrade' if exists

            // Visual feedback
            // Show "+1" floating text
            // Update local hero reference
            this.selectedHero = res.hero;

            // Update Registry to sync with Menu
            this.scene.registry.set('selectedHero', this.selectedHero);

            // Refresh UI
            this.refreshUI();
        } else {
            SoundManager.play(this.scene, 'error'); // Or 'explosion'
            alert(res.message); // Simple feedback for now
        }
    }

    addText(x, y, text, color, size='12px') {
        const t = this.scene.add.text(x, y, text, {
             fontFamily: '"Press Start 2P"', fontSize: size, fill: color, align: 'center'
        }).setOrigin(0.5);
        this.windowContainer.add(t);
    }

    createButton(x, y, label, w, h, callback) {
        const container = this.scene.add.container(x, y);
        const bg = this.scene.add.graphics();

        // Retro Button Style
        bg.fillStyle(0xFF4500, 1); // Orange/Red
        bg.fillRect(-w/2, -h/2, w, h);

        // Highlight
        bg.fillStyle(0xFF8C00, 1);
        bg.fillRect(-w/2, -h/2, w, 4);

        // Shadow
        bg.fillStyle(0x8B0000, 1);
        bg.fillRect(-w/2, h/2 - 4, w, 4);

        // Border
        bg.lineStyle(2, 0x000000);
        bg.strokeRect(-w/2, -h/2, w, h);

        const text = this.scene.add.text(0, 0, label, {
             fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#fff', align: 'center', lineSpacing: 4
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setSize(w, h);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
             bg.y = 2; text.y = 2; // Press effect
        });
        container.on('pointerout', () => {
             bg.y = 0; text.y = 0;
        });
        container.on('pointerup', () => {
             bg.y = 0; text.y = 0;
             callback();
        });

        return container;
    }
}
