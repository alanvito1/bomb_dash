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

/**
 * Creates a minimalist neon-styled button (Offline-First Design).
 * Visual: Rounded pill shape with bright neon border and large native text.
 *
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} text
 * @param {number} color - Hex color for the neon glow (default: Cyan 0x00ffff)
 * @param {function} onClick
 * @returns {Phaser.GameObjects.Container}
 */
export function createNeonButton(scene, x, y, text, color = 0x00ffff, onClick) {
  const container = scene.add.container(x, y);

  const width = 140;
  const height = 50;
  const radius = 25; // Round pill shape

  const bg = scene.add.graphics();

  const drawState = (isHover) => {
      bg.clear();
      // Fill
      if (isHover) {
          bg.fillStyle(color, 0.2);
      } else {
          bg.fillStyle(0x000000, 0.9);
      }
      bg.fillRoundedRect(-width/2, -height/2, width, height, radius);

      // Main Stroke
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, radius);

      // Glow Stroke
      const glowAlpha = isHover ? 0.6 : 0.3;
      const glowWidth = isHover ? 6 : 4;
      bg.lineStyle(glowWidth, color, glowAlpha);
      bg.strokeRoundedRect(-width/2, -height/2, width, height, radius);
  };

  drawState(false);
  container.add(bg);

  // Text: Large, readable, native font fallback
  const label = scene.add.text(0, 0, text, {
      fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center'
  }).setOrigin(0.5);

  // Subtle text shadow matching the neon color
  label.setShadow(0, 0, '#' + color.toString(16).padStart(6, '0'), 5);

  container.add(label);
  container.setSize(width, height);

  // Interaction
  container.setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
      drawState(true);
      container.setScale(1.05);
  });

  container.on('pointerout', () => {
      drawState(false);
      container.setScale(1.0);
  });

  container.on('pointerup', (pointer, localX, localY, event) => {
      if (event && event.stopPropagation) event.stopPropagation();

      // Click Feedback
      scene.tweens.add({
          targets: container,
          scale: 0.95,
          duration: 50,
          yoyo: true,
          onComplete: () => {
              container.setScale(1.05); // Return to hover scale
              if (onClick) onClick();
          }
      });
  });

  return container;
}
