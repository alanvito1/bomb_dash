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
        currency: 'gold',
      },
      {
        key: 'item_potion',
        title: 'Health Potion',
        desc: 'Restores 50 HP',
        price: '100 G',
        currency: 'gold',
      },
      {
        key: 'item_gems',
        title: 'Gem Pack',
        desc: '10 Premium Gems',
        price: '5 B',
        currency: 'bcoin',
      },
      // New Slots for Future Upgrades
      {
        key: 'item_power', // Will fallback to procedural generic
        title: 'Power Up',
        desc: '+1 Power (Permanent)',
        price: '1000 G',
        currency: 'gold',
      },
      {
        key: 'item_mystery', // Will fallback to procedural generic
        title: 'Mystery Box',
        desc: 'Random Surprise',
        price: '250 G',
        currency: 'gold',
      }
    ];

    const startY = -this.modalHeight / 2 + 80;
    const cardHeight = 120; // Reduce height slightly if needed to fit more, or enable scrolling
    // With 5 items, 5 * 140 = 700 > 600. So we need scrolling or smaller cards.
    // Let's make cards smaller or use a scroll container.
    // Since UIModal doesn't seem to support scroll natively easily here (just a container),
    // I will just make them smaller or let them overflow (which is bad).
    // Or I can use a grid layout like HeroesModal.
    // The prompt says "Add spaces (slots)". A grid is better for slots.

    // Let's refactor to a 2-column grid to fit more items.
    const cols = 2;
    const cardW = 160;
    const cardH = 100;
    const gap = 15;

    // Calculate start positions
    // Total width = 2 * 160 + 15 = 335. Modal width is 400. Matches well.
    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = -totalW / 2 + cardW / 2;

    // Start Y
    const gridStartY = -this.modalHeight / 2 + 100;

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const x = startX + col * (cardW + gap);
      const y = gridStartY + row * (cardH + gap);

      this.createShopCard(x, y, cardW, cardH, item);
    });
  }

  createShopCard(x, y, w, h, item) {
    const container = this.scene.add.container(x, y);

    // Card Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x111111, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8); // Center origin
    bg.lineStyle(1, 0x333333);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    container.add(bg);

    // Icon (Left side)
    const iconKey = this.scene.textures.exists(item.key) ? item.key : 'item_chest'; // Safe fallback if generic fails to generate
    // Note: AssetLoader's generic fallback works by creating the texture.
    // If it's 'item_power', AssetLoader might not have run for it if it's not in the list.
    // But TextureGenerator can be called here too?
    // Let's rely on the generic fallback I added in AssetLoader?
    // Wait, AssetLoader only runs once on start. If I add new keys here that are NOT in AssetLoader list, they won't be generated.
    // So I should ensure they exist.
    if (!this.scene.textures.exists(item.key)) {
        // Generate on the fly if missing (e.g. item_power)
        // We can use a simple rect or text if TextureGenerator doesn't support it.
        // Or assume the "missing" texture (green box) is avoided by checking.
        const g = this.scene.make.graphics({x:0, y:0, add:false});
        g.fillStyle(0x555555);
        g.fillRect(0,0,32,32);
        g.generateTexture(item.key, 32, 32);
    }

    const icon = this.scene.add
      .image(-w / 2 + 30, 0, item.key)
      .setScale(1.2);
    container.add(icon);

    // Title (Top Right)
    const title = this.scene.add.text(-w / 2 + 60, -h/2 + 20, item.title, {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      fill: '#ffffff',
      wordWrap: { width: w - 70 }
    }).setOrigin(0, 0.5);
    container.add(title);

    // Price (Bottom Right)
    const btnW = 80;
    const btnH = 24;
    const btnX = w / 2 - btnW / 2 - 10;
    const btnY = h / 2 - 20;

    const btnContainer = this.scene.add.container(btnX, btnY);
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x00ff00, 1); // Matrix Green
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 4);

    const btnText = this.scene.add
      .text(0, 0, item.price, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        fill: '#000000',
      })
      .setOrigin(0.5);

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
        duration: 50,
      });
    });

    container.add(btnContainer);

    this.windowContainer.add(container);
  }
}
