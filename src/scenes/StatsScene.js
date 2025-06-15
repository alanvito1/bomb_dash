import { getUpgrades } from '../systems/upgrades.js';
import SoundManager from '../utils/sound.js';

export default class StatsScene extends Phaser.Scene {
  constructor() {
    super('StatsScene');
  }

  preload() {
    SoundManager.loadAll(this);
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.createTitle(centerX);
    this.displayStats(centerX);
    this.createBackButton(centerX, centerY + 220);
  }

  createTitle(centerX) {
    this.add.text(centerX, 50, '🔧 PLAYER STATS', {
      fontSize: '28px',
      fill: '#00ffff',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5);
  }

  displayStats(centerX) {
    const upgrades = getUpgrades();

    const statsToShow = [
      ['Damage', upgrades.damage],
      ['Speed', upgrades.speed],
      ['Extra Lives', upgrades.extraLives],
      ['Fire Rate (ms)', upgrades.fireRate],
      ['Bomb Size', upgrades.bombSize],
      ['Multi-Shot', upgrades.multiShot],
      ['Coins', upgrades.coins]
    ];

    statsToShow.forEach(([label, value], i) => {
      this.add.text(centerX, 120 + i * 35, `${label}: ${value}`, {
        fontSize: '20px',
        fill: '#ffffff',
        fontFamily: 'monospace',
        stroke: '#000',
        strokeThickness: 2
      }).setOrigin(0.5);
    });
  }

  createBackButton(centerX, y) {
    const backBtn = this.add.text(centerX, y, '[ BACK TO MENU ]', {
      fontSize: '20px',
      fill: '#00ffff',
      backgroundColor: '#111',
      padding: { x: 10, y: 5 },
      fontFamily: 'monospace'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('MenuScene');
    });
  }
}
