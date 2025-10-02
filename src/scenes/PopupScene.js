import { createButton } from '../utils/ui'; // Assuming a UI utility for button creation exists

class PopupScene extends Phaser.Scene {
    constructor() {
        super('PopupScene');
    }

    init(data) {
        this.title = data.title || 'Notification';
        this.message = data.message || '';
        this.buttons = data.buttons || [{ label: 'Close', callback: () => this.close() }];
        this.originScene = data.originScene; // The scene that launched the popup
    }

    create() {
        // Semi-transparent background
        const background = this.add.graphics();
        background.fillStyle(0x000000, 0.7);
        background.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

        const popupWidth = this.cameras.main.width * 0.8;
        const popupHeight = this.cameras.main.height * 0.5;
        const popupX = this.cameras.main.centerX;
        const popupY = this.cameras.main.centerY;

        // Popup container
        const popupContainer = this.add.container(popupX, popupY);

        // Popup background
        const popupBackground = this.add.graphics();
        popupBackground.fillStyle(0x2c2c2c, 1);
        popupBackground.lineStyle(2, 0xffffff, 1);
        popupBackground.fillRoundedRect(-popupWidth / 2, -popupHeight / 2, popupWidth, popupHeight, 16);
        popupBackground.strokeRoundedRect(-popupWidth / 2, -popupHeight / 2, popupWidth, popupHeight, 16);
        popupContainer.add(popupBackground);

        // Title
        const titleText = this.add.text(0, -popupHeight / 2 + 40, this.title, {
            fontSize: '32px',
            fontFamily: '"Press Start 2P"',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        popupContainer.add(titleText);

        // Message
        this.messageText = this.add.text(0, 0, this.message, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            wordWrap: { width: popupWidth - 40 }
        }).setOrigin(0.5);
        popupContainer.add(this.messageText);

        this.popupContainer = popupContainer; // Store reference to the container

        // Buttons
        this.buttonContainers = []; // To keep track of button containers for easy cleanup
        this.createButtons();
    }

    createButtons() {
        // 1. Clear any existing buttons
        this.buttonContainers.forEach(container => container.destroy());
        this.buttonContainers = [];

        // 2. Create new buttons
        const popupHeight = this.cameras.main.height * 0.5;
        const totalButtons = this.buttons.length;
        const buttonWidth = 180;
        const buttonSpacing = 20;
        const totalWidth = (totalButtons * buttonWidth) + ((totalButtons - 1) * buttonSpacing);
        let startX = -totalWidth / 2 + buttonWidth / 2;

        this.buttons.forEach((buttonInfo, index) => {
            const button = createButton(this, 0, 0, buttonInfo.label, () => {
                if (buttonInfo.callback) {
                    buttonInfo.callback();
                }
            });

            // Position the button inside the main popup container
            button.setPosition(startX + index * (buttonWidth + buttonSpacing), popupHeight / 2 - 70);

            this.popupContainer.add(button);
            this.buttonContainers.push(button); // Keep track of the button
        });
    }

    updateContent(message, buttons) {
        if (message !== undefined) {
            this.messageText.setText(message);
        }
        if (buttons) {
            this.buttons = buttons;
            this.createButtons();
        }
    }

    close() {
        if (this.originScene) {
            this.scene.resume(this.originScene);
        }
        this.scene.stop();
    }
}

export default PopupScene;