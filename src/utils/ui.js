/**
 * Creates a standardized, interactive button for UI scenes.
 * The button is a container consisting of a rounded rectangle background and centered text.
 * It features visual feedback for hover and pressed states.
 *
 * @param {Phaser.Scene} scene - The scene in which to create the button.
 * @param {number} x - The horizontal position of the center of the button.
 * @param {number} y - The vertical position of the center of the button.
 * @param {string} text - The text to display on the button.
 * @param {function} onClick - The callback function to execute when the button is clicked (on pointerup).
 * @returns {Phaser.GameObjects.Container} The container GameObject representing the button,
 * allowing for further manipulation (e.g., scaling, positioning).
 */
export function createButton(scene, x, y, text, onClick) {
  const container = scene.add.container(x, y);

  const buttonWidth = 180;
  const buttonHeight = 50;

  const background = scene.add.graphics();
  background.fillStyle(0x5c5c5c, 1);
  background.fillRoundedRect(
    -buttonWidth / 2,
    -buttonHeight / 2,
    buttonWidth,
    buttonHeight,
    10
  );
  background.lineStyle(2, 0xffffff, 1);
  background.strokeRoundedRect(
    -buttonWidth / 2,
    -buttonHeight / 2,
    buttonWidth,
    buttonHeight,
    10
  );
  container.add(background);

  const buttonText = scene.add
    .text(0, 0, text, {
      fontSize: '12px',
      fontFamily: '"Press Start 2P"',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: buttonWidth - 10, useAdvancedWrap: true },
    })
    .setOrigin(0.5);
  container.add(buttonText);

  container.setSize(buttonWidth, buttonHeight);
  container
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      container.setScale(0.95);
    })
    .on('pointerup', () => {
      container.setScale(1);
      if (onClick) {
        onClick();
      }
    })
    .on('pointerover', () => {
      background.clear();
      background.fillStyle(0x7c7c7c, 1);
      background.fillRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        10
      );
      background.lineStyle(2, 0xffffff, 1);
      background.strokeRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        10
      );
    })
    .on('pointerout', () => {
      background.clear();
      background.fillStyle(0x5c5c5c, 1);
      background.fillRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        10
      );
      background.lineStyle(2, 0xffffff, 1);
      background.strokeRoundedRect(
        -buttonWidth / 2,
        -buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        10
      );
      container.setScale(1);
    });

  return container;
}
