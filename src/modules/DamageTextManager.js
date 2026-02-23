/**
 * Custom Text class for pooling
 */
class PooledText extends Phaser.GameObjects.Text {
  constructor(scene, x, y) {
    super(scene, x, y, '', { fontFamily: '"Press Start 2P"' });
    // Default state
    this.setOrigin(0.5);
    this.setDepth(100);
    this.setActive(false);
    this.setVisible(false);
  }
}

export default class DamageTextManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    // Create a group for pooling text objects
    this.pool = this.scene.add.group({
      classType: PooledText,
      maxSize: 50, // Limit maximum floating texts to prevent memory spikes
      runChildUpdate: false
    });
  }

  /**
   * Shows a floating damage number.
   * @param {number} x - World X position.
   * @param {number} y - World Y position.
   * @param {string|number} value - The text to display.
   * @param {boolean} isCritical - Whether it's a critical hit (larger, different color).
   * @param {boolean} isBoss - Whether it's a boss hit (even larger).
   */
  show(x, y, value, isCritical = false, isBoss = false) {
    // Get text from pool
    const text = this.pool.get(x, y);

    if (!text) return; // Pool full or error

    let fontSize = '16px';
    let color = '#ffffff';
    let strokeThickness = 3;
    let duration = 600;
    let yOffset = 50;

    if (isBoss) {
      fontSize = '24px';
      color = '#ff00ff'; // Magenta
      strokeThickness = 4;
      duration = 800;
      yOffset = 80;
    } else if (isCritical) {
      fontSize = '20px';
      color = '#ff5f1f'; // Neon Orange
      strokeThickness = 4;
    }

    // Configure the reused text object
    text.setText(String(value));
    text.setStyle({
      fontFamily: '"Press Start 2P"',
      fontSize: fontSize,
      color: color,
      stroke: '#000000',
      strokeThickness: strokeThickness,
    });

    // Reset properties
    text.setPosition(x, y);
    text.setAlpha(1);
    text.setActive(true);
    text.setVisible(true);
    text.setScale(1); // Ensure scale is reset if modified elsewhere

    // Stop any existing tween on this object
    this.scene.tweens.killTweensOf(text);

    this.scene.tweens.add({
      targets: text,
      y: y - yOffset,
      alpha: 0,
      duration: duration,
      ease: 'Power1',
      onComplete: () => {
        text.setActive(false);
        text.setVisible(false);
      },
    });
  }
}
