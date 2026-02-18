// src/scenes/LoadingScene.js
import LanguageManager from '../utils/LanguageManager.js';
import contractProvider from '../web3/ContractProvider.js';
import api from '../api.js';
import { CST } from '../CST.js';

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
      fontFamily: 'monospace',
      fontSize: '20px',
      fill: '#00ffff',
    };
    const titleStyle = { ...textStyle, fontSize: '28px', fill: '#FFD700' };
    const titleText = this.add
      .text(centerX, centerY - 50, 'Bomb Dash', titleStyle)
      .setOrigin(0.5); // Use placeholder
    const loadingText = this.add
      .text(centerX, centerY + 10, 'Loading...', textStyle)
      .setOrigin(0.5);

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(centerX - 160, centerY + 40, 320, 30);
    const progressBar = this.add.graphics();

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ffff, 1);
      progressBar.fillRect(centerX - 155, centerY + 45, 310 * value, 20);
    });

    this.load.on('loaderror', (file) => {
      console.error('🔥 Asset failed to load:', file.src);
    });

    // --- Asset Loading Logic ---
    this.load.script(
      'webfont',
      'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'
    );

    // CRITICAL FIX: Explicit manual loading of assets to avoid manifest 404s
    // and ensure critical assets are available.
    console.log('🔄 Loading critical assets explicitly...');

    // Heroes (Both 'ninja' and 'ninja_hero' keys for compatibility)
    this.load.image('ninja', '/assets/img/hero/ninja.png');
    this.load.image('ninja_hero', '/assets/img/hero/ninja.png');
    this.load.image('witch', '/assets/img/hero/witch.png');
    this.load.image('witch_hero', '/assets/img/hero/witch.png');

    // Backgrounds
    this.load.image('bg1', '/assets/img/bg/bg1.png');

    // Audio
    this.load.audio('menu_music', '/assets/audio/menu.mp3');

    this.load.on('complete', () => {
      console.log(
        '✅ All assets finished loading. Transitioning to Create method...'
      );

      // Use the loaded WebFont script to load the custom font
      const checkSessionAndProceed = async () => {
        try {
          // BLOCKING STEP 1: Wait for contract addresses to be loaded from the backend.
          console.log('Waiting for ContractProvider to initialize...');
          await this.contractsInitializedPromise;
          console.log('✅ ContractProvider initialized successfully.');

          // BLOCKING STEP 2: Now that contracts are ready, check the user's session.
          titleText.setText(LanguageManager.get('game_title'));
          loadingText.setText(LanguageManager.get('loading_initializing'));

          console.log('[VCL-09] Checking for existing user session...');
          const loginStatus = await api.checkLoginStatus();
          this.scene.launch(CST.SCENES.NOTIFICATION);

          if (loginStatus.success) {
            console.log(
              `[VCL-09] Session validated for user: ${loginStatus.user.address}.`
            );
            this.registry.set('loggedInUser', loginStatus.user);
            this.scene.start('MenuScene');
          } else {
            // This case should ideally not be hit if checkLoginStatus throws on failure.
            throw new Error(
              loginStatus.message || 'Login status check was not successful.'
            );
          }
        } catch (error) {
          // This catch block now handles failures from BOTH contract initialization and session check.
          console.warn(`Proceeding to public flow. Reason: ${error.message}`);
          this.registry.remove('loggedInUser');

          // If contract provider failed, we can't proceed to scenes that use Web3.
          // We should show an error and stop.
          if (!contractProvider.isInitialized()) {
            console.error(
              'CRITICAL: ContractProvider failed to initialize. Game cannot proceed reliably.'
            );
            loadingText
              .setText('SERVER ERROR: Try refreshing.')
              .setStyle({ fill: '#ff0000', fontSize: '16px' });

            // Add a Retry Button
            const retryButton = this.add
              .text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'RETRY', {
                fontFamily: 'monospace',
                fontSize: '20px',
                fill: '#ffffff',
                backgroundColor: '#dc143c',
                padding: { x: 10, y: 5 },
              })
              .setOrigin(0.5)
              .setInteractive({ useHandCursor: true });

            retryButton.on('pointerdown', () => {
              window.location.reload();
            });

            return; // Halt the loading process.
          }

          this.scene.launch(CST.SCENES.NOTIFICATION);
          this.scene.start('TermsScene');
        }
      };

      // Make font loading robust. If the WebFont script failed to load,
      // window.WebFont will be undefined. We must handle this gracefully.
      if (window.WebFont) {
        WebFont.load({
          google: { families: ['Press Start 2P'] },
          active: () => {
            console.log('✅ Custom font "Press Start 2P" loaded.');
            checkSessionAndProceed();
          },
          inactive: () => {
            console.error(
              '🔥 Failed to load custom font. Proceeding with default fonts.'
            );
            checkSessionAndProceed(); // Ensure game proceeds even if font fails
          },
        });
      } else {
        console.warn(
          '⚠️ WebFont script not loaded. Skipping custom font and proceeding immediately.'
        );
        checkSessionAndProceed();
      }
    });
    console.log('✅ LoadingScene: Preload has completed setup!');
  }

  create() {
    console.log('🛠️ LoadingScene: Create is starting...');
    // All logic is now handled by the loader's 'complete' event in preload().
    console.log('✅ LoadingScene: Create has completed!');
  }
}
