// src/scenes/LoadingScene.js
import SoundManager from '../utils/sound.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Fundo
    this.add.text(centerX, centerY - 50, '💣 Bomb Dash', {
      fontFamily: 'monospace',
      fontSize: '28px',
      fill: '#FFD700'
    }).setOrigin(0.5);

    const loadingText = this.add.text(centerX, centerY + 10, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '20px',
      fill: '#00ffff'
    }).setOrigin(0.5);

    const bar = this.add.rectangle(centerX - 100, centerY + 50, 0, 20, 0x00ffff).setOrigin(0, 0.5);

    this.load.on('progress', (value) => {
      bar.width = 200 * value;
    });

    this.load.on('complete', () => {
      loadingText.setText('Complete!');
    });

    // Carrega todos os assets
    SoundManager.loadAll(this);
    this.load.image('bg', 'src/assets/menu_bg_vertical.png');
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create() {
    // Espera 500ms para não cortar visualmente
    this.time.delayedCall(500, () => {
      this.scene.start('StartScene'); // vai pra tela inicial
    });
  }
}
