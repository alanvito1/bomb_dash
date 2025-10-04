import api from '../api.js';
import nftService from '../web3/nft-service.js'; // Import the new NFT service
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class CharacterSelectionScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectionScene');
    this.gameMode = 'solo';
    this.pollingTimer = null;
    this.countdown = 30;
    this.selectedHero = null;
    this.selectionIndicator = null;
    this.heroCards = [];
  }

  init(data) {
    this.gameMode = data.gameMode || 'solo';
    this.countdown = 30;
    this.selectedHero = null;
  }

  create() {
    const centerX = this.cameras.main.centerX;
    this.centerY = this.cameras.main.centerY;

    // --- Visual Polish: Background and Data Window ---
    this.add.image(centerX, this.centerY, 'menu_bg_vertical').setOrigin(0.5).setDisplaySize(this.scale.width, this.scale.height);
    this.add.graphics().fillStyle(0x000000, 0.8).fillRect(20, 20, this.scale.width - 40, this.scale.height - 40);

    // --- Visual Polish: Standard Font Styles ---
    const titleStyle = { fontSize: '24px', fill: '#FFD700', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 };
    const textStyle = { fontSize: '16px', fill: '#ffffff', fontFamily: '"Press Start 2P"' };
    const buttonStyle = { fontSize: '16px', fill: '#00ffff', fontFamily: '"Press Start 2P"', backgroundColor: '#00000099', padding: { x: 10, y: 5 } };

    this.add.text(centerX, 70, LanguageManager.get('char_select_title'), titleStyle).setOrigin(0.5);

    const loadingText = this.add.text(centerX, this.centerY, LanguageManager.get('char_select_loading'), textStyle).setOrigin(0.5);

    this.createBackButton(centerX, this.scale.height - 60, buttonStyle);
    this.createActionButtons(centerX, this.scale.height - 120, buttonStyle);

    this.fetchAndDisplayHeroes(loadingText);
  }

  createActionButtons(x, y, style) {
    this.playButton = this.add.text(x, y, LanguageManager.get('char_select_start_game'), { ...style, fill: '#90EE90' })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.shopButton = this.add.text(x, y + 50, LanguageManager.get('char_select_upgrades'), style)
        .setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.playButton.on('pointerdown', () => {
        if (this.playButton.input.enabled) {
            SoundManager.play(this, 'click');
            this.startGameWithSelectedHero();
        } else { SoundManager.play(this, 'error'); }
    });

    this.shopButton.on('pointerdown', () => {
        if (this.shopButton.input.enabled) {
            SoundManager.play(this, 'click');
            this.scene.start('ShopScene', { hero: this.selectedHero });
        } else { SoundManager.play(this, 'error'); }
    });

    // Hover Effects
    this.playButton.on('pointerover', () => { if(this.playButton.input.enabled) this.playButton.setStyle({ fill: '#ffffff' })});
    this.playButton.on('pointerout', () => { if(this.playButton.input.enabled) this.playButton.setStyle({ fill: '#90EE90' })});
    this.shopButton.on('pointerover', () => { if(this.shopButton.input.enabled) this.shopButton.setStyle({ fill: '#ffffff' })});
    this.shopButton.on('pointerout', () => { if(this.shopButton.input.enabled) this.shopButton.setStyle({ fill: '#00ffff' })});

    this.disableActionButtons();
  }

  disableActionButtons() {
      this.playButton.disableInteractive().setAlpha(0.5);
      this.shopButton.disableInteractive().setAlpha(0.5);
  }

  enableActionButtons() {
      this.playButton.setInteractive({ useHandCursor: true }).setAlpha(1);
      this.shopButton.setInteractive({ useHandCursor: true }).setAlpha(1);
  }

  async fetchAndDisplayHeroes(loadingText) {
    // 1. Attempt to fetch NFT heroes first
    loadingText.setText(LanguageManager.get('char_select_loading_nfts'));

    try {
        const nftResponse = await nftService.getOwnedNfts();

        if (nftResponse.success && nftResponse.heroes.length > 0) {
            // NFTs found, display them
            this.heroes = nftResponse.heroes;
            loadingText.destroy();
            this.displayHeroes(nftResponse.heroes);
            return; // Stop here, no need to fetch mock heroes
        } else if (!nftResponse.success) {
            // An error occurred, but we can still try the fallback
            console.warn('NFT Service Error:', nftResponse.message);
            // We will proceed to the fallback, but we could show a temporary warning here if desired.
        }
        // If no NFTs are found (success: true, heroes: []), we proceed to the fallback.

    } catch (error) {
        console.error('A critical error occurred while fetching NFTs:', error);
        // Fall through to fetching mock heroes as a last resort
    }

    // 2. Fallback to fetching mock heroes from the API
    loadingText.setText(LanguageManager.get('char_select_loading_mock'));
    try {
      const apiResponse = await api.getHeroes();
      if (apiResponse.success && apiResponse.heroes.length > 0) {
        this.heroes = apiResponse.heroes;
        loadingText.destroy();
        this.displayHeroes(apiResponse.heroes);
      } else if (apiResponse.success && apiResponse.heroes.length === 0) {
        loadingText.setText(LanguageManager.get('char_select_no_heroes'));
      } else {
        loadingText.setText(LanguageManager.get('char_select_error', { message: apiResponse.message }));
      }
    } catch (error) {
      console.error('Failed to fetch mock heroes:', error);
      loadingText.setText(LanguageManager.get('char_select_error_connection'));
    }
  }

  displayHeroes(heroes) {
    const centerX = this.cameras.main.centerX;
    const startY = this.centerY - 50;
    const cardSpacingX = 200;
    const numHeroes = heroes.length;
    const startX = centerX - ((numHeroes - 1) * cardSpacingX) / 2;

    this.heroCards = heroes.map((hero, index) => {
      const cardX = startX + (index * cardSpacingX);
      const card = this.add.container(cardX, startY);

      const background = this.add.graphics();
      background.fillStyle(0x000000, 0.7);
      background.fillRoundedRect(-85, -120, 170, 240, 15);
      background.lineStyle(2, '#00ffff', 0.8);
      background.strokeRoundedRect(-85, -120, 170, 240, 15);
      card.add(background);

      const heroSprite = this.add.sprite(0, -30, hero.sprite_name).setScale(3);
      card.add(heroSprite);

      const heroNameText = this.add.text(0, 70, hero.name, { fontSize: '16px', fill: '#FFD700', fontFamily: '"Press Start 2P"', align: 'center' }).setOrigin(0.5);
      card.add(heroNameText);

      const levelText = this.add.text(0, 95, `Lvl: ${hero.level}`, { fontSize: '12px', fill: '#cccccc', fontFamily: '"Press Start 2P"', align: 'center' }).setOrigin(0.5);
      card.add(levelText);

      // Add a small indicator for NFT heroes
      if (hero.isNFT) {
          const nftIndicator = this.add.text(0, 115, 'NFT', { fontSize: '10px', fill: '#00ffff', fontFamily: '"Press Start 2P"', align: 'center' }).setOrigin(0.5);
          card.add(nftIndicator);
      }

      card.setSize(170, 240);
      card.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectHero(hero, card, index))
        .on('pointerover', () => background.lineStyle(3, '#FFD700', 1).strokeRoundedRect(-85, -120, 170, 240, 15))
        .on('pointerout', () => background.lineStyle(2, '#00ffff', 0.8).strokeRoundedRect(-85, -120, 170, 240, 15));

      return { card, background };
    });
  }

  selectHero(heroData, selectedContainer, selectedIndex) {
    SoundManager.play(this, 'click');
    this.selectedHero = heroData;
    this.registry.set('selectedHero', heroData);

    // Update visual feedback for all cards
    this.heroCards.forEach((cardData, index) => {
        if (index === selectedIndex) {
            cardData.background.clear().fillStyle(0x000000, 0.9).fillRoundedRect(-85, -120, 170, 240, 15);
            cardData.background.lineStyle(4, '#FFD700', 1).strokeRoundedRect(-85, -120, 170, 240, 15);
        } else {
            cardData.background.clear().fillStyle(0x000000, 0.7).fillRoundedRect(-85, -120, 170, 240, 15);
            cardData.background.lineStyle(2, '#00ffff', 0.8).strokeRoundedRect(-85, -120, 170, 240, 15);
        }
    });

    this.enableActionButtons();
  }

  startGameWithSelectedHero() {
    // For NFT heroes, we might not need to pass the full object if the backend can re-fetch details
    // But for now, we pass the whole object for consistency with mock heroes.
    console.log('Starting game with Hero:', this.selectedHero, 'Game Mode:', this.gameMode);
    this.scene.start('GameScene', { gameMode: this.gameMode || 'solo' });
  }

  createBackButton(x, y, style) {
    const backBtn = this.add.text(x, y, LanguageManager.get('back_button'), style)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
        SoundManager.play(this, 'click');
        this.scene.start('MenuScene');
    });

    backBtn.on('pointerover', () => backBtn.setStyle({ fill: '#ffffff' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ fill: '#00ffff' }));
  }

  shutdown() {
    if (this.pollingTimer) {
      this.pollingTimer.remove(false);
      this.pollingTimer = null;
    }
  }
}