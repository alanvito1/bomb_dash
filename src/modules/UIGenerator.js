// src/modules/UIGenerator.js
import SoundManager from '../utils/sound.js';

/**
 * Creates a standardized button with interactive states and cyberpunk styling.
 * Now fully procedural using Phaser.Graphics - No assets required!
 *
 * @param {Phaser.Scene} scene - The scene to add the button to.
 * @param {number} x - The x-coordinate of the button.
 * @param {number} y - The y-coordinate of the button.
 * @param {string} text - The text to display on the button.
 * @param {function} onClick - The callback function to execute when the button is clicked.
 * @returns {Phaser.GameObjects.Container} The created button container.
 */
export function createButton(scene, x, y, text, onClick) {
  const width = 280;
  const height = 50;
  const glowColor = 0x00ffff; // Neon Cyan
  const baseColor = 0x000033; // Dark Blue
  const hoverColor = 0x000066; // Slightly lighter blue

  const container = scene.add.container(x, y);

  // 1. Create the Graphics Object for the button
  const bg = scene.add.graphics();

  // Helper to draw the button state
  const drawButton = (isHovered = false, isPressed = false) => {
    bg.clear();

    const fillColor = isPressed ? 0x000022 : isHovered ? hoverColor : baseColor;

    // Glow effect (outer stroke with low alpha)
    if (isHovered) {
      bg.lineStyle(4, glowColor, 0.3);
      bg.strokeRoundedRect(
        -width / 2 - 2,
        -height / 2 - 2,
        width + 4,
        height + 4,
        12
      );
    }

    // Main Border
    bg.lineStyle(2, glowColor, 1);

    // Background
    bg.fillStyle(fillColor, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    // Scanlines Effect
    bg.lineStyle(1, 0x000000, 0.3);
    for (let i = -height / 2 + 2; i < height / 2; i += 4) {
      bg.beginPath();
      bg.moveTo(-width / 2 + 5, i);
      bg.lineTo(width / 2 - 5, i);
      bg.strokePath();
    }
  };

  // Initial draw
  drawButton(false);

  // 2. Text
  const buttonText = scene.add
    .text(0, 0, text, {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px', // Slightly smaller to fit scanlines
      fill: '#ffffff',
      align: 'center',
    })
    .setOrigin(0.5);

  container.add([bg, buttonText]);

  // 3. Interactivity
  // Set size for hit area
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerover', () => {
    drawButton(true, false);
    buttonText.setTint(0xffd700); // Gold text on hover
    buttonText.setScale(1.05);
  });

  container.on('pointerout', () => {
    drawButton(false, false);
    buttonText.clearTint();
    buttonText.setScale(1);
  });

  container.on('pointerdown', () => {
    drawButton(true, true);
    container.setScale(0.95); // Press effect
  });

  container.on('pointerup', () => {
    drawButton(true, false); // Return to hover state
    container.setScale(1);

    // Use the robust sound manager
    SoundManager.playClick(scene);

    if (onClick) {
      onClick();
    }
  });

  return container;
}

/**
 * Applies global "Game Juice" (scale effect and sound) to any interactive GameObject.
 * Captures the object's initial scale to restore it correctly.
 * @param {Phaser.GameObjects.GameObject} target - The object to make juicy.
 * @param {Phaser.Scene} scene - The scene reference (for sound).
 */
export function addJuice(target, scene) {
  const startScaleX = target.scaleX;
  const startScaleY = target.scaleY;

  if (!target.input) {
    target.setInteractive({ useHandCursor: true });
  }

  target.on('pointerdown', () => {
    target.setScale(startScaleX * 0.95, startScaleY * 0.95);
  });

  target.on('pointerup', () => {
    target.setScale(startScaleX, startScaleY);
    SoundManager.playClick(scene);
  });

  target.on('pointerout', () => {
    target.setScale(startScaleX, startScaleY);
  });
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
  return scene.add
    .text(x, y, text, {
      fontFamily: '"Press Start 2P"',
      fontSize: '28px',
      fill: '#FFD700',
      stroke: '#000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#FFD700',
        blur: 10,
        fill: true,
      },
    })
    .setOrigin(0.5);
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

  // Background
  panel.fillStyle(0x000000, 0.85);
  panel.fillRect(x, y, width, height);

  // Neon Border
  panel.lineStyle(2, 0x00ffff, 0.8);
  panel.strokeRect(x, y, width, height);

  // Inner Glow
  panel.lineStyle(4, 0x00ffff, 0.2);
  panel.strokeRect(x - 2, y - 2, width + 4, height + 4);

  return panel;
}

/**
 * Draws a procedural Cyberpunk Grid background.
 * @param {Phaser.Scene} scene - The scene to draw the grid on.
 * @returns {Phaser.GameObjects.Graphics} The graphics object containing the grid.
 */
export function drawCyberpunkGrid(scene) {
  const width = scene.scale.width;
  const height = scene.scale.height;

  const bg = scene.add.graphics();

  // 1. Solid Dark Background
  bg.fillStyle(0x050010, 1); // Very dark purple/blue
  bg.fillRect(0, 0, width, height);

  // 2. Grid Lines
  bg.lineStyle(1, 0x9900ff, 0.2); // Purple, low opacity

  const gridSize = 50;

  // Vertical Lines
  for (let x = 0; x <= width; x += gridSize) {
    bg.beginPath();
    bg.moveTo(x, 0);
    bg.lineTo(x, height);
    bg.strokePath();
  }

  // Horizontal Lines
  for (let y = 0; y <= height; y += gridSize) {
    bg.beginPath();
    bg.moveTo(0, y);
    bg.lineTo(width, y);
    bg.strokePath();
  }

  return bg;
}
