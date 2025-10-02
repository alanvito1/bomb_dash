// src/scenes/LoadingScene.js
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js'; // Import the centralized api client

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    const textStyle = {
      fontFamily: 'monospace',
      fontSize: '20px',
      fill: '#00ffff'
    };
    const titleStyle = { ...textStyle, fontSize: '28px', fill: '#FFD700'};

    this.add.text(centerX, centerY - 50, '💣 Bomb Dash', titleStyle).setOrigin(0.5);
    this.loadingText = this.add.text(centerX, centerY + 10, 'Loading...', textStyle).setOrigin(0.5);

    this.progressBar = this.add.graphics();
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRect(centerX - 160, centerY + 40, 320, 30);

    this.load.on('progress', (value) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x00ffff, 1);
      this.progressBar.fillRect(centerX - 155, centerY + 45, 310 * value, 20);
    });

    // Only load the manifest file here
    this.load.json('asset-manifest', 'src/config/asset-manifest.json');
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create() {
    const manifest = this.cache.json.get('asset-manifest');

    // Enqueue all assets from the manifest for loading
    const { assets, sounds } = manifest;

    // Load image assets
    for (const categoryKey in assets) {
        const category = assets[categoryKey];
        for (const assetKey in category) {
            const path = category[assetKey];
            if (typeof path === 'string') {
                this.load.image(assetKey, path);
            }
        }
    }

    // Load sound assets
    for (const categoryKey in sounds) {
        const category = sounds[categoryKey];
        for (const assetKey in category) {
            this.load.audio(assetKey, category[assetKey]);
        }
    }

    this.load.on('complete', async () => {
        await LanguageManager.init(this);
        this.loadingText.setText(LanguageManager.get(this, 'loading'));

        this.progressBar.destroy();
        this.progressBox.destroy();

        this.loadingText.setText(LanguageManager.get(this, 'complete'));

        this.time.delayedCall(500, async () => {
            console.log('LoadingScene: Checking for existing session...');
            try {
                const loginStatus = await api.checkLoginStatus();
                console.log(`LoadingScene: Session validated for user: ${loginStatus.user.address}.`);
                this.registry.set('loggedInUser', loginStatus.user);
                this.scene.start('MenuScene');
            } catch (error) {
                console.log(`LoadingScene: No valid session found. Proceeding to login. Reason: ${error.message}`);
                this.registry.remove('loggedInUser');
                this.scene.start('AuthChoiceScene');
            }
        });
    });

    this.load.start();
  }
}