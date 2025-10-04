import api from '../api.js';
import nftService from '../web3/nft-service.js'; // Import the new NFT service
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { getExperienceForLevel } from '../utils/rpg.js';

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
        if (loadingText.scene) loadingText.destroy();
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
    const startY = this.centerY - 20; // Adjusted for taller cards
    const cardSpacingX = 220;
    const numHeroes = heroes.length;
    const startX = centerX - ((numHeroes - 1) * cardSpacingX) / 2;
    const cardWidth = 200;
    const cardHeight = 320; // Taller card

    // Clear old cards if they exist
    this.heroCards.forEach(cardData => cardData.card.destroy());
    this.heroCards = [];

    this.heroCards = heroes.map((hero, index) => {
      const cardX = startX + (index * cardSpacingX);
      const card = this.add.container(cardX, startY);

      const background = this.add.graphics();
      card.add(background);

      const heroSprite = this.add.sprite(0, -70, hero.sprite_name).setScale(3.5);
      card.add(heroSprite);

      const heroNameText = this.add.text(0, 40, hero.name, { fontSize: '16px', fill: '#FFD700', fontFamily: '"Press Start 2P"', align: 'center' }).setOrigin(0.5);
      card.add(heroNameText);

      const levelText = this.add.text(0, 65, `Lvl: ${hero.level}`, { fontSize: '14px', fill: '#cccccc', fontFamily: '"Press Start 2P"', align: 'center' }).setOrigin(0.5);
      card.add(levelText);

      // --- XP BAR & TEXT ---
      const xpForCurrentLevel = getExperienceForLevel(hero.level);
      const xpForNextLevel = getExperienceForLevel(hero.level + 1);
      const xpProgressInLevel = Math.max(0, hero.xp - xpForCurrentLevel);
      const xpNeededForLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel);
      const progressPercentage = Phaser.Math.Clamp(xpProgressInLevel / xpNeededForLevel, 0, 1);

      const xpBarBg = this.add.graphics().fillStyle(0x111111).fillRect(-80, 85, 160, 12);
      card.add(xpBarBg);
      const xpBarFg = this.add.graphics().fillStyle(0xFFD700).fillRect(-80, 85, 160 * progressPercentage, 12);
      card.add(xpBarFg);
      const xpText = this.add.text(0, 105, `XP: ${hero.xp} / ${xpForNextLevel}`, { fontSize: '10px', fill: '#ffffff', fontFamily: '"Press Start 2P"' }).setOrigin(0.5);
      card.add(xpText);

      // --- LEVEL UP BUTTON ---
      const levelUpButton = this.add.text(0, 135, LanguageManager.get('level_up_button') || 'LEVEL UP', {
          fontSize: '16px',
          fontFamily: '"Press Start 2P"',
          align: 'center',
          padding: { x: 8, y: 4 },
      }).setOrigin(0.5);
      card.add(levelUpButton);

      if (hero.xp >= xpForNextLevel) {
          levelUpButton.setInteractive({ useHandCursor: true })
              .setStyle({ fill: '#90EE90', backgroundColor: '#003300' })
              .on('pointerdown', (pointer) => {
                  pointer.stopPropagation();
                  this.handleLevelUp(hero);
              })
              .on('pointerover', () => levelUpButton.setStyle({ fill: '#FFFFFF', backgroundColor: '#005500' }))
              .on('pointerout', () => levelUpButton.setStyle({ fill: '#90EE90', backgroundColor: '#003300' }));
      } else {
          levelUpButton.setStyle({ fill: '#AAAAAA', backgroundColor: '#333333' });
      }

      if (hero.isNFT) {
          const nftIndicator = this.add.text(0, -145, 'NFT', { fontSize: '10px', fill: '#00ffff', fontFamily: '"Press Start 2P"', align: 'center', backgroundColor: '#00000099', padding: {x: 4, y: 2} }).setOrigin(0.5);
          card.add(nftIndicator);
      }

      card.setSize(cardWidth, cardHeight);
      card.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.selectHero(hero, card, index))
        .on('pointerover', () => {
             if (this.selectedHero?.id !== hero.id) {
                background.lineStyle(3, '#FFD700', 1).strokeRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 15);
             }
        })
        .on('pointerout', () => {
            if (this.selectedHero?.id !== hero.id) {
                background.lineStyle(2, '#00ffff', 0.8).strokeRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 15);
            }
        });

      // Store button for later use if needed
      card.setData('levelUpButton', levelUpButton);

      // Initial draw of the card border
      background.fillStyle(0x000000, 0.7).fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 15);
      background.lineStyle(2, '#00ffff', 0.8).strokeRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 15);

      return { card, background, hero };
    });

    // After creating all cards, if a hero was already selected, re-select them visually
    if (this.selectedHero) {
        const previouslySelectedIndex = this.heroCards.findIndex(c => c.hero.id === this.selectedHero.id);
        if (previouslySelectedIndex !== -1) {
            this.selectHero(this.selectedHero, this.heroCards[previouslySelectedIndex].card, previouslySelectedIndex, true);
        }
    }
  }

  async handleLevelUp(hero) {
    SoundManager.play(this, 'click');
    console.log(`Initiating level up for hero: ${hero.id}`);

    const cardData = this.heroCards.find(c => c.hero.id === hero.id);
    if (!cardData) return;

    const levelUpButton = cardData.card.getData('levelUpButton');
    if (!levelUpButton) return;

    // Provide immediate UI feedback
    levelUpButton.setText('PROCESSING...')
        .disableInteractive()
        .setStyle({ fill: '#FFA500', backgroundColor: '#552A00' }); // Orange for "in progress"

    try {
        const response = await api.levelUpHero(hero.id);

        if (response.success) {
            SoundManager.play(this, 'powerup');
            console.log('Level up successful!', response.hero);

            // Update the local hero data
            const heroIndex = this.heroes.findIndex(h => h.id === hero.id);
            if (heroIndex !== -1) {
                this.heroes[heroIndex] = response.hero;
            }
            if (this.selectedHero && this.selectedHero.id === hero.id) {
                this.registry.set('selectedHero', response.hero);
                this.selectedHero = response.hero;
            }

            // Redraw all hero cards with the new data
            this.displayHeroes(this.heroes);

            this.scene.launch('PopupScene', {
                title: 'Success!',
                message: `${response.hero.name} is now Level ${response.hero.level}!`
            });

        } else {
            throw new Error(response.message || 'Level up failed on the server.');
        }

    } catch (error) {
        SoundManager.play(this, 'error');
        console.error('Level up process failed:', error);

        this.scene.launch('PopupScene', {
            title: 'Level Up Failed',
            message: error.message || 'An unknown error occurred. Check console for details.'
        });

        // Revert the button by redrawing the cards
        this.displayHeroes(this.heroes);
    }
  }

  selectHero(heroData, selectedContainer, selectedIndex, silent = false) {
    if (!silent) {
        SoundManager.play(this, 'click');
    }
    this.selectedHero = heroData;
    this.registry.set('selectedHero', heroData);

    const cardWidth = 200;
    const cardHeight = 320;

    // Update visual feedback for all cards
    this.heroCards.forEach((cardData, index) => {
        cardData.background.clear();
        if (index === selectedIndex) {
            cardData.background.fillStyle(0x000000, 0.9).fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 15);
            cardData.background.lineStyle(4, '#FFD700', 1).strokeRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 15);
        } else {
            cardData.background.fillStyle(0x000000, 0.7).fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 15);
            cardData.background.lineStyle(2, '#00ffff', 0.8).strokeRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 15);
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