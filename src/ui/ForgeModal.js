import UIModal from './UIModal.js';
import playerStateService from '../services/PlayerStateService.js';
import SoundManager from '../utils/sound.js';

export default class ForgeModal extends UIModal {
    constructor(scene) {
        super(scene, 600, 600, 'ETERNAL FORGE');
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

        // 3. Level Up Section
        this.createLevelUpSection();
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

        // BCOIN Balance (Mocked check from service)
        const user = playerStateService.getUser();
        const bcoinText = this.scene.add.text(50, y, `BCOIN: ${user.bcoin}`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#FFD700'
        }).setOrigin(0, 0.5);

        this.windowContainer.add([cIcon, cText, bcoinText]);
    }

    createHeroShowcase() {
        const y = -80;

        // Hero Sprite
        const spriteKey = this.selectedHero.sprite_name || 'ninja_hero';
        if (this.scene.textures.exists(spriteKey)) {
            const sprite = this.scene.add.image(0, y, spriteKey).setScale(3);
            // Floating animation
            this.scene.tweens.add({
                targets: sprite,
                y: y - 10,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            this.windowContainer.add(sprite);
        }

        // Hero Name
        this.addText(0, y + 80, this.selectedHero.name || 'Unknown Hero', '#FFFFFF', '16px');

        // Current Level Display
        const currentLevel = this.selectedHero.level || 1;
        this.addText(0, y + 110, `LEVEL ${currentLevel}`, '#00FFFF', '20px');

        // Task Force: Summoner's Journey Bonus
        const accountLevel = playerStateService.getAccountLevel();
        if (accountLevel > 0) {
            this.addText(0, y + 135, `SUMMONER BUFF: +${accountLevel}% STATS`, '#00FF00', '10px');
        }
    }

    createLevelUpSection() {
        const y = 100;

        // Panel
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(-250, y - 50, 500, 200, 8);
        bg.lineStyle(2, 0x444444);
        bg.strokeRoundedRect(-250, y - 50, 500, 200, 8);
        this.windowContainer.add(bg);

        // Next Level Preview
        const nextLevel = (this.selectedHero.level || 1) + 1;
        this.addText(0, y - 20, `NEXT LEVEL: ${nextLevel}`, '#AAAAAA', '12px');

        // Bonus Preview
        const bonusText = `BONUS: Power +1, Speed +2%`;
        this.addText(0, y + 10, bonusText, '#00FF00', '12px');

        // Upgrade Button
        const costBcoin = 1;
        const costFrags = 50;

        const btnY = y + 80;

        const btn = this.createButton(0, btnY, `LEVEL UP HERO\nCOST: ${costBcoin} BCOIN + ${costFrags} FRAG`, 300, 60, () => {
             this.handleLevelUp();
        });

        this.windowContainer.add(btn);
    }

    handleLevelUp() {
        const res = playerStateService.upgradeHeroLevel(this.selectedHero.id);

        if (res.success) {
            SoundManager.play(this.scene, 'level_up'); // Victory sound as placeholder for awesome upgrade

            // Visual feedback
            this.showFloatingText(0, 0, "LEVEL UP!", "#00FF00");

            // Update local hero reference
            this.selectedHero = res.hero;

            // Update Registry to sync with Menu
            this.scene.registry.set('selectedHero', this.selectedHero);

            // Refresh UI
            this.refreshUI();
        } else {
            SoundManager.play(this.scene, 'error');
            alert(res.message);
        }
    }

    showFloatingText(x, y, message, color) {
        const text = this.scene.add.text(x, y, message, {
            fontFamily: '"Press Start 2P"', fontSize: '24px', fill: color, stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.windowContainer.add(text);

        this.scene.tweens.add({
            targets: text,
            y: y - 100,
            alpha: 0,
            duration: 1500,
            onComplete: () => text.destroy()
        });
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
             fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#fff', align: 'center', lineSpacing: 6
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
