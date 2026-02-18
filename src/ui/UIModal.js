import SoundManager from '../utils/sound.js';

export default class UIModal extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} width - Width of the modal window
   * @param {number} height - Height of the modal window
   * @param {string} title - Title of the modal
   */
  constructor(scene, width, height, title) {
    super(scene, 0, 0);

    this.scene = scene;
    this.modalWidth = width;
    this.modalHeight = height;
    this.modalTitle = title;

    // Set depth high to appear above everything else
    this.setDepth(1000);
    this.setVisible(false);

    // 1. Overlay (Full screen dimmer)
    const { width: screenW, height: screenH } = scene.scale;
    this.overlay = scene.add.rectangle(screenW / 2, screenH / 2, screenW, screenH, 0x000000, 0.8);
    this.overlay.setInteractive(); // Block clicks below
    this.add(this.overlay);

    // 2. Modal Window Container (Centered)
    this.windowContainer = scene.add.container(screenW / 2, screenH / 2);
    this.add(this.windowContainer);

    // 3. Window Background (Neon Cyberpunk Style)
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 1.0); // Solid Black
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 16);

    // Border
    bg.lineStyle(2, 0x00ffff, 1);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);

    // Glow effect (simulated with multiple strokes or alpha)
    bg.lineStyle(4, 0x00ffff, 0.3);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);

    // Interactive Hit Area for Background (Blocks clicks)
    const hitArea = new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height);
    bg.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    this.windowContainer.add(bg);

    // 4. Title
    const titleText = scene.add.text(0, -height / 2 + 25, title.toUpperCase(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      fill: '#00ffff',
      align: 'center'
    }).setOrigin(0.5);

    // Title underline
    const line = scene.add.graphics();
    line.lineStyle(2, 0x00ffff, 0.5);
    line.beginPath();
    line.moveTo(-width / 2 + 20, -height / 2 + 50);
    line.lineTo(width / 2 - 20, -height / 2 + 50);
    line.strokePath();

    this.windowContainer.add([titleText, line]);

    // 5. Close Button (X)
    const closeBtnSize = 50; // Increased size
    const closeBtnX = width / 2 - 25;
    const closeBtnY = -height / 2 + 25;

    const closeBtn = scene.add.container(closeBtnX, closeBtnY);

    const btnBg = scene.add.circle(0, 0, 15, 0xff0000, 0.2); // Red tint bg
    const xText = scene.add.text(0, 0, 'X', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#ff0000'
    }).setOrigin(0.5);

    closeBtn.add([btnBg, xText]);
    // Larger interactive area
    closeBtn.setInteractive(new Phaser.Geom.Rectangle(-25, -25, 50, 50), Phaser.Geom.Rectangle.Contains);

    closeBtn.on('pointerover', () => {
        btnBg.setFillStyle(0xff0000, 0.5);
        xText.setColor('#ffffff');
    });

    closeBtn.on('pointerout', () => {
        btnBg.setFillStyle(0xff0000, 0.2);
        xText.setColor('#ff0000');
    });

    closeBtn.on('pointerdown', () => {
        this.close();
    });

    this.windowContainer.add(closeBtn);

    // Add this container to the scene
    scene.add.existing(this);
  }

  open() {
    this.setVisible(true);

    // Animation: Pop In
    this.windowContainer.setScale(0.8);
    this.windowContainer.setAlpha(0);
    this.overlay.setAlpha(0);

    this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0.8,
        duration: 200
    });

    this.scene.tweens.add({
        targets: this.windowContainer,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 300,
        ease: 'Back.out'
    });

    // Auto-Close Logic (Delay to prevent ghost clicks)
    // Remove any existing listener first
    this.overlay.off('pointerdown');
    this.scene.time.delayedCall(100, () => {
        if (!this.visible) return; // Prevent race condition
        this.overlay.once('pointerdown', () => this.close());
    });
  }

  close() {
      SoundManager.playClick(this.scene); // Requested "Click" sound

      // Cleanup listener
      this.overlay.off('pointerdown');

      // Animation: Pop Out
      this.scene.tweens.add({
          targets: this.windowContainer,
          scaleX: 0.8,
          scaleY: 0.8,
          alpha: 0,
          duration: 200,
          ease: 'Back.in',
          onComplete: () => {
              this.setVisible(false);
          }
      });

      this.scene.tweens.add({
          targets: this.overlay,
          alpha: 0,
          duration: 200
      });
  }
}
