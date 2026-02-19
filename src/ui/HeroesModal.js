import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import bcoinService from '../web3/bcoin-service.js';
import tournamentService from '../web3/tournament-service.js';
import contracts from '../config/contracts.js';

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

        // Slot Bg
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x222222, 1);
        bg.fillRect(0, 0, size, size);
        bg.lineStyle(2, 0x444444);
        bg.strokeRect(0, 0, size, size);
        container.add(bg);

        // Avatar
        const avatar = this.scene.add.image(size / 2, size / 2, hero.sprite_name || 'ninja_hero').setDisplaySize(size - 10, size - 10);
        container.add(avatar);

        // Level Badge
        const lvlBg = this.scene.add.circle(size - 10, 10, 10, 0x000000);
        const lvlText = this.scene.add.text(size - 10, 10, hero.level.toString(), {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        container.add([lvlBg, lvlText]);

        // Interaction
        container.setSize(size, size);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            SoundManager.playClick(this.scene);
            this.selectHero(hero);

            // Highlight (Reset others - simple approach: re-render grid or manage state)
            // For now, simple visual feedback
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
        bg.fillStyle(0x111111, 0.8);
        bg.fillRect(-this.modalWidth / 2 + 20, 0, this.modalWidth - 40, 200);
        this.detailsContainer.add(bg);

        // Hero Name
        const name = this.scene.add.text(0, 20, (this.selectedHero.name || 'Hero').toUpperCase(), {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffff00'
        }).setOrigin(0.5);
        this.detailsContainer.add(name);

        // Stats
        const stats = [
            { key: 'damage', label: 'DMG', val: this.selectedHero.damage },
            { key: 'speed', label: 'SPD', val: this.selectedHero.speed },
            { key: 'fireRate', label: 'FRT', val: this.selectedHero.fireRate }
        ];

        let statY = 60;
        stats.forEach((stat) => {
            const statText = this.scene.add.text(-this.modalWidth / 2 + 40, statY, `${stat.label}: ${stat.val}`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: '#ffffff'
            });

            // Upgrade Button
            const cost = this.calculateCost(stat.key, this.selectedHero);
            const btn = this.createUpgradeButton(100, statY, stat.key, cost);

            this.detailsContainer.add([statText, btn]);
            statY += 40;
        });

        // --- PROFICIENCY SKILLS ---
        const profY = statY + 20;
        const profTitle = this.scene.add.text(0, profY, 'PROFICIENCY', {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            fill: '#00ffff'
        }).setOrigin(0.5);
        this.detailsContainer.add(profTitle);

        const profStats = [
            { label: 'BOMB MASTERY', xp: this.selectedHero.bomb_mastery_xp || 0, color: 0xff4d4d },
            { label: 'AGILITY', xp: this.selectedHero.agility_xp || 0, color: 0x00ff00 }
        ];

        let currentProfY = profY + 30;
        profStats.forEach(stat => {
            // Level Calc: Logarithmic (Level = sqrt(XP)/2)
            const level = Math.floor(Math.sqrt(stat.xp) / 2);
            // XP for current level start: (level * 2)^2
            // XP for next level: ((level + 1) * 2)^2
            const currentLevelStartXp = Math.pow(level * 2, 2);
            const nextLevelXp = Math.pow((level + 1) * 2, 2);

            const xpInLevel = stat.xp - currentLevelStartXp;
            const xpNeeded = nextLevelXp - currentLevelStartXp;
            const progress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 0;

            const labelText = this.scene.add.text(-this.modalWidth/2 + 40, currentProfY, `${stat.label} (Lvl ${level})`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                fill: '#ffffff'
            });

            // Bar
            const barBg = this.scene.add.rectangle(-this.modalWidth/2 + 40, currentProfY + 15, 200, 6, 0x333333).setOrigin(0);
            const barFill = this.scene.add.rectangle(-this.modalWidth/2 + 40, currentProfY + 15, 200 * progress, 6, stat.color).setOrigin(0);

            this.detailsContainer.add([labelText, barBg, barFill]);
            currentProfY += 35;
        });

        this.windowContainer.add(this.detailsContainer);
    }

    calculateCost(type, hero) {
        if (type === 'damage') return 50 + (hero.damage - 1) * 20;
        if (type === 'speed') return 40 + ((hero.speed - 200) / 10) * 15;
        if (type === 'fireRate') return 60 + ((600 - hero.fireRate) / 50) * 25;
        return 999;
    }

    createUpgradeButton(x, y, type, cost) {
        const container = this.scene.add.container(x, y + 5);
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x00ff00, 1);
        bg.fillRoundedRect(0, 0, 120, 20, 4);

        const text = this.scene.add.text(60, 10, `UPG (${Math.floor(cost)})`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            fill: '#000000'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setSize(120, 20);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', async () => {
            SoundManager.playClick(this.scene);
            await this.handleUpgrade(type, cost, container, text);
        });

        return container;
    }

    async handleUpgrade(type, cost, btnContainer, btnText) {
        // Logic from ShopScene.js
        try {
            const { balance } = await bcoinService.getBalance();
            if (!this.scene || !this.active) return;

            if (parseFloat(balance) < cost) {
                SoundManager.play(this.scene, 'error');
                if (btnText.active) {
                    btnText.setText('NO FUNDS');
                    this.scene.time.delayedCall(1000, () => {
                        if (btnText.active) btnText.setText(`UPG (${Math.floor(cost)})`);
                    });
                }
                return;
            }

            if (btnText.active) btnText.setText('WAIT...');

            // 1. Approve
            await bcoinService.approve(contracts.tournamentController.address, cost);
            if (!this.scene || !this.active) return;

            // 2. Pay
            const payTx = await tournamentService.payUpgradeFee(cost);
            if (!this.scene || !this.active) return;

            // 3. Verify
            const result = await api.updateUserStats(this.selectedHero.id, type, payTx.hash);
            if (!this.scene || !this.active) return;

            if (result.success) {
                SoundManager.play(this.scene, 'upgrade');
                this.selectedHero = result.hero; // Update local data

                // Update hero in list
                const idx = this.heroes.findIndex(h => h.id === result.hero.id);
                if (idx !== -1) this.heroes[idx] = result.hero;

                this.renderDetails(); // Re-render stats

                // Update Balance UI in Menu
                bcoinService.updateBalance();
            } else {
                throw new Error(result.message);
            }
        } catch (e) {
            console.error(e);
            SoundManager.play(this.scene, 'error');
            btnText.setText('ERROR');
            this.scene.time.delayedCall(1000, () => btnText.setText(`UPG (${Math.floor(cost)})`));
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
