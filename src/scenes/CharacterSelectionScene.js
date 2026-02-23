import api from '../api.js';
import stakingService from '../web3/staking-service.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { getExperienceForLevel } from '../utils/rpg.js';
import {
  createButton,
  createTitle,
  createPanel,
} from '../modules/UIGenerator.js';
import TextureGenerator from '../modules/TextureGenerator.js';

export default class CharacterSelectionScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectionScene');
    this.gameMode = 'solo';
    this.selectedHero = null;
    this.heroCards = [];
  }

  init(data) {
    this.gameMode = data.gameMode || 'solo';
    this.selectedHero = null;
  }

  create() {
    const centerX = this.cameras.main.centerX;
    this.centerY = this.cameras.main.centerY;

    this.add
      .image(centerX, this.centerY, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);
    createPanel(this, 20, 20, this.scale.width - 40, this.scale.height - 40);

    const textStyle = {
      fontSize: '16px',
      fill: '#ffffff',
      fontFamily: '"Press Start 2P"',
    };

    createTitle(this, centerX, 70, LanguageManager.get('char_select_title'));

    const loadingText = this.add
      .text(
        centerX,
        this.centerY,
        LanguageManager.get('char_select_loading'),
        textStyle
      )
      .setOrigin(0.5);

    this.createBackButton(centerX, this.scale.height - 60);
    this.createActionButtons(centerX, this.scale.height - 120);

    this.fetchAndDisplayHeroes(loadingText);
  }

  createActionButtons(x, y) {
    this.playButton = createButton(
      this,
      x,
      y,
      LanguageManager.get('char_select_start_game'),
      () => {
        if (this.playButton.input.enabled) {
          this.startGameWithSelectedHero();
        } else {
          SoundManager.play(this, 'error');
        }
      }
    ).setName('confirm_button');

    this.shopButton = createButton(
      this,
      x,
      y - 60,
      LanguageManager.get('char_select_upgrades'),
      () => {
        if (this.shopButton.input.enabled) {
          this.scene.start('ShopScene', { hero: this.selectedHero });
        } else {
          SoundManager.play(this, 'error');
        }
      }
    );

    // TESTNET MINT BUTTON
    this.mintButton = createButton(this, x, y - 120, 'MINT FREE HERO', () => {
      this.handleMintHero();
    });

    this.disableActionButtons();
  }

  disableActionButtons() {
    this.playButton.disableInteractive().setAlpha(0.5);
    this.shopButton.disableInteractive().setAlpha(0.5);
  }

  enableActionButtons() {
    if (!this.selectedHero) {
      this.disableActionButtons();
      return;
    }
    this.shopButton.setInteractive({ useHandCursor: true }).setAlpha(1);

    const isPlayable =
      this.selectedHero.hero_type === 'mock' ||
      this.selectedHero.status === 'staked';
    if (isPlayable) {
      this.playButton.setInteractive({ useHandCursor: true }).setAlpha(1);
    } else {
      this.playButton.disableInteractive().setAlpha(0.5);
    }
  }

  async handleMintHero() {
    SoundManager.play(this, 'click');
    const loadingText = this.add
      .text(this.cameras.main.centerX, this.centerY, 'MINTING...', {
        fontSize: '20px',
        fill: '#ffffff',
        fontFamily: '"Press Start 2P"',
      })
      .setOrigin(0.5)
      .setDepth(100);

    try {
      const response = await api.mintTestHero();
      if (response.success) {
        SoundManager.play(this, 'powerup');
        // Give some BCOIN too for testing
        await api.mintTestBcoin();

        loadingText.destroy();
        this.scene.launch('PopupScene', {
          title: 'MINT SUCCESS!',
          message: `You got a ${response.hero.rarity} ${response.hero.sprite_name}!`,
          onClose: () => {
            // Refresh hero list
            this.scene.restart();
          },
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      loadingText.destroy();
      SoundManager.play(this, 'error');
      this.scene.launch('PopupScene', {
        title: 'Mint Failed',
        message: error.message || 'Unknown error',
      });
    }
  }

  async fetchAndDisplayHeroes(loadingText) {
    loadingText.setText(LanguageManager.get('char_select_loading'));
    try {
      const apiResponse = await api.getHeroes();
      if (!this.sys || !this.scene) return; // Prevent crash if scene destroyed
      if (apiResponse.success && apiResponse.heroes.length > 0) {
        this.heroes = apiResponse.heroes;
        if (loadingText.scene) loadingText.destroy();
        this.displayHeroes(apiResponse.heroes);
      } else if (apiResponse.success && apiResponse.heroes.length === 0) {
        loadingText.setText(LanguageManager.get('char_select_no_heroes'));
      } else {
        loadingText.setText(
          LanguageManager.get('char_select_error', {
            message: apiResponse.message,
          })
        );
      }
    } catch (error) {
      console.error('Failed to fetch heroes from backend:', error);
      loadingText.setText(LanguageManager.get('char_select_error_connection'));
    }
  }

  displayHeroes(heroes) {
    const centerX = this.cameras.main.centerX;
    const startY = this.centerY - 20;
    const cardSpacingX = 220;
    const numHeroes = heroes.length;
    const startX = centerX - ((numHeroes - 1) * cardSpacingX) / 2;
    const cardWidth = 200;
    const cardHeight = 350; // Increased height

    this.heroCards.forEach((cardData) => cardData.card.destroy());
    this.heroCards = [];

    this.heroCards = heroes.map((hero, index) => {
      const cardX = startX + index * cardSpacingX;
      const card = this.add.container(cardX, startY);
      const background = this.add.graphics();
      card.add(background);

      // Check Rarity/Type Gating
      const isLocked =
        (hero.rarity && hero.rarity !== 'Common') ||
        (hero.nft_type && hero.nft_type === 'HOUSE');

      TextureGenerator.ensureHero(this, hero.sprite_name);

      const heroSprite = this.add
        .sprite(0, -80, hero.sprite_name)
        .setScale(3.5);
      if (isLocked) heroSprite.setTint(0x555555); // Darken sprite
      card.add(heroSprite);

      const heroNameText = this.add
        .text(0, 40, hero.name, {
          fontSize: '16px',
          fill: isLocked ? '#888888' : '#FFD700',
          fontFamily: '"Press Start 2P"',
          align: 'center',
        })
        .setOrigin(0.5);
      card.add(heroNameText);
      const levelText = this.add
        .text(0, 65, `Lvl: ${hero.level}`, {
          fontSize: '14px',
          fill: '#cccccc',
          fontFamily: '"Press Start 2P"',
          align: 'center',
        })
        .setOrigin(0.5);
      card.add(levelText);

      const xpForCurrentLevel = getExperienceForLevel(hero.level);
      const xpForNextLevel = getExperienceForLevel(hero.level + 1);
      const xpProgressInLevel = Math.max(0, hero.xp - xpForCurrentLevel);
      const xpNeededForLevel = Math.max(1, xpForNextLevel - xpForCurrentLevel);
      const progressPercentage = Phaser.Math.Clamp(
        xpProgressInLevel / xpNeededForLevel,
        0,
        1
      );
      const xpBarBg = this.add
        .graphics()
        .fillStyle(0x111111)
        .fillRect(-80, 85, 160, 12);
      card.add(xpBarBg);
      const xpBarFg = this.add
        .graphics()
        .fillStyle(0xffd700)
        .fillRect(-80, 85, 160 * progressPercentage, 12);
      card.add(xpBarFg);
      const xpText = this.add
        .text(0, 105, `XP: ${hero.xp} / ${xpForNextLevel}`, {
          fontSize: '10px',
          fill: '#ffffff',
          fontFamily: '"Press Start 2P"',
        })
        .setOrigin(0.5);
      card.add(xpText);

      const actionY = 155;
      if (hero.hero_type === 'nft') {
        const statusText = this.add
          .text(
            0,
            actionY - 20,
            `Status: ${hero.status === 'staked' ? 'Staked' : 'In Wallet'}`,
            {
              fontSize: '12px',
              fill: '#cccccc',
              fontFamily: '"Press Start 2P"',
            }
          )
          .setOrigin(0.5);
        card.add(statusText);

        if (hero.status === 'in_wallet') {
          const depositButton = this.add
            .text(0, actionY + 10, 'Deposit to Play', {
              fontSize: '14px',
              fontFamily: '"Press Start 2P"',
              fill: '#00ffff',
              backgroundColor: '#003333',
              padding: { x: 8, y: 4 },
            })
            .setOrigin(0.5);
          depositButton
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', (pointer) => {
              pointer.stopPropagation();
              this.handleDepositHero(hero, depositButton);
            })
            .on('pointerover', () =>
              depositButton.setStyle({ fill: '#ffffff' })
            )
            .on('pointerout', () =>
              depositButton.setStyle({ fill: '#00ffff' })
            );
          card.add(depositButton);
          card.setData('depositButton', depositButton);
        } else {
          // status === 'staked'
          const withdrawButton = this.add
            .text(0, actionY + 10, 'Withdraw', {
              fontSize: '14px',
              fontFamily: '"Press Start 2P"',
              fill: '#FF6347',
              backgroundColor: '#330000',
              padding: { x: 8, y: 4 },
            })
            .setOrigin(0.5);
          withdrawButton
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', (pointer) => {
              pointer.stopPropagation();
              this.handleWithdrawHero(hero, withdrawButton);
            })
            .on('pointerover', () =>
              withdrawButton.setStyle({ fill: '#ffffff' })
            )
            .on('pointerout', () =>
              withdrawButton.setStyle({ fill: '#FF6347' })
            );
          card.add(withdrawButton);
          card.setData('withdrawButton', withdrawButton);
        }
      } else {
        const levelUpButton = this.add
          .text(
            0,
            actionY,
            LanguageManager.get('level_up_button') || 'LEVEL UP',
            {
              fontSize: '16px',
              fontFamily: '"Press Start 2P"',
              align: 'center',
              padding: { x: 8, y: 4 },
            }
          )
          .setOrigin(0.5);
        card.add(levelUpButton);
        if (hero.xp >= xpForNextLevel) {
          levelUpButton
            .setInteractive({ useHandCursor: true })
            .setStyle({ fill: '#90EE90', backgroundColor: '#003300' })
            .on('pointerdown', (p) => {
              p.stopPropagation();
              this.handleLevelUp(hero);
            });
        } else {
          levelUpButton.setStyle({
            fill: '#AAAAAA',
            backgroundColor: '#333333',
          });
        }
        card.setData('levelUpButton', levelUpButton);
      }

      const nftIndicator = this.add
        .text(0, -160, hero.hero_type.toUpperCase(), {
          fontSize: '10px',
          fill: hero.hero_type === 'nft' ? '#00ffff' : '#FFD700',
          fontFamily: '"Press Start 2P"',
          align: 'center',
          backgroundColor: '#00000099',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5);
      card.add(nftIndicator);

      if (isLocked) {
        const lockOverlay = this.add.graphics();
        lockOverlay
          .fillStyle(0x000000, 0.6)
          .fillRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight);
        card.add(lockOverlay);

        const lockText = this.add
          .text(0, 0, 'LOCKED\n(BETA)', {
            fontSize: '18px',
            fill: '#FF0000',
            fontFamily: '"Press Start 2P"',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4,
          })
          .setOrigin(0.5);
        card.add(lockText);
      }

      card.setSize(cardWidth, cardHeight);

      // Only allow selection if not locked
      if (!isLocked) {
        card
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.selectHero(hero, card, index))
          .on('pointerover', () => {
            if (this.selectedHero?.id !== hero.id) {
              background
                .lineStyle(3, '#FFD700', 1)
                .strokeRoundedRect(
                  -cardWidth / 2,
                  -cardHeight / 2,
                  cardWidth,
                  cardHeight,
                  15
                );
            }
          })
          .on('pointerout', () => {
            if (this.selectedHero?.id !== hero.id) {
              background
                .lineStyle(2, '#00ffff', 0.8)
                .strokeRoundedRect(
                  -cardWidth / 2,
                  -cardHeight / 2,
                  cardWidth,
                  cardHeight,
                  15
                );
            }
          });
      }

      background
        .fillStyle(0x000000, 0.7)
        .fillRoundedRect(
          -cardWidth / 2,
          -cardHeight / 2,
          cardWidth,
          cardHeight,
          15
        );
      background
        .lineStyle(2, '#00ffff', 0.8)
        .strokeRoundedRect(
          -cardWidth / 2,
          -cardHeight / 2,
          cardWidth,
          cardHeight,
          15
        );

      return { card, background, hero };
    });

    if (this.selectedHero) {
      const previouslySelectedIndex = this.heroCards.findIndex(
        (c) => c.hero.id === this.selectedHero.id
      );
      if (previouslySelectedIndex !== -1) {
        this.selectHero(
          this.selectedHero,
          this.heroCards[previouslySelectedIndex].card,
          previouslySelectedIndex,
          true
        );
      }
    }
  }

  async handleDepositHero(hero, button) {
    SoundManager.play(this, 'click');
    button
      .setText('CONNECTING...')
      .disableInteractive()
      .setStyle({ fill: '#FFA500' });

    try {
      await stakingService.init();

      const isApproved = await stakingService.isApproved();
      if (!isApproved) {
        button.setText('APPROVING...');
        const approveTx = await stakingService.approve();
        await approveTx.wait();
        SoundManager.play(this, 'powerup');
      }

      button.setText('DEPOSITING...');
      const depositTx = await stakingService.depositHero(hero.nft_id);
      await depositTx.wait();
      SoundManager.play(this, 'powerup');

      this.scene.launch('PopupScene', {
        title: 'Success!',
        message: `${hero.name} has been staked and is ready for battle!`,
        onClose: () => {
          this.scene.restart();
        },
      });
    } catch (error) {
      SoundManager.play(this, 'error');
      console.error('Hero deposit process failed:', error);
      this.scene.launch('PopupScene', {
        title: 'Deposit Failed',
        message: error.reason || error.message || 'An unknown error occurred.',
      });
      button
        .setText('Deposit to Play')
        .setInteractive({ useHandCursor: true })
        .setStyle({ fill: '#00ffff' });
    }
  }

  async handleWithdrawHero(hero, button) {
    SoundManager.play(this, 'click');
    button
      .setText('PREPARING...')
      .disableInteractive()
      .setStyle({ fill: '#FFA500' });

    try {
      // 1. Get signature from backend
      button.setText('GETTING SIG...');
      const response = await api.initiateHeroWithdrawal(hero.id);
      if (!response.success) {
        throw new Error(
          response.message || 'Failed to get withdrawal signature.'
        );
      }
      const { tokenId, level, xp, signature } = response;

      // 2. Call staking service to execute on-chain transaction
      button.setText('CONFIRM...');
      const withdrawTx = await stakingService.withdrawHero(
        tokenId,
        level,
        xp,
        signature
      );
      button.setText('WITHDRAWING...');
      await withdrawTx.wait();
      SoundManager.play(this, 'powerup');

      // 3. Show success and refresh
      this.scene.launch('PopupScene', {
        title: 'Success!',
        message: `${hero.name} has been withdrawn to your wallet.`,
        onClose: () => {
          this.scene.restart(); // Easiest way to refresh hero list
        },
      });
    } catch (error) {
      SoundManager.play(this, 'error');
      console.error('Hero withdraw process failed:', error);
      this.scene.launch('PopupScene', {
        title: 'Withdraw Failed',
        message: error.reason || error.message || 'An unknown error occurred.',
      });
      // Reset button state
      button
        .setText('Withdraw')
        .setInteractive({ useHandCursor: true })
        .setStyle({ fill: '#FF6347' });
    }
  }

  async handleLevelUp(hero) {
    SoundManager.play(this, 'click');
    const cardData = this.heroCards.find((c) => c.hero.id === hero.id);
    if (!cardData) return;
    const levelUpButton = cardData.card.getData('levelUpButton');
    if (!levelUpButton) return;

    levelUpButton
      .setText('PROCESSING...')
      .disableInteractive()
      .setStyle({ fill: '#FFA500' });

    try {
      const response = await api.levelUpHero(hero.id);
      if (response.success) {
        SoundManager.play(this, 'powerup');
        const heroIndex = this.heroes.findIndex((h) => h.id === hero.id);
        if (heroIndex !== -1) this.heroes[heroIndex] = response.hero;
        if (this.selectedHero && this.selectedHero.id === hero.id)
          this.selectedHero = response.hero;
        this.displayHeroes(this.heroes);
        this.scene.launch('PopupScene', {
          title: 'Success!',
          message: `${response.hero.name} is now Level ${response.hero.level}!`,
        });
      } else {
        throw new Error(response.message || 'Level up failed on the server.');
      }
    } catch (error) {
      SoundManager.play(this, 'error');
      console.error('Level up process failed:', error);
      this.scene.launch('PopupScene', {
        title: 'Level Up Failed',
        message: error.message || 'An unknown error occurred.',
      });
      this.displayHeroes(this.heroes);
    }
  }

  selectHero(heroData, selectedContainer, selectedIndex, silent = false) {
    if (!silent) SoundManager.play(this, 'click');
    this.selectedHero = heroData;
    this.registry.set('selectedHero', heroData);

    const cardWidth = 200;
    const cardHeight = 350;

    this.heroCards.forEach((cardData, index) => {
      cardData.background.clear();
      if (index === selectedIndex) {
        cardData.background
          .fillStyle(0x000000, 0.9)
          .fillRoundedRect(
            -cardWidth / 2,
            -cardHeight / 2,
            cardWidth,
            cardHeight,
            15
          );
        cardData.background
          .lineStyle(4, '#FFD700', 1)
          .strokeRoundedRect(
            -cardWidth / 2,
            -cardHeight / 2,
            cardWidth,
            cardHeight,
            15
          );
      } else {
        cardData.background
          .fillStyle(0x000000, 0.7)
          .fillRoundedRect(
            -cardWidth / 2,
            -cardHeight / 2,
            cardWidth,
            cardHeight,
            15
          );
        cardData.background
          .lineStyle(2, '#00ffff', 0.8)
          .strokeRoundedRect(
            -cardWidth / 2,
            -cardHeight / 2,
            cardWidth,
            cardHeight,
            15
          );
      }
    });

    this.enableActionButtons();
  }

  startGameWithSelectedHero() {
    const isPlayable =
      this.selectedHero.hero_type === 'mock' ||
      this.selectedHero.status === 'staked';
    if (!isPlayable) {
      SoundManager.play(this, 'error');
      this.scene.launch('PopupScene', {
        title: 'Error',
        message: 'This hero must be deposited before it can be used in battle.',
      });
      return;
    }
    console.log(
      'Starting game with Hero:',
      this.selectedHero,
      'Game Mode:',
      this.gameMode
    );
    this.scene.start('GameScene', { gameMode: this.gameMode || 'solo' });
  }

  createBackButton(x, y) {
    createButton(this, x, y, LanguageManager.get('back_button'), () => {
      this.scene.start('MenuScene');
    });
  }

  shutdown() {
    // Cleanup if needed
  }
}
