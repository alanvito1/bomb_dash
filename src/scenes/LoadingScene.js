// src/scenes/LoadingScene.js
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { getCurrentUser } from '../api.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    this.load.json('assetManifest', 'src/config/asset-manifest.json');
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  async create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Display Loading UI ---
    const textStyle = { fontFamily: 'monospace', fontSize: '20px', fill: '#00ffff' };
    const titleStyle = { ...textStyle, fontSize: '28px', fill: '#FFD700'};
    this.add.text(centerX, centerY - 50, '💣 Bomb Dash', titleStyle).setOrigin(0.5);
    const loadingText = this.add.text(centerX, centerY + 10, 'Loading Assets...', textStyle).setOrigin(0.5);
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(centerX - 160, centerY + 40, 320, 30);
    const progressBar = this.add.graphics();

    // --- Load Assets from Manifest ---
    const manifest = this.cache.json.get('assetManifest');

    // Load all images
    for (const category in manifest.assets) {
      for (const key in manifest.assets[category]) {
        const asset = manifest.assets[category][key];
        if (typeof asset === 'string') {
          this.load.image(key, asset);
        } else if (asset.frames) {
          asset.frames.forEach((frame, index) => {
            this.load.image(`${key}_${index}`, frame);
          });
        }
      }
    }

    // Load all sounds
    SoundManager.loadFromManifest(this, manifest);

    // --- Setup Load Events ---
    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ffff, 1);
      progressBar.fillRect(centerX - 155, centerY + 45, 310 * value, 20);
    });

    this.load.on('complete', async () => {
      // 1. Initialize translations first
      await LanguageManager.init(this);

      // 2. Update loading text now that translations are ready
      loadingText.setText(LanguageManager.get(this, 'loading'));

      // 3. Destroy progress bar elements
      progressBar.destroy();
      progressBox.destroy();

      // 4. Set final text and proceed with game logic
      loadingText.setText(LanguageManager.get(this, 'complete'));

      // 5. Check session and transition to the correct scene
      this.time.delayedCall(500, async () => {
          const jwtToken = localStorage.getItem('jwt_token');

          if (jwtToken) {
              console.log('LoadingScene: Found JWT token. Validating session...');
              const validationResult = await getCurrentUser(); // No need to pass token, it's read from localStorage

              if (validationResult && validationResult.success) {
                  console.log(`LoadingScene: Session validated for user: ${validationResult.user.address}.`);
                  this.registry.set('loggedInUser', validationResult.user);
                  this.registry.set('jwtToken', jwtToken);
                  this.scene.start('MenuScene'); // Go to Menu on success
              } else {
                  console.log(`LoadingScene: Session validation failed. Proceeding to login.`);
                  localStorage.removeItem('jwt_token');
                  this.registry.remove('loggedInUser');
                  this.scene.start('AuthChoiceScene'); // Go to login on failure
              }
          } else {
              console.log('LoadingScene: No JWT token found. Proceeding to login.');
              this.scene.start('AuthChoiceScene'); // Go to login if no token
          }
      });
    });

    // --- Start Loading ---
    this.load.start();
  }
}