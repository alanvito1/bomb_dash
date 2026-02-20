export default class DamageTextManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
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

    const text = this.scene.add
      .text(x, y, String(value), {
        fontFamily: '"Press Start 2P"',
        fontSize: fontSize,
        color: color,
        stroke: '#000000',
        strokeThickness: strokeThickness,
      })
      .setOrigin(0.5)
      .setDepth(100); // Ensure it's above most game objects

    this.scene.tweens.add({
      targets: text,
      y: y - yOffset,
      alpha: 0,
      duration: duration,
      ease: 'Power1',
      onComplete: () => {
        text.destroy();
      },
    });
  }
}
