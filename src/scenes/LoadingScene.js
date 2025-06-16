// src/scenes/LoadingScene.js
import SoundManager from '../utils/sound.js';
// We need initDB and getUser to validate the auto-login user
import { initDB, getUser } from '../database/database.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Fundo
    this.add.text(centerX, centerY - 50, '💣 Bomb Dash', {
      fontFamily: 'monospace',
      fontSize: '28px',
      fill: '#FFD700'
    }).setOrigin(0.5);

    const loadingText = this.add.text(centerX, centerY + 10, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fill: '#00ffff'
    }).setOrigin(0.5);

    const bar = this.add.rectangle(centerX - 100, centerY + 50, 0, 20, 0x00ffff).setOrigin(0, 0.5);

    this.load.on('progress', (value) => {
      bar.width = 200 * value;
    });

    this.load.on('complete', () => {
      loadingText.setText('Complete!');
    });

    // Carrega todos os assets
    SoundManager.loadAll(this); // Ensure sounds are loaded
    this.load.image('bg', 'src/assets/menu_bg_vertical.png'); // Example asset
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  async create() {
    // Initialize DB connection first
    await initDB();

    this.time.delayedCall(500, async () => { // Mark callback as async
        const loggedInUserUsername = localStorage.getItem('loggedInUser');

        if (loggedInUserUsername) {
            // User token found, try to validate and get data using the new getUser function
            const user = await getUser(loggedInUserUsername); // New way

            if (user) { // Check if user object is returned (meaning user exists in DB)
                console.log(`LoadingScene: Auto-login validated for user: ${user.username}. Max score: ${user.max_score}.`);
                this.registry.set('loggedInUser', { username: user.username, max_score: user.max_score });
                this.scene.start('StartScene'); // Or MenuScene directly
            } else {
                // User from localStorage not found in DB, clear invalid token
                console.log(`LoadingScene: User ${loggedInUserUsername} from localStorage not found in DB. Clearing token.`);
                localStorage.removeItem('loggedInUser');
                this.scene.start('LoginScene');
            }
        } else {
            // No auto-login user found, go to LoginScene
            console.log('LoadingScene: No auto-login user. Proceeding to LoginScene.');
            this.scene.start('LoginScene');
        }
    });
  }
}
