// src/scenes/GameOverScene.js
import { getUpgrades, saveUpgrades } from '../systems/upgrades.js';
import SoundManager from '../utils/sound.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene', active: false });
  }

  preload() {
    SoundManager.loadAll(this);
    this.load.image('gameover_bg', 'src/assets/gameover_bg.png'); // 🎮 Fundo retro
  }

  create(data) {
    const { score = 0, coinsEarned = 0 } = data;
    const upgrades = getUpgrades();
    upgrades.coins += coinsEarned;
    saveUpgrades(upgrades);

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // 🎵 Efeito sonoro
    SoundManager.stopAll(this);
    SoundManager.play(this, 'gameover');

    // 🖼️ Fundo visual
    this.add.image(centerX, centerY, 'gameover_bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setDepth(0);

    // ☠️ Texto de fim de jogo
    this.add.text(centerX, 100, '☠ GAME OVER ☠', {
      fontSize: '32px',
      fill: '#ff0000',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(1);

    this.add.text(centerX, 160, `🏆 Score: ${score}`, {
      fontSize: '22px',
      fill: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(1);

    this.add.text(centerX, 200, `💰 Coins: ${coinsEarned}`, {
      fontSize: '20px',
      fill: '#ffff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(1);

    // ⏳ Texto de contagem regressiva
    const countdownText = this.add.text(centerX, 280, '', {
      fontSize: '18px',
      fill: '#ffcc00',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(1);

    // 🎬 Contador: 3, 2, 1
    let count = 3;
    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        if (count > 0) {
          countdownText.setText(`Returning to menu in ${count}...`);
          count--;
        } else {
          countdownText.setText('🎬 Returning to Menu!');
        }
      }
    });

    // 🚪 Volta para o menu
    this.time.delayedCall(4000, () => {
      this.scene.start('MenuScene');
    });
  }
}
