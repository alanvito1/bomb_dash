import UIModal from './UIModal.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';

export default class HousesModal extends UIModal {
    constructor(scene) {
        super(scene, 460, 500, 'HOUSES');
        this.houses = [];
        this.populate();
    }

    async populate() {
        try {
            const res = await api.getHouses();
            if (!this.scene || !this.active) return;

            if (res.success && res.houses) {
                this.houses = res.houses;
                this.renderList();
            } else {
                this.showError('Failed to load houses.');
            }
        } catch (e) {
            console.error(e);
            this.showError('Network Error.');
        }
    }

    renderList() {
        const startY = -this.modalHeight / 2 + 80;
        let y = startY;

        if (this.houses.length === 0) {
            const txt = this.scene.add.text(0, 0, 'No Houses Owned', {
                 fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#888'
            }).setOrigin(0.5);
            this.windowContainer.add(txt);
            return;
        }

        this.houses.forEach((house) => {
            const container = this.createHouseCard(house);
            container.y = y;
            this.windowContainer.add(container);
            y += 80; // Card height + gap
        });
    }

    createHouseCard(house) {
        const w = this.modalWidth - 60;
        const h = 70;
        const container = this.scene.add.container(0, 0);

        // Card Bg
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x222222, 1);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 8);
        bg.lineStyle(2, 0x00ffff); // Cyan border for houses
        bg.strokeRoundedRect(-w/2, -h/2, w, h, 8);
        container.add(bg);

        // Icon (Placeholder)
        const iconBg = this.scene.add.circle(-w/2 + 40, 0, 25, 0x004444);
        const iconTxt = this.scene.add.text(-w/2 + 40, 0, 'H', {
             fontFamily: '"Press Start 2P"', fontSize: '20px', fill: '#00ffff'
        }).setOrigin(0.5);
        container.add([iconBg, iconTxt]);

        // Details
        const name = house.name || `House #${house.id}`;
        const nameTxt = this.scene.add.text(-w/2 + 80, -20, name.toUpperCase(), {
             fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#ffffff'
        });

        const statsTxt = this.scene.add.text(-w/2 + 80, 5, `SLOTS: ${house.stats.slots} | CHARGE: ${house.stats.recovery_rate}/m`, {
             fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#aaaaaa'
        });

        // "Activate" Button (Mock)
        const btnBg = this.scene.add.graphics();
        btnBg.fillStyle(0x00ff00, 0.2);
        btnBg.fillRoundedRect(w/2 - 80, -15, 70, 30, 4);
        const btnTxt = this.scene.add.text(w/2 - 45, 0, 'ACTIVE', {
             fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#00ff00'
        }).setOrigin(0.5);

        container.add([nameTxt, statsTxt, btnBg, btnTxt]);

        return container;
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
