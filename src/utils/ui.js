/**
 * Creates a reusable button with a background and text.
 * @param {Phaser.Scene} scene - The scene to add the button to.
 * @param {number} x - The x-coordinate of the button.
 * @param {number} y - The y-coordinate of the button.
 * @param {string} text - The text to display on the button.
 * @param {function} onClick - The callback function to execute when the button is clicked.
 * @returns {Phaser.GameObjects.Container} The button container.
 */
export function createButton(scene, x, y, text, onClick) {
    const container = scene.add.container(x, y);

    const buttonWidth = 180;
    const buttonHeight = 50;

    // Button background
    const background = scene.add.graphics();
    background.fillStyle(0x5c5c5c, 1);
    background.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
    background.lineStyle(2, 0xffffff, 1);
    background.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
    container.add(background);

    // Button text
    const buttonText = scene.add.text(0, 0, text, {
        fontSize: '12px', // Reduced font size to prevent overflow
        fontFamily: '"Press Start 2P"',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: buttonWidth - 10, useAdvancedWrap: true }
    }).setOrigin(0.5);
    container.add(buttonText);

    // Interactivity
    container.setSize(buttonWidth, buttonHeight);
    container.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            // Pressed state
            container.setScale(0.95);
        })
        .on('pointerup', () => {
            container.setScale(1);
            if (onClick) {
                onClick();
            }
        })
        .on('pointerover', () => {
            // Hover state
            background.clear();
            background.fillStyle(0x7c7c7c, 1);
            background.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
            background.lineStyle(2, 0xffffff, 1);
            background.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
        })
        .on('pointerout', () => {
            // Default state
            background.clear();
            background.fillStyle(0x5c5c5c, 1);
            background.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
            background.lineStyle(2, 0xffffff, 1);
            background.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, 10);
            container.setScale(1);
        });

    return container;
}