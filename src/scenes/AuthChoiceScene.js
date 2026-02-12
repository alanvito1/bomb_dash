// src/scenes/AuthChoiceScene.js

import api from '../api.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class AuthChoiceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AuthChoiceScene' });
  }

  async create() {
    // JF-FIX: Initialize LanguageManager before creating UI
    // The scene was crashing because it tried to get translations before they were loaded.
    await LanguageManager.init(this);

    console.log('--- AuthChoiceScene: CREATE METHOD (adding button UI) ---');

    this.add
      .rectangle(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height,
        0x1a1a1a
      )
      .setOrigin(0);
    this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.height * 0.2,
        LanguageManager.get('auth_title'),
        {
          fontFamily: '"Press Start 2P"',
          fontSize: '32px',
          color: '#ffffff',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    // --- "Connect Wallet" Button ---
    const connectButton = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        LanguageManager.get('auth_web3_login'),
        {
          fontFamily: '"Press Start 2P"',
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#007bff',
          padding: { x: 20, y: 10 },
          align: 'center',
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setName('web3LoginButton'); // Nome estável para automação

    // --- Status Text ---
    const statusText = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY + 80, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#ffcc00',
        align: 'center',
      })
      .setOrigin(0.5);

    // AGGRESSIVE DEBUGGING - STEP 3:
    // The UI renders correctly. Now, let's re-add the event handler logic.
    // This is the complete, correct implementation.
    console.log(
      '--- AuthChoiceScene: CREATE METHOD (re-adding event handlers) ---'
    );

    connectButton.on('pointerdown', async () => {
      // 1. Disable button and show status
      connectButton.disableInteractive();
      connectButton.setText(LanguageManager.get('auth_connecting'));
      statusText.setText(''); // Clear previous errors

      try {
        // 2. Perform the Web3 login flow
        const loginResult = await api.web3Login();
        console.log('Web3 Login successful:', loginResult);

        // 3. On success, show confirmation and transition
        statusText.setText(LanguageManager.get('auth_success'));
        this.time.delayedCall(1000, () => {
          if (window.DEBUG_MODE) {
            console.log(
              '[DEBUG] Login successful. Starting transition to MenuScene...'
            );
          }
          this.scene.stop('AuthChoiceScene');
          this.scene.start('MenuScene');
        });
      } catch (error) {
        // 4. On failure, show error and re-enable button
        console.error('Web3 Login failed:', error);
        statusText.setText(error.message || LanguageManager.get('auth_error'));
        connectButton.setText(LanguageManager.get('auth_web3_login'));
        connectButton.setInteractive({ useHandCursor: true });
      }
    });
  }

  shutdown() {
    console.log('--- AuthChoiceScene: SHUTDOWN ---');
    // Destroy all children created in this scene to prevent them from leaking into the next scene
    this.children.removeAll(true);
  }
}
