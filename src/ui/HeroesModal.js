import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import bcoinService from '../web3/bcoin-service.js';
import { SPELLS, RARITY } from '../config/MockNFTData.js';

const RARITY_COLORS = {
    0: 0x00ff00, // Common (Green)
    1: 0x0000ff, // Rare (Blue)
    2: 0x00ffff, // Super Rare (Cyan)
    3: 0xff0000, // Epic (Red)
    4: 0x800080, // Legend (Purple)
    5: 0xffd700  // SP Legend (Gold)
};

export default class HeroesModal extends UIModal {
    constructor(scene) {
        super(scene, 460, 600, LanguageManager.get('heroes_title', {}, 'HEROES'));
        this.selectedHero = null;
        this.heroes = [];
        this.populate();
    }

    async populate() {
        // Fetch Heroes
        try {
            const res = await api.getHeroes();
            if (!this.scene || !this.active) return; // Prevent crash if closed

            if (res.success && res.heroes) {
                this.heroes = res.heroes;
                this.renderGrid();
            } else {
                console.warn('Failed to fetch heroes', res);
                this.showError('Failed to load heroes.');
            }
        } catch (e) {
            console.error(e);
            if (this.scene && this.windowContainer) {
                this.showError('Network Error.');
            }
        }
    }

    renderGrid() {
        // Clear previous grid
        if (this.gridContainer) {
            this.gridContainer.destroy();
        }
        this.gridContainer = this.scene.add.container(0, 0);
        this.windowContainer.add(this.gridContainer);

        const startX = -this.modalWidth / 2 + 50;
        const startY = -this.modalHeight / 2 + 80;
        const slotSize = 80;
        const gap = 20;
        const cols = 5;

        this.heroes.forEach((hero, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = startX + col * (slotSize + gap);
            const y = startY + row * (slotSize + gap);

            this.createHeroSlot(x, y, slotSize, hero);
        });
    }

    createHeroSlot(x, y, size, hero) {
        const container = this.scene.add.container(x, y);
        const rarityColor = RARITY_COLORS[hero.rarity] || 0xffffff;

        // Slot Bg
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x222222, 1);
        bg.fillRect(0, 0, size, size);
        bg.lineStyle(2, rarityColor);
        bg.strokeRect(0, 0, size, size);
        container.add(bg);

        // Avatar (Placeholder Text or Sprite)
        // If sprite exists, use it, else use Text Initials
        if (hero.sprite_name && this.scene.textures.exists(hero.sprite_name)) {
            const avatar = this.scene.add.image(size / 2, size / 2, hero.sprite_name).setDisplaySize(size - 10, size - 10);
            container.add(avatar);
        } else {
             const initials = (hero.name || 'H').substring(0, 2).toUpperCase();
             const txt = this.scene.add.text(size / 2, size / 2, initials, {
                 fontSize: '20px', fill: '#fff'
             }).setOrigin(0.5);
             container.add(txt);
        }

        // Level Badge
        const lvlBg = this.scene.add.circle(size - 10, 10, 10, 0x000000);
        const lvlText = this.scene.add.text(size - 10, 10, hero.level.toString(), {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        container.add([lvlBg, lvlText]);

        // Rarity Label (Bottom)
        const rarityName = RARITY[hero.rarity] ? RARITY[hero.rarity].substring(0, 3) : 'UNK';
        const rarText = this.scene.add.text(size/2, size - 10, rarityName, {
             fontFamily: '"Press Start 2P"', fontSize: '8px', fill: `#${rarityColor.toString(16).padStart(6, '0')}`
        }).setOrigin(0.5);
        container.add(rarText);

        // Interaction
        container.setSize(size, size);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            SoundManager.playClick(this.scene);
            this.selectHero(hero);

            this.scene.tweens.add({
                targets: container,
                scale: 0.95,
                yoyo: true,
                duration: 50
            });
        });

