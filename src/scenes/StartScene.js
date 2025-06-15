// src/scenes/StartScene.js
import SoundManager from '../utils/sound.js';

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
    this.started = false; // ✅ Previne múltiplos disparos
  }

  preload() {
    // 🔊 Pré-carregar todos os sons e a imagem de fundo do menu
    SoundManager.loadAll(this);
    this.load.image('bg', 'src/assets/menu_bg_vertical.png');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // 🎨 Fundo visual do menu (bg vertical)
    this.add.image(centerX, centerY, 'bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    // 🕹️ Texto de introdução
    const pressText = this.add.text(centerX, centerY, 'PRESS ANY KEY TO START', {
      fontSize: '20px',
      fill: '#00ffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // ✨ Animação suave piscante
    this.tweens.add({
      targets: pressText,
      alpha: { from: 1, to: 0.2 },
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    // 🎮 Input para iniciar (tecla ou clique)
    this.input.keyboard.once('keydown', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  startGame() {
    if (this.started) return; // ✅ Garante execução única
    this.started = true;

    const musicEnabled = this.registry.get('musicEnabled') ?? true;

    if (musicEnabled) {
      SoundManager.playMusic(this, 'menu_music');
    }

    // 🕒 Delay breve para dar sensação de transição
    this.time.delayedCall(300, () => {
      this.scene.start('MenuScene');
    });
  }
}
