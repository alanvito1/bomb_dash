import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import { getExperienceForLevel } from '../utils/rpg.js';
import stakingService from '../web3/staking-service.js';
import { createHeroCard } from '../modules/HeroCard.js';

export default class ProfileScene extends Phaser.Scene {
  constructor() {
    super('ProfileScene');
    this.heroCards = [];
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.image(centerX, centerY, 'menu_bg_vertical').setOrigin(0.5).setDisplaySize(this.scale.width, this.scale.height);
    this.add.graphics().fillStyle(0x000000, 0.8).fillRect(20, 20, this.scale.width - 40, this.scale.height - 40);

    const titleStyle = { fontSize: '24px', fill: '#FFD700', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 };
    const textStyle = { fontSize: '16px', fill: '#ffffff', fontFamily: '"Press Start 2P"' };
    const buttonStyle = { fontSize: '16px', fill: '#00ffff', fontFamily: '"Press Start 2P"', backgroundColor: '#00000099', padding: { x: 10, y: 5 } };

    this.add.text(centerX, 70, LanguageManager.get('profile_title'), titleStyle).setOrigin(0.5);

    const loadingText = this.add.text(centerX, centerY, LanguageManager.get('char_select_loading'), textStyle).setOrigin(0.5);

    this.createBackButton(centerX, this.scale.height - 60, buttonStyle);

    this.fetchAndDisplayHeroes(loadingText);
  }

  async fetchAndDisplayHeroes(loadingText) {
    loadingText.setText(LanguageManager.get('char_select_loading'));
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
      console.error('Failed to fetch heroes from backend:', error);
      loadingText.setText(LanguageManager.get('char_select_error_connection'));
    }
  }

  displayHeroes(heroes) {
    const centerX = this.cameras.main.centerX;
    const startY = 180;
    const cardSpacingY = 400;
    const cardSpacingX = 220;
    const cardsPerRow = 2;

    this.heroCards.forEach(card => card.destroy());
    this.heroCards = [];

    heroes.forEach((hero, index) => {
        const row = Math.floor(index / cardsPerRow);
        const col = index % cardsPerRow;

        const cardX = centerX - (cardSpacingX / 2) + (col * cardSpacingX);
        const cardY = startY + (row * cardSpacingY);

        const card = createHeroCard(this, hero, cardX, cardY);
        card.setData('hero', hero); // Make hero data accessible
        this.heroCards.push(card);
    });
  }

  createBackButton(x, y, style) {
    const backBtn = this.add.text(x, y, LanguageManager.get('back_button'), style)
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('MenuScene');
    });
    backBtn.on('pointerover', () => backBtn.setStyle({ fill: '#ffffff' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ fill: '#00ffff' }));
  }

  async handleDepositHero(hero, button) {
    SoundManager.play(this, 'click');
    button.setText('CONNECTING...').disableInteractive().setStyle({ fill: '#FFA500' });

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
            }
        });

    } catch (error) {
        SoundManager.play(this, 'error');
        console.error('Hero deposit process failed:', error);
        this.scene.launch('PopupScene', {
            title: 'Deposit Failed',
            message: error.reason || error.message || 'An unknown error occurred.'
        });
        this.fetchAndDisplayHeroes(this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, '', {}));
    }
  }

  async handleWithdrawHero(hero, button) {
      SoundManager.play(this, 'click');
      button.setText('PREPARING...').disableInteractive().setStyle({ fill: '#FFA500' });

      try {
          button.setText('GETTING SIG...');
          const response = await api.initiateHeroWithdrawal(hero.id);
          if (!response.success) {
              throw new Error(response.message || 'Failed to get withdrawal signature.');
          }
          const { tokenId, level, xp, signature } = response;

          button.setText('CONFIRM...');
          const withdrawTx = await stakingService.withdrawHero(tokenId, level, xp, signature);
          button.setText('WITHDRAWING...');
          await withdrawTx.wait();
          SoundManager.play(this, 'powerup');

          this.scene.launch('PopupScene', {
              title: 'Success!',
              message: `${hero.name} has been withdrawn to your wallet.`,
              onClose: () => {
                  this.scene.restart();
              }
          });

      } catch (error) {
          SoundManager.play(this, 'error');
          console.error('Hero withdraw process failed:', error);
          this.scene.launch('PopupScene', {
              title: 'Withdraw Failed',
              message: error.reason || error.message || 'An unknown error occurred.'
          });
          this.fetchAndDisplayHeroes(this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, '', {}));
      }
  }

  async handleLevelUp(hero) {
      SoundManager.play(this, 'click');
      const cardData = this.heroCards.find(c => c.getData('hero').id === hero.id);
      if (!cardData) return;
      const levelUpButton = cardData.getData('levelUpButton');
      if (!levelUpButton) return;

      levelUpButton.setText('PROCESSING...').disableInteractive().setStyle({ fill: '#FFA500' });

      try {
          const response = await api.levelUpHero(hero.id);
          if (response.success) {
              SoundManager.play(this, 'powerup');
              const heroIndex = this.heroes.findIndex(h => h.id === hero.id);
              if (heroIndex !== -1) this.heroes[heroIndex] = response.hero;
              this.displayHeroes(this.heroes);
              this.scene.launch('PopupScene', { title: 'Success!', message: `${response.hero.name} is now Level ${response.hero.level}!` });
          } else {
              throw new Error(response.message || 'Level up failed on the server.');
          }
      } catch (error) {
          SoundManager.play(this, 'error');
          console.error('Level up process failed:', error);
          this.scene.launch('PopupScene', { title: 'Level Up Failed', message: error.message || 'An unknown error occurred.' });
          this.displayHeroes(this.heroes);
      }
  }
}