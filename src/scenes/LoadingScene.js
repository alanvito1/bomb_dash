// src/scenes/LoadingScene.js
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
    console.log('✅ LoadingScene: Constructor has been called!');
  }

  preload() {
    console.log('🔄 LoadingScene: Preload is starting...');
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Display Loading UI ---
    const textStyle = { fontFamily: 'monospace', fontSize: '20px', fill: '#00ffff' };
    const titleStyle = { ...textStyle, fontSize: '28px', fill: '#FFD700'};
    this.add.text(centerX, centerY - 50, '💣 Bomb Dash', titleStyle).setOrigin(0.5);
    const loadingText = this.add.text(centerX, centerY + 10, 'Loading assets...', textStyle).setOrigin(0.5);

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
                        console.log(`[AssetLoader] Enqueuing animation frames for '${assetKey}'...`);
                        assetData.frames.forEach((framePath, index) => {
                            // Generate a unique key for each frame to avoid conflicts
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

    this.load.on('complete', async () => {
        console.log('✅ All assets finished loading. Transitioning to Create method...');
        loadingText.setText('Initializing...');

        await LanguageManager.init(this);
        loadingText.setText(LanguageManager.get(this, 'complete'));

        console.log('🔄 Checking for existing user session...');
        try {
            const loginStatus = await api.checkLoginStatus();
            if (loginStatus.success) {
                console.log(`✅ Session validated for user: ${loginStatus.user.address}.`);
                this.registry.set('loggedInUser', loginStatus.user);
                this.scene.start('MenuScene');
            } else {
                 throw new Error(loginStatus.message || "Login status check was not successful.");
            }
        } catch (error) {
            console.log(`ℹ️ No valid session found. Proceeding to login. Reason: ${error.message}`);
            this.registry.remove('loggedInUser');
            this.scene.start('AuthChoiceScene');
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