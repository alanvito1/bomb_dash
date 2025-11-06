// src/modules/UIGenerator.js
import SoundManager from '../utils/sound.js';

/**
 * Creates a standardized button with interactive states and cyberpunk styling.
 * @param {Phaser.Scene} scene - The scene to add the button to.
 * @param {number} x - The x-coordinate of the button.
 * @param {number} y - The y-coordinate of the button.
 * @param {string} text - The text to display on the button.
 * @param {function} onClick - The callback function to execute when the button is clicked.
 * @returns {Phaser.GameObjects.Container} The created button container.
 */
export function createButton(scene, x, y, text, onClick) {
    const button = scene.add.container(x, y);

    const buttonBackground = scene.add.image(0, 0, 'btn_menu').setOrigin(0.5);
    buttonBackground.setDisplaySize(280, 50);

    const buttonText = scene.add.text(0, 0, text, {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#ffffff',
        align: 'center'
    }).setOrigin(0.5);

    button.add([buttonBackground, buttonText]);
    button.setSize(280, 50);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
        buttonBackground.setTint(0xcccccc);
        buttonText.setTint(0xffd700);
    });

    button.on('pointerout', () => {
        buttonBackground.clearTint();
        buttonText.clearTint();
    });

    button.on('pointerdown', () => {
        buttonBackground.setTint(0xaaaaaa);
    });

    button.on('pointerup', () => {
        buttonBackground.clearTint();
        SoundManager.play(scene, 'click');
        if (onClick) {
            onClick();
        }
    });

    return button;
}

/**
 * Creates a standardized title text with cyberpunk styling.
 * @param {Phaser.Scene} scene - The scene to add the title to.
 * @param {number} x - The x-coordinate of the title.
 * @param {number} y - The y-coordinate of the title.
 * @param {string} text - The text to display.
 * @returns {Phaser.GameObjects.Text} The created title text object.
 */
export function createTitle(scene, x, y, text) {
    return scene.add.text(x, y, text, {
        fontFamily: '"Press Start 2P"',
        fontSize: '28px',
        fill: '#FFD700',
        stroke: '#000',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#FFD700', blur: 10, fill: true }
    }).setOrigin(0.5);
}

/**
 * Creates a standardized panel or window with a cyberpunk border.
 * @param {Phaser.Scene} scene - The scene to add the panel to.
 * @param {number} x - The x-coordinate of the panel.
 * @param {number} y - The y-coordinate of the panel.
 * @param {number} width - The width of the panel.
 * @param {number} height - The height of the panel.
 * @returns {Phaser.GameObjects.Graphics} The created panel graphics object.
 */
export function createPanel(scene, x, y, width, height) {
    const panel = scene.add.graphics();
    panel.fillStyle(0x000000, 0.8);
    panel.fillRect(x, y, width, height);
    panel.lineStyle(2, 0x00ffff, 0.8);
    panel.strokeRect(x, y, width, height);
    return panel;
}
