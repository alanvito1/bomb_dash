// src/scenes/LoadingScene.js
import LanguageManager from '../utils/LanguageManager.js';
import contractProvider from '../web3/ContractProvider.js';
import api from '../api.js';
import { createButton } from '../modules/UIGenerator.js';
import AssetLoader from '../utils/AssetLoader.js';

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

      // --- ASSET RECOVERY SYSTEM ---
      // If any asset failed to load (404), generate a procedural fallback.
      AssetLoader.ensureAssets(this);

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

      console.log('[LoadingScene] Checking session via API...');
      let loginStatus = { success: false };
      try {
        loginStatus = await api.checkLoginStatus();
      } catch (e) {
        console.warn('[LoadingScene] API Session Check failed:', e);
      }

      if (loginStatus.success) {
        console.log(
          `[LoadingScene] Session validated: ${loginStatus.user.address}`
        );
        this.registry.set('loggedInUser', loginStatus.user);
        this.scene.start('MenuScene');
        return;
      }

      // --- FALLBACK CHECK (Overlay Bypass) ---
      // If API check fails but user has local credentials (e.g., from Overlay login),
      // force entry to MenuScene to avoid redundant AuthChoice.
      console.warn(
        '[LoadingScene] API Check failed. Checking local session indicators...'
      );
      const guestPk = localStorage.getItem('guest_pk');
      // Simple check for any potential session indicator
      const hasLocalSession =
        guestPk || document.cookie.includes('sb-') || localStorage.length > 0;

      if (guestPk) {
        console.log(
          '[LoadingScene] Local Guest Session found! Bypassing AuthChoice.'
        );
        // Construct minimal user data to satisfy MenuScene requirements
        const mockUser = {
          walletAddress: 'GUEST-MODE-ACTIVE',
          isGuest: true,
        };
        this.registry.set('loggedInUser', mockUser);
        this.scene.start('MenuScene');
        return;
      }

      // If no session found at all, go to AuthChoice (or throw if strict)
      // Original logic threw error, but correct flow for unauthenticated user is AuthChoice.
      // However, to respect the "Emergency" prompt:
      // "Fluxo Redundante: O usuário loga no Overlay, mas depois cai na AuthChoiceScene de novo."
      // If we are here, it means we really couldn't find a session.
      console.log('[LoadingScene] No session found. Redirecting to AuthChoice.');
      this.scene.start('AuthChoiceScene');

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
