import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import PostFXManager from '../modules/PostFXManager.js';
import { createRetroButton } from '../utils/ui.js';

export default class SettingsModal extends UIModal {
  constructor(scene) {
    super(scene, 360, 500, 'SETTINGS');
    this.populate();
  }

  populate() {
    // Relative Y positions
    const startY = -this.modalHeight / 2 + 100;

    // Sliders
    this.createSlider(0, startY, 'Master Volume', SoundManager.masterVolume, (val) =>
      SoundManager.setMasterVolume(this.scene, val)
    );
    this.createSlider(0, startY + 80, 'Music', SoundManager.musicVolume, (val) =>
      SoundManager.setMusicVolume(val)
    );
    this.createSlider(0, startY + 160, 'Sound Effects', SoundManager.sfxVolume, (val) =>
      SoundManager.setSfxVolume(val)
    );

    // Retro Filter Toggle
    this.refreshRetroButton(0, startY + 240);

    // Reset Data Button (Red)
    const resetBtn = this.createResetButton(0, this.modalHeight / 2 - 60);
    this.windowContainer.add(resetBtn);
  }

  refreshRetroButton(x, y) {
    if (this.retroBtn) {
      this.retroBtn.destroy();
    }
    const enabled = PostFXManager.getEnabled();
    const text = enabled ? 'RETRO FILTER: ON' : 'RETRO FILTER: OFF';
    const type = enabled ? 'neutral' : 'metal';

    this.retroBtn = createRetroButton(this.scene, x, y, 220, 40, text, type, () => {
      PostFXManager.toggle(this.scene);
      this.refreshRetroButton(x, y);
    });
    this.windowContainer.add(this.retroBtn);
  }

  createSlider(x, y, label, initialValue, callback) {
    const trackWidth = 220;
    const trackHeight = 10;
    const handleWidth = 20;
    const handleHeight = 30;

    // Label
    const labelText = this.scene.add
      .text(x, y - 25, label, {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Track Background
    const track = this.scene.add.graphics();
    track.fillStyle(0x333333);
    track.fillRoundedRect(
      x - trackWidth / 2,
      y - trackHeight / 2,
      trackWidth,
      trackHeight,
      5
    );

    // Filled Track
    const filledTrack = this.scene.add.graphics();
    const updateFilledTrack = (val) => {
      filledTrack.clear();
      filledTrack.fillStyle(0x00ffff, 0.8);
      filledTrack.fillRoundedRect(
        x - trackWidth / 2,
        y - trackHeight / 2,
        trackWidth * val,
        trackHeight,
        5
      );
    };
    updateFilledTrack(initialValue);

    // Handle
    const handle = this.scene.add.graphics();
    handle.fillStyle(0xffd700);
    handle.fillRoundedRect(
      -handleWidth / 2,
      -handleHeight / 2,
      handleWidth,
      handleHeight,
      6
    );

    // Handle Container (for drag)
    const handleContainer = this.scene.add.container(
      x - trackWidth / 2 + trackWidth * initialValue,
      y,
      [handle]
    );
    handleContainer.setSize(handleWidth, handleHeight);
    handleContainer.setInteractive({ draggable: true, useHandCursor: true });

    // Value Text
    const valueText = this.scene.add
      .text(x + trackWidth / 2 + 40, y, `${Math.round(initialValue * 100)}%`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#00ffff',
      })
      .setOrigin(0.5);

    // Drag Logic
    this.scene.input.setDraggable(handleContainer);

    handleContainer.on('drag', (pointer) => {
      // Calculate local X relative to window center
      const localX = pointer.x - this.windowContainer.x;
      const clampedX = Phaser.Math.Clamp(
        localX,
        x - trackWidth / 2,
        x + trackWidth / 2
      );

      handleContainer.x = clampedX;

      const value = (clampedX - (x - trackWidth / 2)) / trackWidth;
      const safeValue = Phaser.Math.Clamp(value, 0, 1);

      updateFilledTrack(safeValue);
      valueText.setText(`${Math.round(safeValue * 100)}%`);

      if (callback) callback(safeValue);
    });

    handleContainer.on('dragend', () => {
      SoundManager.playClick(this.scene);
    });

    this.windowContainer.add([
      labelText,
      track,
      filledTrack,
      valueText,
      handleContainer,
    ]);
  }

  createResetButton(x, y) {
    const container = this.scene.add.container(x, y);
    const w = 220;
    const h = 40;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x880000, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, 0xff0000);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    const text = this.scene.add
      .text(0, 0, 'RESET DATA', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#ffffff',
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      container.setScale(0.95);
    });

    container.on('pointerup', () => {
      container.setScale(1);
      SoundManager.playClick(this.scene);
      if (
        window.confirm(
          'Are you sure you want to reset all data? This cannot be undone.'
        )
      ) {
        localStorage.clear();
        window.location.reload();
      }
    });

    container.on('pointerover', () => {
       bg.clear();
       bg.fillStyle(0xaa0000, 1);
       bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
       bg.lineStyle(2, 0xff0000);
       bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
       text.setScale(1.05);
    });

    container.on('pointerout', () => {
       bg.clear();
       bg.fillStyle(0x880000, 1);
       bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
       bg.lineStyle(2, 0xff0000);
       bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
       text.setScale(1);
    });

    return container;
  }
}
