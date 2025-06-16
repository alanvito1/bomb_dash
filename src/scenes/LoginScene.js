// src/scenes/LoginScene.js
// import { initDB, createUser, verifyUser } from '../database/database.js'; // REMOVIDO
import { registerUser, loginUser } from '../api.js'; // ADICIONADO
import SoundManager from '../utils/sound.js';

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  preload() {
    SoundManager.loadAll(this);
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create() { // async não é mais estritamente necessário aqui se initDB foi removido e não há awaits diretos
    // await initDB(); // REMOVIDO

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.cameras.main.setBackgroundColor('#000033');

    WebFont.load({
        google: { families: ['Press Start 2P'] },
        active: () => {
            this.add.text(centerX, centerY - 200, 'BOMB DASH LOGIN', {
              fontFamily: '"Press Start 2P"',
              fontSize: '24px',
              fill: '#00ffff',
              align: 'center'
            }).setOrigin(0.5);

            this.add.text(centerX - 150, centerY - 110, 'Username:', { fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#ffffff' });
            const usernameInput = this.add.dom(centerX, centerY - 80).createElement('input', {
              type: 'text',
              name: 'username',
              autocomplete: 'username',
              style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ffff; background-color: #333; color: #fff;'
            });
            usernameInput.setOrigin(0.5);

            this.add.text(centerX - 150, centerY - 30, 'PIN (4 digits):', { fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#ffffff' });
            const pinInput = this.add.dom(centerX, centerY).createElement('input', {
              type: 'password',
              name: 'pin',
              maxLength: 4,
              autocomplete: 'current-password',
              style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ffff; background-color: #333; color: #fff;'
            });
            pinInput.setOrigin(0.5);

            const messageText = this.add.text(centerX, centerY + 50, '', {
              fontFamily: '"Press Start 2P"',
              fontSize: '10px',
              fill: '#ff0000',
              align: 'center',
              wordWrap: { width: 300 }
            }).setOrigin(0.5);

            const createButton = this.add.text(centerX, centerY + 120, 'CREATE ACCOUNT', {
              fontFamily: '"Press Start 2P"',
              fontSize: '14px',
              fill: '#00ff00',
              backgroundColor: '#00000099',
              padding: { x: 15, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            createButton.on('pointerdown', async () => { // async aqui para await registerUser
              SoundManager.play(this, 'click');
              const username = usernameInput.node.value.trim();
              const pin = pinInput.node.value.trim();

              if (!username || !pin) {
                messageText.setText('Username and PIN cannot be empty.');
                return;
              }
              if (!/^[a-zA-Z0-9_]+$/.test(username) || username.length < 3) {
                messageText.setText('Username: min 3 chars, no spaces, only letters, numbers, underscores.');
                return;
              }
              if (!/^\d{4}$/.test(pin)) {
                messageText.setText('PIN must be 4 digits.');
                return;
              }

              messageText.setText('Creating account...');
              // const result = await createUser(username, pin); // ANTIGO
              const result = await registerUser(username, pin); // NOVO
              if (result.success) {
                messageText.setText(`Account ${username} created! Logging in...`);
                // Auto-login after creation
                this.attemptLogin(username, pin, messageText);
              } else {
                messageText.setText(result.message || 'Failed to create account.');
              }
            });
            createButton.on('pointerover', () => createButton.setStyle({ fill: '#ffffff' }));
            createButton.on('pointerout', () => createButton.setStyle({ fill: '#00ff00' }));

            const loginButton = this.add.text(centerX, centerY + 180, 'LOGIN', {
              fontFamily: '"Press Start 2P"',
              fontSize: '14px',
              fill: '#00ffff',
              backgroundColor: '#00000099',
              padding: { x: 15, y: 10 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            loginButton.on('pointerdown', async () => { // async aqui para await this.attemptLogin
              SoundManager.play(this, 'click');
              const username = usernameInput.node.value.trim();
              const pin = pinInput.node.value.trim();
              if (!username || !pin) {
                messageText.setText('Username and PIN cannot be empty.');
                return;
              }
              await this.attemptLogin(username, pin, messageText); // Adicionado await aqui
            });
            loginButton.on('pointerover', () => loginButton.setStyle({ fill: '#ffffff' }));
            loginButton.on('pointerout', () => loginButton.setStyle({ fill: '#00ffff' }));
        }
    });
  }

  async attemptLogin(username, pin, messageText) {
    messageText.setText(`Logging in as ${username}...`);
    // const user = await verifyUser(username, pin); // ANTIGO
    const result = await loginUser(username, pin); // NOVO

    if (result.success && result.token && result.user) {
      // Store session indicator (username) and JWT token in localStorage for persistence across sessions/reloads
      localStorage.setItem('loggedInUser', result.user.username);
      localStorage.setItem('jwtToken', result.token); // ARMAZENAR TOKEN

      // Store user data globally in Phaser's registry for current session use
      // result.user já deve ser { username: 'name', max_score: 0 }
      this.registry.set('loggedInUser', result.user);
      this.registry.set('jwtToken', result.token); // Também pode ser útil no registry

      messageText.setText(`Welcome, ${result.user.username}!`);
      SoundManager.play(this, 'submit');

      this.time.delayedCall(1000, () => {
        this.scene.start('MenuScene');
      });
    } else {
      messageText.setText(result.message || 'Login failed: Invalid username or PIN.');
      SoundManager.play(this, 'error');
    }
  }

  update() {
    // Scene update loop (if needed)
  }
}