        this.gridContainer.add(container);
    }

    selectHero(hero) {
        this.selectedHero = hero;
        this.renderDetails();

        // Update Registry & Menu Showcase
        this.scene.registry.set('selectedHero', hero);
        if (this.scene.updateHeroSprite) {
            this.scene.updateHeroSprite(hero.sprite_name);
        }
    }

    renderDetails() {
        if (!this.selectedHero) return;

        // Remove previous details container if exists
        if (this.detailsContainer) {
            this.detailsContainer.destroy();
        }

        const detailsY = 100; // Bottom half
        this.detailsContainer = this.scene.add.container(0, detailsY);

        // Background for details
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x111111, 0.95);
        bg.fillRect(-this.modalWidth / 2 + 20, 0, this.modalWidth - 40, 240);
        bg.lineStyle(1, 0x444444);
        bg.strokeRect(-this.modalWidth / 2 + 20, 0, this.modalWidth - 40, 240);
        this.detailsContainer.add(bg);

        // Hero Name & Rarity
        const rarityColor = RARITY_COLORS[this.selectedHero.rarity] || 0xffffff;
        const name = this.scene.add.text(0, 20, (this.selectedHero.name || 'Hero').toUpperCase(), {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: `#${rarityColor.toString(16).padStart(6, '0')}`
        }).setOrigin(0.5);
        this.detailsContainer.add(name);

        // --- STATS COLUMN (Left) ---
        const startX = -this.modalWidth / 2 + 40;
        let statY = 50;
        const stats = [
            { label: 'POWER', val: this.selectedHero.stats.power },
            { label: 'SPEED', val: this.selectedHero.stats.speed },
            { label: 'STAMINA', val: this.selectedHero.stats.stamina },
            { label: 'BOMBS', val: this.selectedHero.stats.bomb_num },
            { label: 'RANGE', val: this.selectedHero.stats.range }
        ];

        stats.forEach(s => {
            const txt = this.scene.add.text(startX, statY, `${s.label}: ${s.val}`, {
                 fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#ffffff'
            });
            this.detailsContainer.add(txt);
            statY += 20;
        });

        // --- SPELLS COLUMN (Right) ---
        const spellX = 20;
        let spellY = 50;
        const spellTitle = this.scene.add.text(spellX, spellY, 'SPELLS:', {
             fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#ffff00'
        });
        this.detailsContainer.add(spellTitle);
        spellY += 20;

        if (this.selectedHero.spells && this.selectedHero.spells.length > 0) {
            this.selectedHero.spells.forEach(spellId => {
                const spell = SPELLS[spellId];
                const spellName = spell ? spell.name : `Unknown (${spellId})`;
                const txt = this.scene.add.text(spellX, spellY, `- ${spellName}`, {
                     fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#00ffff'
                });
                this.detailsContainer.add(txt);
                spellY += 15;
            });
        } else {
             const txt = this.scene.add.text(spellX, spellY, 'None', {
                 fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#888'
            });
            this.detailsContainer.add(txt);
        }

        // --- ACTION BUTTONS ---
        const btnY = 190;

        // Upgrade Button
        const upgBtn = this.createActionButton(-100, btnY, 'UPGRADE STATS', 500, 0x00ff00, async (btn, txt) => {
            await this.handleUpgrade(btn, txt);
        });

        // Reroll Button
        const rerollBtn = this.createActionButton(100, btnY, 'REROLL SPELLS', 1000, 0xff00ff, async (btn, txt) => {
            await this.handleReroll(btn, txt);
        });

        this.detailsContainer.add([upgBtn, rerollBtn]);
        this.windowContainer.add(this.detailsContainer);
    }

    createActionButton(x, y, label, cost, color, callback) {
        const container = this.scene.add.container(x, y);

        const w = 180;
        const h = 40;

        const bg = this.scene.add.graphics();
        bg.fillStyle(color, 0.2);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 4);
        bg.lineStyle(2, color);
        bg.strokeRoundedRect(-w/2, -h/2, w, h, 4);

        const lbl = this.scene.add.text(0, -5, label, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#ffffff'
        }).setOrigin(0.5);

        const costLbl = this.scene.add.text(0, 10, `${cost} BCOIN`, {
            fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#ffd700'
        }).setOrigin(0.5);

        container.add([bg, lbl, costLbl]);
        container.setSize(w, h);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
             SoundManager.playClick(this.scene);
             callback(container, costLbl);
        });

        return container;
    }

    async handleUpgrade(btnContainer, costText) {
        const originalText = costText.text;
        costText.setText('Processing...');

        try {
            const res = await api.upgradeHeroStat(this.selectedHero.id);
            if (!this.scene || !this.active) return;

            if (res.success) {
                SoundManager.play(this.scene, 'upgrade');
                this.selectedHero = res.hero;

                // Update hero in local list
                const idx = this.heroes.findIndex(h => h.id === res.hero.id);
                if (idx !== -1) this.heroes[idx] = res.hero;

                // Refresh UI
                this.renderDetails();
                bcoinService.updateBalance();
            } else {
                costText.setText(res.message || 'Error');
                SoundManager.play(this.scene, 'error');
                this.scene.time.delayedCall(1500, () => {
                     if (costText.active) costText.setText(originalText);
                });
            }
        } catch (e) {
            console.error(e);
            costText.setText('Error');
        }
    }

    async handleReroll(btnContainer, costText) {
        const originalText = costText.text;
        costText.setText('Rolling...');

        try {
            const res = await api.rerollHeroSpells(this.selectedHero.id);
            if (!this.scene || !this.active) return;

            if (res.success) {
                SoundManager.play(this.scene, 'upgrade'); // Use upgrade sound for now
                this.selectedHero = res.hero;

                // Update hero in local list
                const idx = this.heroes.findIndex(h => h.id === res.hero.id);
                if (idx !== -1) this.heroes[idx] = res.hero;

                // Refresh UI
                this.renderDetails();
                bcoinService.updateBalance();
            } else {
                costText.setText(res.message || 'Error');
                SoundManager.play(this.scene, 'error');
                this.scene.time.delayedCall(1500, () => {
                     if (costText.active) costText.setText(originalText);
                });
            }
        } catch (e) {
            console.error(e);
            costText.setText('Error');
        }
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
