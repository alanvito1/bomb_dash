import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PauseScene' });
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Create a semi-transparent background overlay
        this.add.graphics()
            .fillStyle(0x000000, 0.6)
            .fillRect(0, 0, this.scale.width, this.scale.height);

        // Pause Title
        this.add.text(centerX, centerY - 100, LanguageManager.get('pause_title'), {
            fontFamily: '"Press Start 2P"',
            fontSize: '32px',
            fill: '#FFD700',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Menu Buttons
        const menuItems = [
            { label: LanguageManager.get('pause_continue'), action: 'resume' },
            { label: LanguageManager.get('pause_settings'), action: 'settings' },
            { label: LanguageManager.get('pause_exit'), action: 'exit' }
        ];

        const buttonSpacing = 60;
        menuItems.forEach((item, index) => {
            const buttonY = centerY + (index * buttonSpacing);
            const button = this.add.text(centerX, buttonY, item.label, {
                fontFamily: '"Press Start 2P"',
                fontSize: '20px',
                fill: '#ffffff',
                backgroundColor: '#000000cc',
                padding: { x: 10, y: 5 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

            button.on('pointerdown', () => {
                SoundManager.play(this, 'click');
                this.handleAction(item.action);
            });

            button.on('pointerover', () => button.setStyle({ fill: '#00ffff' }));
            button.on('pointerout', () => button.setStyle({ fill: '#ffffff' }));
        });
    }

    handleAction(action) {
        const gameScene = this.scene.get('GameScene');

        switch (action) {
            case 'resume':
                this.scene.stop();
                gameScene.scene.resume();
                break;
            case 'settings':
                // Placeholder for settings
                console.log('Settings button clicked. No action implemented yet.');
                break;
            case 'exit':
                // Stop both game-related scenes and return to the menu
                gameScene.scene.stop();
                this.scene.get('HUDScene').scene.stop();
                this.scene.start('MenuScene');
                break;
        }
    }
}