import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import { ethers } from 'ethers';
import { getExperienceForLevel } from '../utils/rpg.js';

const BCOIN_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const SPENDER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const BCOIN_ABI = ["function approve(address spender, uint256 amount) public returns (bool)"];

export default class ProfileScene extends Phaser.Scene {
  constructor() {
    super('ProfileScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Add a background
    this.add.image(centerX, centerY, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    // Title
    this.add.text(centerX, 50, LanguageManager.get(this, 'profile_title') || 'My Heroes', {
      fontSize: '28px', fill: '#FFD700', fontFamily: 'monospace',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    // Create a scrollable area for hero cards
    this.createScrollableInventory(centerX, centerY);

    // Add buttons
    this.createLevelUpButton(centerX, this.scale.height - 150);
    this.createBackButton(centerX, this.scale.height - 80);

    this.refreshStats(); // Initial data load
  }

  createScrollableInventory(x, y) {
    // This container will hold all hero cards and will be moved for scrolling
    this.inventoryContainer = this.add.container(x, y - 80);
    const scrollAreaHeight = 300;
    const scrollAreaWidth = 340;

    // A mask to create the "window" for the scrollable area
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.beginPath();
    maskShape.fillRect(x - scrollAreaWidth / 2, y - 80 - scrollAreaHeight / 2, scrollAreaWidth, scrollAreaHeight);
    const mask = maskShape.createGeometryMask();
    this.inventoryContainer.setMask(mask);

    // For now, we only add one hero. This can be expanded to a list.
    // The 'y' position of the card will be relative to the container.
    this.displayHeroCard(0, 0);

    // Add scroll logic
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
        // This is where you would add logic to clamp the container's y position
        // for multiple cards. For now, it is disabled.
        // this.inventoryContainer.y -= deltaY * 0.5;
    });
  }

  displayHeroCard(x, y) {
    const cardWidth = 320;
    const cardHeight = 180;

    // The card is added to the main inventory container
    const card = this.add.container(x, y);

    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
    background.lineStyle(2, 0x00ffff, 1);
    background.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
    card.add(background);

    // Use the ninja sprite for the default hero
    const heroImage = this.add.image(-cardWidth / 2 + 60, 0, 'ninja_frame_0').setScale(0.2);
    card.add(heroImage);

    const textStyle = { fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace', align: 'left' };
    const statX = 20; // Positioned to the right of the image
    const statStartY = -cardHeight / 2 + 30;
    const statSpacing = 25;

    this.levelText = this.add.text(statX, statStartY, '', textStyle).setOrigin(0, 0.5);
    this.hpText = this.add.text(statX, statStartY + statSpacing, '', textStyle).setOrigin(0, 0.5);
    this.damageText = this.add.text(statX, statStartY + statSpacing * 2, '', textStyle).setOrigin(0, 0.5);
    this.speedText = this.add.text(statX, statStartY + statSpacing * 3, '', textStyle).setOrigin(0, 0.5);
    this.fireRateText = this.add.text(statX, statStartY + statSpacing * 4, '', textStyle).setOrigin(0, 0.5);

    card.add([this.levelText, this.hpText, this.damageText, this.speedText, this.fireRateText]);

    // Add the card to the scrollable container
    this.inventoryContainer.add(card);
  }

  async refreshStats() {
    try {
        const response = await api.getCurrentUser();
        if (response.success && response.user) {
            this.registry.set('loggedInUser', response.user);
            this.updateStatDisplays(response.user);
        } else {
            const user = this.registry.get('loggedInUser');
            if (user) this.updateStatDisplays(user);
        }
    } catch (e) {
        console.error("Failed to refresh stats from server:", e);
        const user = this.registry.get('loggedInUser');
        if (user) this.updateStatDisplays(user);
    }
  }

  updateStatDisplays(stats) {
      const { level = 1, hp = 100, maxHp = 100, damage = 1, speed = 200, fireRate = 600, xp = 0 } = stats;
      this.levelText.setText(`Level: ${level}`);
      this.hpText.setText(`HP: ${hp}/${maxHp}`);
      this.damageText.setText(`Damage: ${damage}`);
      this.speedText.setText(`Speed: ${speed}`);
      this.fireRateText.setText(`Fire Rate: ${fireRate}`);

      if (this.levelUpButton) {
        const xpForNextLevel = getExperienceForLevel(level + 1);
        if (xp >= xpForNextLevel) {
            this.levelUpButton.setInteractive({ useHandCursor: true }).setStyle({ fill: '#00ff00' });
        } else {
            this.levelUpButton.disableInteractive().setStyle({ fill: '#888888' });
        }
      }
  }

  createLevelUpButton(centerX, y) {
    this.levelUpButton = this.add.text(centerX, y, 'Level Up (1 BCOIN)', {
        fontSize: '18px', fill: '#888888', backgroundColor: '#00000099',
        padding: { x: 10, y: 5 }, fontFamily: 'monospace'
    }).setOrigin(0.5).disableInteractive();

    this.messageText = this.add.text(centerX, y + 40, '', {
        fontSize: '16px', fill: '#ff0000', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.levelUpButton.on('pointerdown', async () => {
        if (!this.levelUpButton.input.enabled) return;

        try {
            SoundManager.play(this, 'click');
            this.messageText.setText('Connecting to wallet...').setStyle({ fill: '#ffff00' });

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);

            this.messageText.setText('Please approve the 1 BCOIN fee...');
            const feeInWei = ethers.parseUnits('1', 18);
            const tx = await bcoinContract.approve(SPENDER_ADDRESS, feeInWei);

            this.levelUpButton.disableInteractive().setText('Confirming...');
            await tx.wait();

            this.messageText.setText('Processing level up...');
            const result = await api.levelUp();

            if (result.success) {
                this.messageText.setStyle({ fill: '#00ff00' }).setText(result.message);
                await this.refreshStats();
            } else {
                throw new Error(result.message || 'Level up failed on server.');
            }
        } catch (error) {
            this.messageText.setStyle({ fill: '#ff0000' }).setText(error.message.substring(0, 50));
            console.error('Level up failed:', error);
            this.time.delayedCall(3000, () => this.refreshStats());
        }
    });
  }

  createBackButton(centerX, y) {
    const backBtn = this.add.text(centerX, y, '< Back to Menu', {
      fontSize: '20px', fill: '#00ffff', backgroundColor: '#111',
      padding: { x: 10, y: 5 }, fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('MenuScene');
    });
  }
}