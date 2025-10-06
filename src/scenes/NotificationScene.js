import { createButton } from '../utils/ui.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';
import { CST } from '../CST.js';

class NotificationScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENES.NOTIFICATION });
    }

    create() {
        // The container for all popup elements
        this.popupContainer = this.add.container(this.cameras.main.centerX, this.cameras.main.centerY).setVisible(false);

        // Semi-transparent background overlay
        this.overlay = this.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.7 } });
        this.overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        this.popupContainer.add(this.overlay);

        const popupWidth = this.cameras.main.width * 0.8;
        const popupHeight = this.cameras.main.height * 0.5;

        // Popup background
        this.popupBackground = this.add.graphics({ fillStyle: { color: 0x2c2c2c }, lineStyle: { width: 2, color: 0xffffff } });
        this.popupBackground.fillRoundedRect(-popupWidth / 2, -popupHeight / 2, popupWidth, popupHeight, 16);
        this.popupBackground.strokeRoundedRect(-popupWidth / 2, -popupHeight / 2, popupWidth, popupHeight, 16);
        this.popupContainer.add(this.popupBackground);

        // Title
        this.titleText = this.add.text(0, -popupHeight / 2 + 40, '', {
            fontSize: '32px',
            fontFamily: '"Press Start 2P"',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.popupContainer.add(this.titleText);

        // Message
        this.messageText = this.add.text(0, 0, '', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: popupWidth - 40 }
        }).setOrigin(0.5);
        this.popupContainer.add(this.messageText);

        // To hold button elements
        this.buttons = [];

        // Listen for global events
        GameEventEmitter.on('transaction:pending', this.showPending, this);
        GameEventEmitter.on('transaction:success', this.showSuccess, this);
        GameEventEmitter.on('transaction:error', this.showError, this);
    }

    clearButtons() {
        this.buttons.forEach(button => button.destroy());
        this.buttons = [];
    }

    showPopup(title, message, buttonConfigs) {
        this.clearButtons();

        this.titleText.setText(title);
        this.messageText.setText(message);

        const popupHeight = this.cameras.main.height * 0.5;
        const totalButtons = buttonConfigs.length;
        const buttonWidth = 180;
        const buttonSpacing = 20;
        const totalWidth = (totalButtons * buttonWidth) + ((totalButtons - 1) * buttonSpacing);
        let startX = -totalWidth / 2 + buttonWidth / 2;

        buttonConfigs.forEach((btnConfig, index) => {
            const button = createButton(this, 0, 0, btnConfig.label, btnConfig.callback);
            button.setPosition(startX + index * (buttonWidth + buttonSpacing), popupHeight / 2 - 70);
            this.popupContainer.add(button);
            this.buttons.push(button);
        });

        this.popupContainer.setVisible(true);
        this.scene.bringToTop();
    }

    hidePopup() {
        this.popupContainer.setVisible(false);
    }

    showPending(txHash) {
        const message = `Transaction pending...\n\nHash: ${txHash.substring(0, 10)}...`;
        const buttons = [{
            label: 'View on Explorer',
            callback: () => {
                // This is a placeholder. A real implementation would use a configured block explorer URL.
                const explorerUrl = `https://etherscan.io/tx/${txHash}`;
                window.open(explorerUrl, '_blank');
            }
        }];
        this.showPopup('Processing', message, buttons);
    }

    showSuccess(message = 'Transaction successful!') {
        const buttons = [{
            label: 'OK',
            callback: () => this.hidePopup()
        }];
        this.showPopup('Success', message, buttons);
    }

    showError(errorMessage = 'Transaction failed.') {
        // Try to extract a useful message from the error object
        let displayMessage = errorMessage;
        if (typeof errorMessage === 'object' && errorMessage !== null) {
            displayMessage = errorMessage.reason || errorMessage.message || 'An unknown error occurred.';
        } else if (typeof errorMessage !== 'string') {
            displayMessage = 'An unknown error occurred.';
        }

        const buttons = [{
            label: 'Close',
            callback: () => this.hidePopup()
        }];
        this.showPopup('Error', displayMessage, buttons);
    }

    // Cleanup listeners when the scene is shut down
    shutdown() {
        GameEventEmitter.off('transaction:pending', this.showPending, this);
        GameEventEmitter.off('transaction:success', this.showSuccess, this);
        GameEventEmitter.off('transaction:error', this.showError, this);
    }
}

export default NotificationScene;