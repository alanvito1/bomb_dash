import api from '../api.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class CharacterSelectionScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectionScene');
    this.gameMode = 'solo'; // Default game mode
    this.pollingTimer = null;
    this.countdown = 30;
    this.selectedHero = null; // To track the selected hero
    this.selectionIndicator = null; // Visual feedback for selection
  }

  init(data) {
    this.gameMode = data.gameMode || 'solo';
    this.countdown = 30; // Reset countdown on init
    this.selectedHero = null;
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
    this.createActionButtons(centerX, centerY);

    this.fetchAndDisplayHeroes(loadingText);
  }

  createActionButtons(centerX, centerY) {
    // Button to start the selected game mode
    this.playButton = this.add.text(centerX - 100, centerY + 250, 'Start Game', {
        fontSize: '20px', fill: '#90EE90', fontFamily: '"Press Start 2P"',
        stroke: '#000', strokeThickness: 4
    })
    .setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Button to go to the shop
    this.shopButton = this.add.text(centerX + 100, centerY + 250, 'Upgrades', {
        fontSize: '20px', fill: '#00BFFF', fontFamily: '"Press Start 2P"',
        stroke: '#000', strokeThickness: 4
    })
    .setOrigin(0.5).setInteractive({ useHandCursor: true });


    this.playButton.on('pointerdown', () => {
        if (this.selectedHero) {
            SoundManager.play(this, 'click');
            this.startGameWithSelectedHero();
        } else {
            SoundManager.play(this, 'error');
        }
    });

    this.shopButton.on('pointerdown', () => {
        if (this.selectedHero) {
            SoundManager.play(this, 'click');
            // SIF-23: Pass the selected hero data to the ShopScene
            this.scene.start('ShopScene', { hero: this.selectedHero });
        } else {
            SoundManager.play(this, 'error');
        }
    });

    // Initially disable buttons until a hero is selected
    this.disableActionButtons();
  }

  disableActionButtons() {
      this.playButton.setAlpha(0.5);
      this.shopButton.setAlpha(0.5);
  }

  enableActionButtons() {
      this.playButton.setAlpha(1);
      this.shopButton.setAlpha(1);
  }

  async fetchAndDisplayHeroes(loadingText) {
    try {
      const response = await api.getHeroes(); // SIF 21.1: Fetch heroes
      if (response.success && response.heroes.length > 0) {
        this.heroes = response.heroes; // Store heroes for access
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
          this.selectHero(hero, cardX); // Pass card position for indicator
        })
        .on('pointerover', () => background.lineStyle(3, 0xFFD700, 1).strokeRoundedRect(-75, -100, 150, 200, 15))
        .on('pointerout', () => background.lineStyle(2, 0x00ffff, 1).strokeRoundedRect(-75, -100, 150, 200, 15));
    });

    // Create a selection indicator (e.g., an arrow or a highlight)
    this.selectionIndicator = this.add.graphics();
    this.selectionIndicator.fillStyle(0xFFD700, 1);
    this.selectionIndicator.fillTriangle(0, 0, -15, -20, 15, -20);
    this.selectionIndicator.setPosition(startX, startY + 125);
    this.selectionIndicator.setVisible(false); // Initially hidden
  }

  selectHero(heroData, cardX) {
    this.selectedHero = heroData;
    this.registry.set('selectedHero', heroData); // Also keep in registry for other scenes

    // Move and show the indicator
    this.selectionIndicator.setVisible(true);
    this.selectionIndicator.x = cardX;

    // Enable the action buttons
    this.enableActionButtons();
  }

  startGameWithSelectedHero() {
    console.log('Starting game with Hero:', this.selectedHero, 'Game Mode:', this.gameMode);
    if (this.gameMode === 'ranked') {
      this.startMatchmaking(this.selectedHero);
    } else {
      // Default behavior: start a solo game
      this.scene.start('GameScene', { gameMode: 'solo' });
    }
  }

  async startMatchmaking(heroData) {
    try {
      await api.joinMatchmakingQueue(heroData.id);

      this.launchMatchmakingPopup();

      // Start polling for status updates every 2 seconds
      this.pollingTimer = this.time.addEvent({
        delay: 2000,
        callback: this.pollMatchmakingStatus,
        callbackScope: this,
        loop: true
      });

    } catch (error) {
      console.error('Failed to join matchmaking queue:', error);
      // In a real scenario, you'd show an error popup to the user
    }
  }

  launchMatchmakingPopup() {
    const popupMessage = `Searching for Opponent...\nTime remaining: ${this.countdown}s`;

    this.scene.launch('PopupScene', {
      title: 'Ranked Matchmaking',
      message: popupMessage,
      buttons: [{
        label: 'Cancel',
        callback: () => {
          this.stopPolling();
          api.leaveMatchmakingQueue();
          this.scene.stop('PopupScene');
        }
      }],
      originScene: this.scene.key
    });
  }

  async pollMatchmakingStatus() {
    this.countdown -= 2; // Decrement by the polling interval
    const popup = this.scene.get('PopupScene');

    try {
      const response = await api.getMatchmakingStatus();

      if (response.success) {
        switch (response.status) {
          case 'found':
            this.stopPolling();
            this.registry.set('opponent', response.match.opponent);
            popup.updateContent('Match Found!', []);
            this.time.delayedCall(2000, () => {
              this.scene.stop('PopupScene');
              this.scene.start('GameScene', { gameMode: 'ranked' });
            });
            break;

          case 'searching':
            if (this.countdown <= 0) {
              this.handleTimeout();
            } else {
              popup.updateContent(`Searching for Opponent...\nTime remaining: ${this.countdown}s`);
            }
            break;

          default: // Not in queue, maybe cancelled
            this.stopPolling();
            this.scene.stop('PopupScene');
            break;
        }
      } else {
        console.error('Polling failed:', response.message);
        this.stopPolling();
        popup.updateContent('Error finding match.', [{ label: 'Close', callback: () => popup.close() }]);
      }
    } catch (error) {
      console.error('Error during matchmaking poll:', error);
      this.stopPolling();
      if(popup.scene.isActive()){
          popup.updateContent('Connection Error.', [{ label: 'Close', callback: () => popup.close() }]);
      }
    }
  }

  handleTimeout() {
    this.stopPolling();
    const popup = this.scene.get('PopupScene');
    popup.updateContent('No opponents found in time.', [
      {
        label: 'Keep Searching',
        callback: () => {
          this.countdown = 30; // Reset timer
          this.startMatchmaking(this.registry.get('selectedHero'));
        }
      },
      {
        label: 'Play Training',
        callback: () => {
          this.scene.stop('PopupScene');
          this.scene.start('GameScene', { gameMode: 'solo' });
        }
      }
    ]);
  }

  stopPolling() {
    if (this.pollingTimer) {
      this.pollingTimer.remove(false);
      this.pollingTimer = null;
    }
  }

  shutdown() {
    this.stopPolling();
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