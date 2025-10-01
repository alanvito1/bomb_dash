// src/scenes/LoadingScene.js
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { getCurrentUser } from '../api.js';

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

    SoundManager.loadAll(this);
    this.load.image('auth_bg', 'src/assets/menu_bg_vertical.png');
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  async create() {
    // 1. Initialize translations first
    await LanguageManager.init(this);

    // 2. Update loading text now that translations are ready
    this.loadingText.setText(LanguageManager.get(this, 'loading'));

    // 3. Destroy progress bar elements
    this.progressBar.destroy();
    this.progressBox.destroy();

    // 4. Set final text and proceed with game logic
    this.loadingText.setText(LanguageManager.get(this, 'complete'));

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
  }
}