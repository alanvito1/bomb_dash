// src/scenes/AuthChoiceScene.js

import { web3Login } from '../utils/api.js';

export default class AuthChoiceScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AuthChoiceScene' });
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
            statusText.setText('Connecting...');
            connectButton.disableInteractive(); // Prevent multiple clicks

            try {
                // Call the central Web3 login function from our api utility
                const loginSuccess = await web3Login();

                if (loginSuccess) {
                    statusText.setText('Success! Loading game...');
                    // On successful login, transition to the main menu
                    this.time.delayedCall(1000, () => {
                        this.scene.start('MenuScene');
                    });
                } else {
                    // This case handles if the user rejects the connection in MetaMask
                    throw new Error('Wallet connection was rejected.');
                }
            } catch (error) {
                console.error('Authentication failed:', error);
                statusText.setText(`Error: ${error.message || 'Connection failed.'}`);
                // Re-enable the button after a short delay so the user can try again
                this.time.delayedCall(2000, () => {
                    connectButton.setInteractive({ useHandCursor: true });
                    statusText.setText(''); // Clear the error message
                });
            }
        });

        connectButton.on('pointerover', () => {
            connectButton.setBackgroundColor('#0056b3');
        });

        connectButton.on('pointerout', () => {
            connectButton.setBackgroundColor('#007bff');
        });
    }
}