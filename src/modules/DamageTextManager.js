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
   * Shows a floating damage number or status text.
   * @param {number} x - World X position.
   * @param {number} y - World Y position.
   * @param {string|number} value - The text to display.
   * @param {string|boolean} styleOrCrit - Style name ('DAMAGE', 'HEAL', 'GOLD', 'CRIT') OR isCritical boolean.
   * @param {boolean} isBoss - Whether it's a boss hit (legacy override).
   */
  show(x, y, value, styleOrCrit = 'DAMAGE', isBoss = false) {
    // Get text from pool
    const text = this.pool.get(x, y);

    if (!text) return; // Pool full or error

    // Task Force: Ensure text is on display list and high depth
    // Note: PooledText constructor sets 'scene', but not displayList.
    if (!text.displayList) {
        this.scene.add.existing(text);
    }
    text.setDepth(2000); // Higher than map (100) and player

    let fontSize = '16px';
    let color = '#ffffff';
    let strokeThickness = 3;
    let duration = 600;
    let yOffset = 50;

    // Resolve Style
    let style = 'DAMAGE';
    if (typeof styleOrCrit === 'boolean') {
        if (styleOrCrit) style = 'CRIT';
        if (isBoss) style = 'BOSS';
    } else {
        style = styleOrCrit;
    }

    // Apply Style Config
    switch (style) {
        case 'BOSS':
            fontSize = '24px';
            color = '#ff00ff'; // Magenta
            strokeThickness = 4;
            duration = 1000;
            yOffset = 80;
            break;
        case 'CRIT':
            fontSize = '20px';
            color = '#ff5f1f'; // Neon Orange
            strokeThickness = 4;
            break;
        case 'HEAL':
            fontSize = '16px';
            color = '#00ff00'; // Green
            strokeThickness = 3;
            duration = 800;
            yOffset = 60;
            break;
        case 'GOLD':
            fontSize = '14px';
            color = '#ffd700'; // Gold
            strokeThickness = 3;
            duration = 1000;
            yOffset = 60;
            break;
        case 'XP':
            fontSize = '14px';
            color = '#00ffff'; // Cyan
            strokeThickness = 2;
            break;
        // Fragment Rarities (Use explicit colors if passed, or default to style logic)
        // Here we can map passed style strings directly if needed, but for now specific cases:
        default:
            // Check for hex color string in style? Or just default.
            if (style.startsWith('#')) color = style;
            else if (style === 'DAMAGE') color = '#ffffff';
            break;
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

    // Dynamic Tween based on style
    let tweenConfig = {
      targets: text,
      y: y - yOffset,
      alpha: 0,
      duration: duration,
      ease: 'Power1',
      onComplete: () => {
        text.setActive(false);
        text.setVisible(false);
      },
    };

    if (style === 'GOLD' || style === 'HEAL') {
         // Bounce effect for loot
         tweenConfig.ease = 'Back.easeOut';
    }

    this.scene.tweens.add(tweenConfig);
  }
}
