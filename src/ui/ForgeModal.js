import UIModal from './UIModal.js';
import UIHelper from '../utils/UIHelper.js';
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

        // Background Panel for Resources (9-Slice)
        // Center x=0. createPanel creates at 0,0. We need to center it?
        // nineslice origin is 0.5 by default in Phaser 3? No, usually 0.5.
        // My UIHelper creates nineslice. By default origin is 0.5.
        const panel = UIHelper.createPanel(this.scene, 400, 40, 0x00FFFF);
        panel.y = y;
        this.windowContainer.add(panel);

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

        // Panel (9-Slice)
        const panel = UIHelper.createPanel(this.scene, 500, 200, 0x444444);
        panel.y = y + 50; // Adjust for center offset?
        // Original was y-50 for top left? No, fillRoundedRect with negative offsets implies center is 0,y.
        // y is 100. Height 200. Top is 0, Bottom 200.
        // If center is 0,100. Then rect -250, 50, 500, 200 draws from 50 to 250?
        // Wait, original: `fillRoundedRect(-250, y - 50, ...)` where y=100. -> y starts at 50.
        // Height 200. Ends at 250.
        // Center of that rect is 150.
        // UIHelper.createPanel creates a nineslice. Origin 0.5.
        // So we want panel.y = 150.
        panel.y = 150;
        this.windowContainer.add(panel);

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

        const btn = UIHelper.createNeonButton(
            this.scene,
            0, btnY,
            `LEVEL UP\n${costBcoin} BC + ${costFrags} FG`,
            300, 60,
            () => this.handleLevelUp(),
            0x00FF00 // Green for Upgrade
        );

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

}
