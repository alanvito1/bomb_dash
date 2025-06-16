// src/scenes/LoginScene.js
import { initDB, createUser, verifyUser } from '../database/database.js';
import SoundManager from '../utils/sound.js'; // Assuming SoundManager for clicks etc.

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  preload() {
    // Load assets for the login scene if any (e.g., background, button sprites)
    // For now, we'll use Phaser's built-in graphics and text.
    // Ensure sounds are loaded if they aren't globally available yet
    SoundManager.loadAll(this);
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');

  }

  async create() {
    // Initialize the database (simulated for now)
    // In a real scenario, you might want to ensure DB is ready earlier, e.g. in LoadingScene
    await initDB();

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Simple background
    this.cameras.main.setBackgroundColor('#000033');

    // Load font
    WebFont.load({
        google: { families: ['Press Start 2P'] },
        active: () => {
            // Title
            this.add.text(centerX, centerY - 200, 'BOMB DASH LOGIN', {
              fontFamily: '"Press Start 2P"',
              fontSize: '24px',
              fill: '#00ffff',
              align: 'center'
            }).setOrigin(0.5);

            // Username input
            this.add.text(centerX - 150, centerY - 110, 'Username:', { fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#ffffff' });
            const usernameInput = this.add.dom(centerX, centerY - 80).createElement('input', {
              type: 'text',
              name: 'username',
              style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ffff; background-color: #333; color: #fff;'
            });
            usernameInput.setOrigin(0.5);


            // PIN input
            this.add.text(centerX - 150, centerY - 30, 'PIN (4 digits):', { fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#ffffff' });
            const pinInput = this.add.dom(centerX, centerY).createElement('input', {
              type: 'password', // Use password type for PIN
              name: 'pin',
              maxLength: 4,
              style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ffff; background-color: #333; color: #fff;'
            });
            pinInput.setOrigin(0.5);

            // Error message display
            const messageText = this.add.text(centerX, centerY + 50, '', {
              fontFamily: '"Press Start 2P"',
              fontSize: '10px',
              fill: '#ff0000',
              align: 'center',
              wordWrap: { width: 300 }
            }).setOrigin(0.5);

            // Create Account button
            const createButton = this.add.text(centerX, centerY + 120, 'CREATE ACCOUNT', {
              fontFamily: '"Press Start 2P"',
              fontSize: '14px',
              fill: '#00ff00',
              backgroundColor: '#00000099',
              padding: { x: 15, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            createButton.on('pointerdown', async () => {
              SoundManager.play(this, 'click');
              const username = usernameInput.node.value.trim();
              const pin = pinInput.node.value.trim();

              if (!username || !pin) {
                messageText.setText('Username and PIN cannot be empty.');
                return;
              }
              if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                messageText.setText('Username can only contain letters, numbers, and underscores.');
                return;
              }
              if (!/^\d{4}$/.test(pin)) {
                messageText.setText('PIN must be 4 digits.');
                return;
              }

              messageText.setText('Creating account...');
              const result = await createUser(username, pin);
              if (result.success) {
                messageText.setText(\`Account \${username} created! Logging in...\`);
                // Auto-login after creation
                this.attemptLogin(username, pin, messageText);
              } else {
                messageText.setText(result.message || 'Failed to create account.');
              }
            });
            createButton.on('pointerover', () => createButton.setStyle({ fill: '#ffffff' }));
            createButton.on('pointerout', () => createButton.setStyle({ fill: '#00ff00' }));


            // Login button
            const loginButton = this.add.text(centerX, centerY + 180, 'LOGIN', {
              fontFamily: '"Press Start 2P"',
              fontSize: '14px',
              fill: '#00ffff',
              backgroundColor: '#00000099',
              padding: { x: 15, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            loginButton.on('pointerdown', () => {
              SoundManager.play(this, 'click');
              const username = usernameInput.node.value.trim();
              const pin = pinInput.node.value.trim();
              if (!username || !pin) {
                messageText.setText('Username and PIN cannot be empty.');
                return;
              }
              this.attemptLogin(username, pin, messageText);
            });
            loginButton.on('pointerover', () => loginButton.setStyle({ fill: '#ffffff' }));
            loginButton.on('pointerout', () => loginButton.setStyle({ fill: '#00ffff' }));
        }
    });


  }

  async attemptLogin(username, pin, messageText) {
    messageText.setText(\`Logging in as \${username}...\`);
    const user = await verifyUser(username, pin);
    if (user) {
      // Store session indicator for auto-login
      localStorage.setItem('loggedInUser', user.username);

      // Store user data globally (e.g., in Phaser's registry)
      this.registry.set('loggedInUser', user); // user should be { username: 'name', max_score: 0 }

      messageText.setText(\`Welcome, \${user.username}!\`);
      SoundManager.play(this, 'submit'); // Or a login success sound

      // Transition to MenuScene
      this.time.delayedCall(1000, () => {
        this.scene.start('MenuScene');
      });
    } else {
      messageText.setText('Login failed: Invalid username or PIN.');
      SoundManager.play(this, 'error'); // Or a login fail sound
    }
  }

  update() {
    // Scene update loop (if needed)
  }
}
