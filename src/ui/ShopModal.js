import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class ShopModal extends UIModal {
    constructor(scene) {
        super(scene, 400, 600, LanguageManager.get('shop_title', {}, 'SHOP')); // Default title
        this.populate();
    }

    populate() {
        const items = [
            {
                key: 'item_chest',
                title: 'Gold Chest',
                desc: 'Contains rare items',
                price: '500 G',
                currency: 'gold'
            },
            {
                key: 'item_potion',
                title: 'Health Potion',
                desc: 'Restores 50 HP',
                price: '100 G',
                currency: 'gold'
            },
            {
                key: 'item_gems',
                title: 'Gem Pack',
                desc: '10 Premium Gems',
                price: '5 B',
                currency: 'bcoin'
            }
        ];

        const startY = -this.modalHeight / 2 + 80;
        const cardHeight = 120;
        const cardWidth = this.modalWidth - 40;

        items.forEach((item, index) => {
            const y = startY + (index * (cardHeight + 20));
            this.createShopCard(0, y, cardWidth, cardHeight, item);
        });
    }

    createShopCard(x, y, w, h, item) {
        const container = this.scene.add.container(x, y);

        // Card Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x111111, 1);
        bg.fillRoundedRect(-w / 2, 0, w, h, 8);
        bg.lineStyle(1, 0x333333);
        bg.strokeRoundedRect(-w / 2, 0, w, h, 8);
        container.add(bg);

        // Icon
        const icon = this.scene.add.image(-w / 2 + 50, h / 2, item.key).setScale(1.5);
        container.add(icon);

        // Title
        const title = this.scene.add.text(-w / 2 + 100, 20, item.title, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffffff'
        });
        container.add(title);

        // Desc
        const desc = this.scene.add.text(-w / 2 + 100, 50, item.desc, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            fill: '#888888'
        });
        container.add(desc);

        // Buy Button
        const btnW = 100;
        const btnH = 30;
        const btnX = w / 2 - btnW / 2 - 20;
        const btnY = h / 2;

        const btnContainer = this.scene.add.container(btnX, btnY);
        const btnBg = this.scene.add.graphics();
        btnBg.fillStyle(0x00ff00, 1); // Matrix Green
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 4);

        const btnText = this.scene.add.text(0, 0, `BUY ${item.price}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '10px',
            fill: '#000000'
        }).setOrigin(0.5);

        btnContainer.add([btnBg, btnText]);
        btnContainer.setSize(btnW, btnH);
        btnContainer.setInteractive({ useHandCursor: true });

        btnContainer.on('pointerdown', () => {
            SoundManager.play(this.scene, 'cash');
            // Mock Purchase Logic
            console.log(`Bought ${item.title} for ${item.price}`);

            // Visual Feedback
            this.scene.tweens.add({
                targets: btnContainer,
                scale: 0.9,
                yoyo: true,
                duration: 50
            });
        });

        container.add(btnContainer);

        this.windowContainer.add(container);
    }
}
