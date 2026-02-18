// src/scenes/LoadingScene.js
import LanguageManager from '../utils/LanguageManager.js';
import contractProvider from '../web3/ContractProvider.js';
import api from '../api.js';
import { createButton } from '../modules/UIGenerator.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
    console.log('✅ LoadingScene: Constructor has been called!');
    this.contractsInitializedPromise = null;
  }

  preload() {
    console.log('🔄 LoadingScene: Preload is starting...');
    // --- E2E Test Reliability Fix ---
    // Initialize LanguageManager immediately to prevent test timeouts.
    LanguageManager.init(this);
    this.contractsInitializedPromise = contractProvider.initialize();
    // -----------------------------

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Display Loading UI ---
    const textStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      fill: '#00ffff',
      align: 'center',
    };

    // Title
    this.add
      .text(centerX, centerY - 80, 'ESTABLISHING LINK...', textStyle)
      .setOrigin(0.5);

    // Random RPG Loading Messages
    const loadingMessages = [
      'Calibrating Bombs...',
      'Mining BCOIN...',
      'Summoning Heroes...',
      'Synchronizing Blockchain...',
      'Loading Pixel Assets...',
      'Generating World...',
    ];
    const randomMsg =
      loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

    const loadingText = this.add
      .text(centerX, centerY + 40, randomMsg, {
        ...textStyle,
        fontSize: '10px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Progress Bar Background
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x000033, 0.8);
    progressBox.lineStyle(2, 0x00ffff, 1);
    progressBox.fillRoundedRect(centerX - 150, centerY - 10, 300, 20, 4);
    progressBox.strokeRoundedRect(centerX - 150, centerY - 10, 300, 20, 4);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ffff, 1);
      progressBar.fillRoundedRect(
        centerX - 148,
        centerY - 8,
        296 * value,
        16,
        2
      );
    });

    this.load.on('loaderror', (file) => {
      console.error('🔥 Asset failed to load:', file.src);
    });

    // --- Asset Loading Logic ---
    this.load.script(
      'webfont',
      'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'
    );

    console.log('🔄 Loading critical assets explicitly...');

    // Heroes
    this.load.image('ninja', '/assets/img/hero/ninja.png');
    this.load.image('ninja_hero', '/assets/img/hero/ninja.png');
    this.load.image('witch', '/assets/img/hero/witch.png');
    this.load.image('witch_hero', '/assets/img/hero/witch.png');

    // Backgrounds
    this.load.image('bg1', '/assets/img/bg/bg1.png');

    // Audio
    this.load.audio('menu_music', '/assets/audio/menu.mp3');
    // Explicit click audio load as requested
    this.load.audio('click', '/assets/audio/click.mp3');

    this.load.on('complete', () => {
      console.log('✅ All assets finished loading.');

      // Font handling
      const handleFontLoaded = () => {
        this.checkSessionAndProceed(loadingText);
      };

      if (window.WebFont) {
        WebFont.load({
          google: { families: ['Press Start 2P'] },
          active: () => {
            console.log('✅ Custom font "Press Start 2P" loaded.');
            handleFontLoaded();
          },
          inactive: () => {
            console.error('🔥 Failed to load custom font.');
            handleFontLoaded();
          },
        });
      } else {
        handleFontLoaded();
      }
    });
  }

  async checkSessionAndProceed(loadingText) {
    try {
      console.log('Waiting for ContractProvider...');
      await this.contractsInitializedPromise;

      loadingText.setText('VERIFYING SESSION...');

      console.log('[LoadingScene] Checking session...');
      const loginStatus = await api.checkLoginStatus();

      if (loginStatus.success) {
        console.log(
          `[LoadingScene] Session validated: ${loginStatus.user.address}`
        );
        this.registry.set('loggedInUser', loginStatus.user);

        // Direct transition to Menu, skipping redundant Auth/Terms screens
        this.scene.start('MenuScene');
      } else {
        throw new Error(loginStatus.message || 'Session invalid');
      }
    } catch (error) {
      console.error('[LoadingScene] Critical Initialization Error:', error);
      this.handleInitializationError(error, loadingText);
    }
  }

  handleInitializationError(error, loadingText) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Update Text
    loadingText.setText('CONNECTION FAILED').setStyle({ fill: '#ff0000' });

    this.add
      .text(centerX, centerY + 60, error.message.toUpperCase(), {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#ff4444',
        align: 'center',
        wordWrap: { width: 400 },
      })
      .setOrigin(0.5);

    // Create Retry Button using UIGenerator
    createButton(this, centerX, centerY + 120, 'RETRY CONNECTION', () => {
      // Simple scene restart to try again
      this.scene.restart();
    });
  }

  create() {
    // Logic handled in preload complete
  }
}
