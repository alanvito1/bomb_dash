// src/scenes/AuthChoiceScene.js

import api from '../api.js';

export default class AuthChoiceScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AuthChoiceScene' });
    }

    create() {
        // AGGRESSIVE DEBUGGING - STEP 2:
        // The minimal scene worked. Now, let's add back the button UI
        // WITHOUT the event handler logic to see if rendering the button causes the crash.
        console.log('--- AuthChoiceScene: CREATE METHOD (adding button UI) ---');

        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x1a1a1a).setOrigin(0);
        this.add.text(this.cameras.main.centerX, this.cameras.main.height * 0.2, 'Bomb Dash Web3', {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // --- "Connect Wallet" Button ---
        const connectButton = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'Web3 Login', {
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

        // NOTE: Event handler logic is deliberately omitted for this test.
    }
}