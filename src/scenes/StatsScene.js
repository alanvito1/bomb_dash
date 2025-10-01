import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

function getUpgradesFromLocalStorage() {
  const stats = localStorage.getItem('playerStats');
  return stats ? JSON.parse(stats) : null;
}

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
    this.add.text(centerX, 50, LanguageManager.get(this, 'stats_title'), {
      fontSize: '28px',
      fill: '#00ffff',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5);
  }

  displayStats(centerX) {
    const upgrades = getUpgradesFromLocalStorage() || {
      damage: 1,
      speed: 200,
      extraLives: 1,
      fireRate: 600,
      bombSize: 1,
      multiShot: 0,
      coins: 0
    };

    const statsToShow = [
      [LanguageManager.get(this, 'stats_damage'), upgrades.damage],
      [LanguageManager.get(this, 'stats_speed'), upgrades.speed],
      [LanguageManager.get(this, 'stats_extra_lives'), upgrades.extraLives],
      [LanguageManager.get(this, 'stats_fire_rate'), upgrades.fireRate],
      [LanguageManager.get(this, 'stats_bomb_size'), upgrades.bombSize],
      [LanguageManager.get(this, 'stats_multi_shot'), upgrades.multiShot],
      [LanguageManager.get(this, 'stats_coins'), upgrades.coins]
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
    const backBtn = this.add.text(centerX, y, LanguageManager.get(this, 'shop_back_to_menu'), {
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
