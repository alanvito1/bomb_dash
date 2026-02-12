import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { CST } from '../CST.js';

export default class ConfigScene extends Phaser.Scene {
  constructor() {
    super({ key: CST.SCENES.CONFIG });
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Semi-transparent background to act as a modal overlay
    this.add
      .rectangle(
        0,
        0,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.7
      )
      .setOrigin(0);

    // Title
    this.add
      .text(centerX, 80, 'Settings', {
        fontFamily: '"Press Start 2P"',
        fontSize: '32px',
        color: '#FFD700',
      })
      .setOrigin(0.5);

    // Sliders
    this.createSlider(
      centerX,
      180,
      'Master Volume',
      SoundManager.masterVolume,
      (value) => SoundManager.setMasterVolume(this, value)
    );
    this.createSlider(
      centerX,
      280,
      'Music',
      SoundManager.musicVolume,
      (value) => SoundManager.setMusicVolume(value)
    );
    this.createSlider(
      centerX,
      380,
      'Sound Effects',
      SoundManager.sfxVolume,
      (value) => SoundManager.setSfxVolume(value)
    );

    // Reset Data Button
    const resetButton = this.add
      .text(centerX, 480, 'Reset Data', {
        fontFamily: '"Press Start 2P"',
        fontSize: '20px',
        color: '#ff5555',
      })
      .setOrigin(0.5)
      .setInteractive();

    resetButton.on('pointerover', () =>
      resetButton.setStyle({ fill: '#ff8888' })
    );
    resetButton.on('pointerout', () =>
      resetButton.setStyle({ fill: '#ff5555' })
    );
    resetButton.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      // Use a simple browser confirm dialog
      if (
        window.confirm(
          'Are you sure you want to reset all data? This cannot be undone.'
        )
      ) {
        localStorage.clear();
        // Reload the game to apply default settings and clear state
        window.location.reload();
      }
    });

    // Back Button
    const backButton = this.add
      .text(centerX, 550, 'Back', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        color: '#00ffff',
      })
      .setOrigin(0.5)
      .setInteractive();

    backButton.on('pointerover', () =>
      backButton.setStyle({ fill: '#ffffff' })
    );
    backButton.on('pointerout', () => backButton.setStyle({ fill: '#00ffff' }));
    backButton.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      // Stop this scene and resume the menu scene. This is more robust than starting it fresh.
      this.scene.stop();
      if (this.scene.isPaused(CST.SCENES.MENU)) {
        this.scene.resume(CST.SCENES.MENU);
      } else {
        // Fallback in case we came from somewhere else
        this.scene.start(CST.SCENES.MENU);
      }
    });
  }

  createSlider(x, y, label, initialValue, callback) {
    const trackWidth = 250;
    const trackHeight = 10;
    const handleWidth = 20;
    const handleHeight = 30;

    this.add
      .text(x, y - 40, label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .graphics()
      .fillStyle(0x333333)
      .fillRoundedRect(
        x - trackWidth / 2,
        y - trackHeight / 2,
        trackWidth,
        trackHeight,
        5
      );
    const filledTrack = this.add
      .graphics()
      .fillStyle(0x00ffff, 0.8)
      .fillRoundedRect(
        x - trackWidth / 2,
        y - trackHeight / 2,
        trackWidth * initialValue,
        trackHeight,
        5
      );
    const handle = this.add
      .graphics()
      .fillStyle(0xffd700)
      .fillRoundedRect(
        -handleWidth / 2,
        -handleHeight / 2,
        handleWidth,
        handleHeight,
        6
      );

    const handleContainer = this.add.container(
      x - trackWidth / 2 + trackWidth * initialValue,
      y,
      [handle]
    );
    handleContainer.setName(`slider_handle_${label}`);
    handleContainer.setInteractive(
      new Phaser.Geom.Rectangle(
        -handleWidth / 2,
        -handleHeight / 2,
        handleWidth,
        handleHeight
      ),
      Phaser.Geom.Rectangle.Contains
    );
    this.input.setDraggable(handleContainer);

    const valueText = this.add
      .text(x + trackWidth / 2 + 45, y, `${Math.round(initialValue * 100)}%`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        color: '#00ffff',
      })
      .setOrigin(0.5);

    handleContainer.on('drag', (pointer, dragX) => {
      const newX = Phaser.Math.Clamp(
        dragX,
        x - trackWidth / 2,
        x + trackWidth / 2
      );
      handleContainer.x = newX;
      const value = (newX - (x - trackWidth / 2)) / trackWidth;

      valueText.setText(`${Math.round(value * 100)}%`);
      filledTrack
        .clear()
        .fillStyle(0x00ffff, 0.8)
        .fillRoundedRect(
          x - trackWidth / 2,
          y - trackHeight / 2,
          trackWidth * value,
          trackHeight,
          5
        );

      if (callback) {
        callback(value);
      }
    });

    handleContainer.on('dragend', () => {
      if (SoundManager.sfxVolume > 0) {
        SoundManager.play(this, 'click');
      }
    });
  }
}
