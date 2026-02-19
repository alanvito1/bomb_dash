// src/scenes/LoadingScene.js
import LanguageManager from '../utils/LanguageManager.js';
import contractProvider from '../web3/ContractProvider.js';
import api from '../api.js';
import { createButton } from '../modules/UIGenerator.js';
import AssetLoader from '../utils/AssetLoader.js';
import TextureGenerator from '../modules/TextureGenerator.js';

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

    this.load.on('loaderror', (fileObj) => {
      console.warn('⚠️ Asset failed to load, creating fallback:', fileObj.key);
      if (fileObj.type === 'image' || fileObj.type === 'spritesheet') {
        const key = fileObj.key;
        if (!this.textures.exists(key)) {
            // Generate a 1x1 black fallback texture
            const graphics = this.make.graphics({x:0, y:0, add:false});
            graphics.fillStyle(0x000000); // Black
            graphics.fillRect(0,0,32,32);
            graphics.generateTexture(key, 32, 32);
        }
      }
    });

    // --- Asset Loading Logic ---
    this.load.script(
      'webfont',
      'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'
    );

    console.log('🔄 Loading assets from /assets/icons/ ...');

    const assets = [
        'ninja', 'ninja_hero', 'witch', 'witch_hero',
        'enemy', 'bomb',
        'bg1', 'floor_grid',
        'icon_base', 'icon_heroes', 'icon_battle', 'icon_shop', 'icon_ranking',
        'icon_forge', 'icon_gold', 'icon_bcoin', 'icon_settings', 'icon_wallet',
        'icon_book', 'icon_guild', 'icon_altar', 'icon_avatar',
        'item_chest', 'item_potion', 'item_gems',
        'item_rusty_sword', 'item_iron_katana', 'item_leather_vest', 'item_nano_vest',
        'item_neon_boots', 'item_health_potion', 'item_scrap', 'item_cyber_core',
        'heart_full', 'heart_empty', 'shadow', 'particle_pixel', 'particle_smoke'
    ];

    assets.forEach(key => {
        this.load.image(key, `assets/icons/${key}.png`);
    });

    // Special Case: Explosion Sheet
    this.load.spritesheet('explosion_sheet', 'assets/icons/explosion_sheet.png', { frameWidth: 32, frameHeight: 32 });

    this.load.on('complete', () => {
      console.log('✅ All assets finished loading.');

      // --- TASK FORCE: PROCEDURAL GENERATION DISABLED ---
      // TextureGenerator.generate(this);

      // --- ASSET RECOVERY SYSTEM ---
      // If any asset failed to load (404), generate a procedural fallback.
      // (This will handle remaining assets like particles/hearts using the old generator)
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
      console.log('⏳ LoadingScene: Waiting for ContractProvider...');
      try {
        await this.contractsInitializedPromise;
        console.log('✅ LoadingScene: Contracts Initialized.');
      } catch (e) {
        console.error('⚠️ LoadingScene: Contract Initialization Failed/Timed Out.', e);
        // We continue anyway, as we might be in Offline Mode or just need basic UI
      }

      loadingText.setText('VERIFYING SESSION...');

      // --- TASK FORCE: UNIFIED LOGIN FLOW ---
      // Check if session exists (Local Token or Guest PK)
      if (api.hasSession()) {
        console.log('[LoadingScene] Session detected. Attempting to validate...');

        try {
          // Try to validate with Backend
          const loginStatus = await api.checkLoginStatus();
          if (loginStatus.success) {
            console.log(
              `[LoadingScene] Session validated: ${loginStatus.user.address}`
            );
            this.registry.set('loggedInUser', loginStatus.user);
            this.scene.start('MenuScene');
            return;
          }
        } catch (e) {
          console.warn(
            '[LoadingScene] API Validation failed, but session exists. Entering Offline/Guest Mode.',
            e
          );
        }

        // --- FALLBACK / OFFLINE MODE ---
        // If validation failed (API Error) but we have a session, we let them in.
        // This prevents the user from being kicked back to AuthChoice if backend is down.
        console.log(
          '[LoadingScene] Bypassing AuthChoice due to existing session (Fail-Safe).'
        );

        const mockUser = {
          walletAddress: 'OFFLINE-MODE',
          isGuest: true,
          isOffline: true,
        };
        this.registry.set('loggedInUser', mockUser);
        this.scene.start('MenuScene');
        return;
      }

      // Only if NO session exists at all, show prompt
      console.log(
        '[LoadingScene] No session found. Showing Overlay Prompt.'
      );
      this.showLoginOverlayPrompt(loadingText);
    } catch (error) {
      console.error('[LoadingScene] Critical Initialization Error:', error);
      // Even in critical error, if we have session, try to enter menu?
      // checkSessionAndProceed catches its own errors mostly.
      // If we are here, something really bad happened (e.g. ContractProvider failed).
      // If we have session, let's try to enter anyway.
      if (api.hasSession()) {
        const mockUser = { walletAddress: 'EMERGENCY-MODE', isGuest: true };
        this.registry.set('loggedInUser', mockUser);
        this.scene.start('MenuScene');
      } else {
        // If we crashed and have no session, just show the prompt.
        // We can't really do much else.
        this.showLoginOverlayPrompt(loadingText);
      }
    }
  }

  showLoginOverlayPrompt(loadingText) {
    if (loadingText) loadingText.destroy();

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Dark Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);

    // Warning Text
    this.add.text(centerX, centerY - 20, 'SESSION NOT FOUND', {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 20, 'Please Login via the HTML Overlay\nand Reload the Page.', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);
  }

  create() {
    // Logic handled in preload complete
  }
}
