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
    this.overlay = scene.add.rectangle(screenW / 2, screenH / 2, screenW, screenH, 0x000000, 0.95);
    this.overlay.setInteractive(); // Block clicks below
    this.add(this.overlay);

    // 2. Modal Window Container (Centered)
    this.windowContainer = scene.add.container(screenW / 2, screenH / 2);
    this.add(this.windowContainer);

    // 3. Window Background (9-Slice Neon Style)
    // Using 'ui_panel' (White Border, Black Center)
    const bg = scene.add.nineslice(
        0, 0,
        'ui_panel', 0,
        width, height,
        10, 10, 10, 10
    );
    bg.setTint(0xFF5F1F); // Neon Orange Tint (Default)
    bg.setInteractive(); // Block clicks through

    this.windowContainer.add(bg);

    // 4. Title
    const titleText = scene.add.text(0, -height / 2 + 25, title.toUpperCase(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      fill: '#ffffff',
      align: 'center',
      stroke: '#FF5F1F',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Title underline
    const line = scene.add.graphics();
    line.lineStyle(2, 0xFF5F1F, 1);
    line.beginPath();
    line.moveTo(-width / 2 + 20, -height / 2 + 45);
    line.lineTo(width / 2 - 20, -height / 2 + 45);
    line.strokePath();

    this.windowContainer.add([titleText, line]);

    // 5. Close Button (X) - Tactile
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
    closeBtn.setInteractive(new Phaser.Geom.Rectangle(-20, -20, 40, 40), Phaser.Geom.Rectangle.Contains);

    closeBtn.on('pointerover', () => {
        btnBg.setFillStyle(0xff0000, 0.5);
        xText.setColor('#ffffff');
        scene.input.setDefaultCursor('pointer');
    });

    closeBtn.on('pointerout', () => {
        btnBg.setFillStyle(0xff0000, 0.2);
        xText.setColor('#ff0000');
        scene.input.setDefaultCursor('default');
        closeBtn.setScale(1);
    });

    closeBtn.on('pointerdown', () => {
        closeBtn.setScale(0.95);
    });

    closeBtn.on('pointerup', () => {
        closeBtn.setScale(1);
        this.close();
    });

    this.windowContainer.add(closeBtn);

    // Add this container to the scene
    scene.add.existing(this);
  }

  open() {
    this.setVisible(true);

    if (this.scene.chatWidget && typeof this.scene.chatWidget.setVisible === 'function') {
        this.scene.chatWidget.setVisible(false);
    }

    // Animation: Pop In
    this.windowContainer.setScale(0.8);
    this.windowContainer.setAlpha(0);
    this.overlay.setAlpha(0);

    this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0.95,
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
    this.scene.time.delayedCall(200, () => {
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
        if (this.scene.chatWidget && typeof this.scene.chatWidget.setVisible === 'function') {
            this.scene.chatWidget.setVisible(true);
        }
          }
      });

      this.scene.tweens.add({
          targets: this.overlay,
          alpha: 0,
          duration: 200
      });
  }
}
