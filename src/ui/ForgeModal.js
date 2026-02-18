import UIModal from './UIModal.js';
import api from '../api.js';
import SoundManager from '../utils/sound.js';

export default class ForgeModal extends UIModal {
    constructor(scene) {
        super(scene, 600, 700, 'FORGE OF DESTINY');
        this.inventory = [];
        this.slots = [null, null];
        this.populate();
    }

    async populate() {
        this.slots = [null, null];
        this.refreshUI();
        await this.loadInventory();
        this.refreshUI();
    }

    refreshUI() {
        this.windowContainer.removeAll(true);
        this.createAnvilArea();
        this.addText(0, 50, 'INVENTORY', '#fff', '14px');
        this.renderInventory();
    }

    createAnvilArea() {
        const y = -this.modalHeight / 2 + 150;

        // Slot 1
        this.createSlot(-100, y, 0);

        // Plus Sign
        this.addText(0, y, '+', '#fff', '30px');

        // Slot 2
        this.createSlot(100, y, 1);

        // Fuse Button
        this.fuseBtn = this.createButton(0, y + 100, 'FUSE (50 BCOIN)', 200, 50, () => this.fuseItems());
        this.windowContainer.add(this.fuseBtn);
    }

    createSlot(x, y, index) {
        const size = 80;
        const container = this.scene.add.container(x, y);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRect(-size/2, -size/2, size, size);
        bg.lineStyle(2, 0x00ffff);
        bg.strokeRect(-size/2, -size/2, size, size);

        container.add(bg);
        container.setSize(size, size);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            if (this.slots[index]) {
                this.slots[index] = null;
                this.refreshUI();
            }
        });

        if (this.slots[index]) {
            const item = this.slots[index];
            const icon = this.scene.add.image(0, 0, 'icon_base').setScale(1.5);
            // Try to use item specific texture if available, else generic
            if (this.scene.textures.exists('item_' + item.Item.type)) {
                 icon.setTexture('item_' + item.Item.type);
            }

            const text = this.scene.add.text(0, 20, item.Item.name, {
                fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#fff', align: 'center', wordWrap: { width: size }
            }).setOrigin(0.5);

            container.add([icon, text]);
        } else {
             const placeholder = this.scene.add.text(0, 0, 'EMPTY', {
                fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#333'
            }).setOrigin(0.5);
            container.add(placeholder);
        }

        this.windowContainer.add(container);
    }

    async loadInventory() {
        try {
            const res = await api.getInventory();
            if (res.success) {
                this.inventory = res.inventory;
            }
        } catch (e) {
            console.error(e);
        }
    }

    renderInventory() {
        const startX = -this.modalWidth / 2 + 50;
        const startY = 100;
        const cols = 5;
        const spacing = 100;

        if (this.inventory.length === 0) {
            this.addText(0, startY, 'No Items Found', '#888');
            return;
        }

        this.inventory.forEach((uItem, i) => {
            const x = startX + (i % cols) * spacing;
            const y = startY + Math.floor(i / cols) * spacing;
            this.createInventoryItem(x, y, uItem);
        });
    }

    createInventoryItem(x, y, uItem) {
        const size = 80;
        const container = this.scene.add.container(x, y);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x222222, 1);
        bg.fillRoundedRect(-size/2, -size/2, size, size, 4);

        // Highlight if selected in ANY slot
        const isSelected = this.slots.some(s => s && s.id === uItem.id);
        // Special highlight if selected TWICE (same item in both slots)
        const countSelected = this.slots.filter(s => s && s.id === uItem.id).length;

        if (countSelected > 0) {
            bg.lineStyle(2, 0xffff00); // Yellow border
            bg.strokeRoundedRect(-size/2, -size/2, size, size, 4);
        }

        const name = this.scene.add.text(0, 0, uItem.Item.name, {
             fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#fff', align: 'center', wordWrap: { width: size-10 }
        }).setOrigin(0.5);

        // Quantity Logic: Show "Available / Total" if selected?
        // Just show Total.
        const qty = this.scene.add.text(size/2 - 5, size/2 - 5, `x${uItem.quantity}`, {
             fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#00ff00'
        }).setOrigin(1, 1);

        if (countSelected > 0) {
             // Show selection count indicator
             const selInd = this.scene.add.text(-size/2 + 5, -size/2 + 5, `${countSelected}`, {
                 fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#ffff00', backgroundColor: '#000'
             }).setOrigin(0,0);
             container.add(selInd);
        }

        container.add([bg, name, qty]);
        container.setSize(size, size);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            this.onItemClick(uItem);
        });

        this.windowContainer.add(container);
    }

    onItemClick(uItem) {
        const slot0 = this.slots[0];
        const slot1 = this.slots[1];

        // Logic: Try to fill empty slot first.
        // If clicked item is already in a slot:
        //    - If in slot 0:
        //         - If quantity >= 2 and slot 1 empty: Add to slot 1
        //         - Else: Remove from slot 0
        //    - If in slot 1: Remove from slot 1

        if (slot0 && slot0.id === uItem.id) {
            if (slot1 && slot1.id === uItem.id) {
                // Remove from slot 1 (toggle off second selection)
                this.slots[1] = null;
            } else {
                if (uItem.quantity >= 2 && !slot1) {
                    this.slots[1] = uItem;
                } else {
                    this.slots[0] = null;
                }
            }
        } else if (slot1 && slot1.id === uItem.id) {
            this.slots[1] = null;
        } else {
            // Not in any slot
            if (!slot0) this.slots[0] = uItem;
            else if (!slot1) this.slots[1] = uItem;
        }

        this.refreshUI();
    }

    async fuseItems() {
        if (!this.slots[0] || !this.slots[1]) {
            alert('Select 2 items');
            return;
        }

        // Visual Tension Shake
        this.scene.tweens.add({
            targets: this.windowContainer,
            x: this.windowContainer.x + 5,
            duration: 50,
            yoyo: true,
            repeat: 10
        });
        SoundManager.play(this.scene, 'click');

        try {
            const res = await api.craftItem(this.slots[0].id, this.slots[1].id);

            if (res.success) {
                if (res.result === 'success') {
                    SoundManager.play(this.scene, 'level_up');
                    alert(res.message);
                } else {
                    SoundManager.play(this.scene, 'explosion'); // Break sound
                    alert(res.message);
                }
                this.slots = [null, null];
                await this.loadInventory();
                this.refreshUI();
            } else {
                alert(res.message);
            }
        } catch (e) {
            console.error(e);
            alert('Crafting failed');
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
        bg.fillStyle(0xff0000, 1);
        bg.fillRoundedRect(-w/2, -h/2, w, h, 4);

        const text = this.scene.add.text(0, 0, label, {
             fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#fff'
        }).setOrigin(0.5);

        container.add([bg, text]);
        container.setSize(w, h);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', callback);

        return container;
    }
}
