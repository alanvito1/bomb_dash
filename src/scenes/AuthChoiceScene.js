// src/scenes/AuthChoiceScene.js

import api from '../api.js';
import LanguageManager from '../utils/LanguageManager.js';
import { CST } from '../CST.js'; // Import CST

export default class AuthChoiceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AuthChoiceScene' });
  }

  async create() {
    // JF-FIX: Initialize LanguageManager before creating UI
    await LanguageManager.init(this);

    console.log('--- AuthChoiceScene: CREATE METHOD (adding button UI) ---');

    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    this.add
      .rectangle(
        0,
        0,
        width,
        height,
        0x050505
      )
      .setOrigin(0);

    // Title
    this.add
      .text(
        centerX,
        height * 0.2,
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
        centerX,
        centerY,
        LanguageManager.get('auth_web3_login'),
        {
          fontFamily: '"Press Start 2P"',
          fontSize: '20px',
          color: '#FF5F1F',
          backgroundColor: '#050505',
          padding: { x: 20, y: 10 },
          align: 'center',
          stroke: '#FF5F1F',
          strokeThickness: 2
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setName('web3LoginButton');

    // Manual border via padding hack or graphics? Text doesn't support border easily.
    // Let's add hover effects.
    connectButton.on('pointerover', () => {
        connectButton.setStyle({ color: '#000000', backgroundColor: '#FF5F1F' });
    });
    connectButton.on('pointerout', () => {
        connectButton.setStyle({ color: '#FF5F1F', backgroundColor: '#050505' });
    });


    // --- "Play As Guest" Button ---
    // Added back for testing/guest access
    const guestButton = this.add
      .text(
        centerX,
        centerY + 80,
        "PLAY AS GUEST", // Hardcoded fallback or add to en.json
        {
          fontFamily: '"Press Start 2P"',
          fontSize: '16px',
          color: '#00FFFF',
          backgroundColor: '#050505',
          padding: { x: 20, y: 10 },
          align: 'center',
          stroke: '#00FFFF',
          strokeThickness: 2
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setName('guestLoginButton');

     guestButton.on('pointerover', () => {
        guestButton.setStyle({ color: '#000000', backgroundColor: '#00FFFF' });
    });
    guestButton.on('pointerout', () => {
        guestButton.setStyle({ color: '#00FFFF', backgroundColor: '#050505' });
    });

    // --- Status Text ---
    const statusText = this.add
      .text(centerX, centerY + 160, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#ffcc00',
        align: 'center',
      })
      .setOrigin(0.5);

    // Event Handlers

    // Connect Wallet
    connectButton.on('pointerdown', async () => {
      connectButton.disableInteractive();
      guestButton.disableInteractive();
      connectButton.setText(LanguageManager.get('auth_connecting'));
      statusText.setText('');

      try {
        const loginResult = await api.web3Login();
        console.log('Web3 Login successful:', loginResult);

        statusText.setText(LanguageManager.get('auth_success'));
        this.time.delayedCall(1000, () => {
          this.scene.stop('AuthChoiceScene');
          this.scene.start('MenuScene');
        });
      } catch (error) {
        console.error('Web3 Login failed:', error);
        statusText.setText(error.message || LanguageManager.get('auth_error'));
        connectButton.setText(LanguageManager.get('auth_web3_login'));
        connectButton.setInteractive({ useHandCursor: true });
        guestButton.setInteractive({ useHandCursor: true });
      }
    });

    // Guest Login
    guestButton.on('pointerdown', async () => {
      guestButton.disableInteractive();
      connectButton.disableInteractive();
      guestButton.setText('Logging in...');
      statusText.setText('');

      try {
        // Use guest login API or mock
        const loginResult = await api.guestLogin();
        console.log('Guest Login successful:', loginResult);

        statusText.setText(LanguageManager.get('auth_success'));
        this.time.delayedCall(1000, () => {
          this.scene.stop('AuthChoiceScene');
          this.scene.start('MenuScene');
        });
      } catch (error) {
        console.error('Guest Login failed:', error);
        statusText.setText('Guest Login Failed');
        guestButton.setText('PLAY AS GUEST');
        guestButton.setInteractive({ useHandCursor: true });
        connectButton.setInteractive({ useHandCursor: true });
      }
    });
  }

  shutdown() {
    console.log('--- AuthChoiceScene: SHUTDOWN ---');
    this.children.removeAll(true);
  }
}
