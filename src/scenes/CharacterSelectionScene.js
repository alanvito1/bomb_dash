import api from '../api.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class CharacterSelectionScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectionScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.image(centerX, centerY, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    this.add.text(centerX, 50, 'Select Your Hero', {
      fontSize: '28px',
      fill: '#FFD700',
      fontFamily: '"Press Start 2P"',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5);

    const loadingText = this.add.text(centerX, centerY, 'Loading Heroes...', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: '"Press Start 2P"'
    }).setOrigin(0.5);

    this.createBackButton(centerX, this.scale.height - 50);

    this.fetchAndDisplayHeroes(loadingText);
  }

  async fetchAndDisplayHeroes(loadingText) {
    try {
      const response = await api.getHeroes(); // SIF 21.1: Fetch heroes
      if (response.success && response.heroes.length > 0) {
        loadingText.destroy();
        this.displayHeroes(response.heroes);
      } else if (response.success && response.heroes.length === 0) {
        loadingText.setText('No heroes found.\nPlay a match to get one!');
      } else {
        loadingText.setText(`Error: ${response.message}`);
      }
    } catch (error) {
      console.error('Failed to fetch heroes:', error);
      loadingText.setText('Error connecting to the server.');
    }
  }

  displayHeroes(heroes) {
    const centerX = this.cameras.main.centerX;
    const startY = 150;
    const cardSpacingX = 180;
    const numHeroes = heroes.length;
    const startX = centerX - ((numHeroes - 1) * cardSpacingX) / 2;

    heroes.forEach((hero, index) => {
      const cardX = startX + (index * cardSpacingX);

      const card = this.add.container(cardX, startY);
      const background = this.add.graphics();
      background.fillStyle(0x000000, 0.7);
      background.fillRoundedRect(-75, -100, 150, 200, 15);
      background.lineStyle(2, 0x00ffff, 1);
      background.strokeRoundedRect(-75, -100, 150, 200, 15);
      card.add(background);

      // Display Hero Sprite
      // The sprite key should match the one in asset-manifest.json
      const heroSprite = this.add.sprite(0, -20, hero.sprite_name).setScale(2);
      card.add(heroSprite);

      // Display Hero Name
      const heroNameText = this.add.text(0, 70, hero.name, {
        fontSize: '16px',
        fill: '#FFD700',
        fontFamily: '"Press Start 2P"',
        align: 'center'
      }).setOrigin(0.5);
      card.add(heroNameText);

      card.setSize(150, 200);
      card.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          SoundManager.play(this, 'click');
          this.selectHero(hero);
        })
        .on('pointerover', () => background.lineStyle(3, 0xFFD700, 1).strokeRoundedRect(-75, -100, 150, 200, 15))
        .on('pointerout', () => background.lineStyle(2, 0x00ffff, 1).strokeRoundedRect(-75, -100, 150, 200, 15));
    });
  }

  selectHero(heroData) {
    console.log('Selected Hero:', heroData);
    // SIF 21.1: Store the selected hero's data in the registry
    this.registry.set('selectedHero', heroData);
    this.scene.start('GameScene');
  }

  createBackButton(centerX, y) {
    const backBtn = this.add.text(centerX, y, '< Back', {
      fontSize: '20px',
      fill: '#00ffff',
      fontFamily: '"Press Start 2P"'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('MenuScene');
    });
  }
}