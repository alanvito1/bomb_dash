// src/scenes/AuthChoiceScene.js

import api from '../api.js';

export default class AuthChoiceScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AuthChoiceScene' });
        this.connectionStatus = 'IDLE'; // State: IDLE, CONNECTING, CONNECTED
    }

    create() {
        // --- Background and Title ---
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a1a1a).setOrigin(0);
        this.add.text(this.cameras.main.centerX, this.cameras.main.height * 0.2, 'Bomb Dash Web3', {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // --- "Connect Wallet" Button ---
        const connectButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Connect with Wallet', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#007bff',
            padding: { x: 20, y: 10 },
            align: 'center'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        // --- Status Text ---
        const statusText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 80, '', {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#ffcc00',
            align: 'center'
        }).setOrigin(0.5);

        // --- Button Interaction Logic ---
        connectButton.on('pointerdown', async () => {
            // 1. Check state
            if (this.connectionStatus !== 'IDLE') {
                return;
            }

            // 2. Set state to CONNECTING and update UI
            this.connectionStatus = 'CONNECTING';
            statusText.setText('Connecting...');
            connectButton.disableInteractive();
            connectButton.setBackgroundColor('#555555'); // Visually disable button

            try {
                // Call the central Web3 login function from our api utility
                const loginResult = await api.web3Login();

                if (loginResult.success) {
                    // 3. Set state to CONNECTED on success
                    this.connectionStatus = 'CONNECTED';
                    statusText.setText('Success! Loading game...');
                    // On successful login, transition to the main menu
                    this.time.delayedCall(1000, () => {
                        this.scene.start('MenuScene');
                    });
                } else {
                    // This case is now unlikely as api.web3Login throws on failure
                    throw new Error(loginResult.message || 'Wallet connection was rejected.');
                }
            } catch (error) {
                console.error('Authentication failed:', error);
                statusText.setText(`Error: ${error.message || 'Connection failed.'}`);

                // 3. Revert state to IDLE on failure
                this.connectionStatus = 'IDLE';

                // Re-enable the button after a short delay so the user can try again
                this.time.delayedCall(2000, () => {
                    connectButton.setInteractive({ useHandCursor: true });
                    connectButton.setBackgroundColor('#007bff'); // Restore original color
                    statusText.setText(''); // Clear the error message
                });
            }
        });

        connectButton.on('pointerover', () => {
            if (this.connectionStatus === 'IDLE') {
                connectButton.setBackgroundColor('#0056b3');
            }
        });

        connectButton.on('pointerout', () => {
            if (this.connectionStatus === 'IDLE') {
                connectButton.setBackgroundColor('#007bff');
            }
        });
    }
}