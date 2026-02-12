// src/scenes/StartScene.js
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class StartScene extends Phaser.Scene {
  constructor() {
    super('StartScene');
    this.started = false; // ✅ Previne múltiplos disparos
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    // 🎨 Fundo visual do menu (bg vertical)
    this.add
      .image(centerX, centerY, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    // 🕹️ Texto de introdução
    const pressText = this.add
      .text(centerX, centerY, LanguageManager.get('press_any_key'), {
        fontSize: '20px',
        fill: '#00ffff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // ✨ Animação suave piscante
    this.tweens.add({
      targets: pressText,
      alpha: { from: 1, to: 0.2 },
      duration: 700,
      yoyo: true,
      repeat: -1,
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
