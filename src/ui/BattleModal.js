import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import { CST } from '../CST.js';

export default class BattleModal extends UIModal {
  constructor(scene) {
    super(scene, 400, 300, 'BATTLE MODE');
    this.createButtons();
  }

  createButtons() {
    // SOLO RUN Button
    this.createModeButton(0, -80, 'SOLO RUN', 0x00ff00, (event) => {
      console.log('Starting World Map');
      // [PRAGMATIC INPUT FIX] Stop event propagation using native DOM event
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
      this.scene.scene.start('WorldMapScene');
    });

    // PVP MATCH Button (LOCKED)
    this.createModeButton(0, 10, 'PVP MATCH\n(LOCKED)', 0x555555, (event) => {
      console.log('PvP Match is currently locked.');
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
      // No action
    });

    // BATTLE ROYALE Button (COMING SOON)
    this.createModeButton(0, 100, 'BATTLE ROYALE\n(Q3 2026)', 0x555555, (event) => {
      console.log('Battle Royale coming soon in Q3 2026.');
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
      // No action
    });
  }

  createModeButton(x, y, text, color, callback) {
    const container = this.scene.add.container(x, y);

    const width = 240;
    const height = 60;

    const bg = this.scene.add.graphics();
    bg.lineStyle(4, color);
    bg.fillStyle(0x000000);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#ffffff',
      })
      .setOrigin(0.5);

    // Add Juice (Pulse effect on hover/click could be added here or via external util)

    container.add([bg, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.lineStyle(4, color);
      bg.fillStyle(color, 0.2); // Highlight
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.lineStyle(4, color);
      bg.fillStyle(0x000000);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    });

    container.on('pointerdown', (pointer, localX, localY, event) => {
      SoundManager.playClick(this.scene);
      callback(event);
    });

    this.windowContainer.add(container);
  }
}
