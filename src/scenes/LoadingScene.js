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
    // The i18nReady flag will be set as soon as the JSON is fetched,
    // decoupling it from the potentially slow WebFont download.
    // We call this without `await` because `preload` is not designed for blocking async operations.
    // The test script will poll the `window.i18nReady` flag to wait for completion.
    LanguageManager.init(this);
    this.contractsInitializedPromise = contractProvider.initialize();
    // -----------------------------

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Display Loading UI ---
    const textStyle = { fontFamily: 'monospace', fontSize: '20px', fill: '#00ffff' };
    const titleStyle = { ...textStyle, fontSize: '28px', fill: '#FFD700'};
    const titleText = this.add.text(centerX, centerY - 50, 'Bomb Dash', titleStyle).setOrigin(0.5); // Use placeholder
    const loadingText = this.add.text(centerX, centerY + 10, 'Loading...', textStyle).setOrigin(0.5);

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
    this.load.json('asset-manifest', 'src/config/asset-manifest.json');
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');

    this.load.on('filecomplete-json-asset-manifest', (key, type, data) => {
        console.log('🔄 Asset manifest loaded. Enqueuing game assets...');
        const { assets, sounds } = data;

        if (assets) {
            for (const categoryKey in assets) {
                const category = assets[categoryKey];
                for (const assetKey in category) {
                    const assetData = category[assetKey];
                    // Handle sprite animations (objects with a 'frames' array)
                    if (typeof assetData === 'object' && assetData !== null && Array.isArray(assetData.frames)) {
                        console.log(`[AssetLoader] Enqueuing assets for hero '${assetKey}'...`);

                        // 1. Load the static preview image (the first frame) for UI scenes.
                        // This uses the naming convention the backend provides (e.g., 'ninja_hero').
                        const previewKey = `${assetKey}_hero`;
                        const previewFramePath = assetData.frames[0];
                        if (previewFramePath) {
                            this.load.image(previewKey, previewFramePath);
                            console.log(`[AssetLoader]  - Loading preview image with key '${previewKey}'.`);
                        }

                        // 2. Load all individual frames for the animation in the game.
                        assetData.frames.forEach((framePath, index) => {
                            const frameKey = `${assetKey}_frame_${index}`;
                            this.load.image(frameKey, framePath);
                        });
                    }
                    // Handle single images (strings)
                    else if (typeof assetData === 'string' && assetData.length > 0) {
                        this.load.image(assetKey, assetData);
                    }
                    // Log warning for any other invalid format
                    else {
                        console.warn(`[AssetLoader] Warning: Asset with key '${assetKey}' has an invalid format. Skipping.`);
                    }
                }
            }
        }

        if (sounds) {
            for (const categoryKey in sounds) {
                const category = sounds[categoryKey];
                for (const assetKey in category) {
                    const path = category[assetKey];
                    // Defensive check: Ensure the path is a valid string before loading
                    if (typeof path === 'string' && path.length > 0) {
                        this.load.audio(assetKey, path);
                    } else {
                        console.warn(`[AssetLoader] Warning: Sound asset with key '${assetKey}' has an invalid path. Skipping.`);
                    }
                }
            }
        }
    });

    this.load.on('complete', () => {
        console.log('✅ All assets finished loading. Transitioning to Create method...');

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
                    console.log(`[VCL-09] Session validated for user: ${loginStatus.user.address}.`);
                    this.registry.set('loggedInUser', loginStatus.user);
                    this.scene.start('MenuScene');
                } else {
                    // This case should ideally not be hit if checkLoginStatus throws on failure.
                    throw new Error(loginStatus.message || "Login status check was not successful.");
                }
            } catch (error) {
                // This catch block now handles failures from BOTH contract initialization and session check.
                console.warn(`Proceeding to public flow. Reason: ${error.message}`);
                this.registry.remove('loggedInUser');

                // If contract provider failed, we can't proceed to scenes that use Web3.
                // We should show an error and stop.
                if (!contractProvider.isInitialized()) {
                    loadingText.setText('ERROR: Cannot connect to server.').setStyle({ fill: '#ff0000' });
                    // Optionally, add a retry button or more info here.
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
                    console.error('🔥 Failed to load custom font. Proceeding with default fonts.');
                    checkSessionAndProceed(); // Ensure game proceeds even if font fails
                }
            });
        } else {
            console.warn('⚠️ WebFont script not loaded. Skipping custom font and proceeding immediately.');
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