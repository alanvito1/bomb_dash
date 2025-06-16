// src/scenes/AuthChoiceScene.js
import SoundManager from '../utils/sound.js';
import { backgroundImages } from '../config/background.js'; // Para usar o mesmo background do menu

export default class AuthChoiceScene extends Phaser.Scene {
  constructor() {
    super('AuthChoiceScene');
  }

  preload() {
    // Carregar o background do menu (ou um específico se desejar)
    const bgKey = 'menu_bg_vertical.png'; // Usando o background padrão do menu como referência
    // Se backgroundImages[this.scene.key] for usado, precisaria de uma entrada para AuthChoiceScene em background.js
    // Por simplicidade, vamos usar diretamente o nome do arquivo de imagem do menu.
    this.load.image('auth_bg', `src/assets/${bgKey}`);
    SoundManager.loadAll(this); // Carregar sons se ainda não estiverem globalmente disponíveis
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Aplicar background
    this.add.image(centerX, centerY, 'auth_bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    // Tentar carregar a fonte e criar UI, com fallback
    if (window.WebFont) {
      WebFont.load({
        google: { families: ['Press Start 2P'] },
        active: () => this.createUI(centerX, centerY, false),
        inactive: () => this.createUI(centerX, centerY, true)
      });
    } else {
      this.createUI(centerX, centerY, true);
    }
  }

  createUI(centerX, centerY, useFallbackFont = false) {
    const fontFamily = useFallbackFont ? 'monospace' : '"Press Start 2P"';

    // Título da Cena
    this.add.text(centerX, centerY - 150, 'BOMB DASH', {
      fontFamily: fontFamily,
      fontSize: '32px',
      fill: '#FFD700',
      stroke: '#000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 100, 'Bem-vindo!', {
      fontFamily: fontFamily,
      fontSize: '18px',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);


    // Botão CRIAR CONTA
    const createAccountButton = this.add.text(centerX, centerY, 'CRIAR CONTA', {
      fontFamily: fontFamily,
      fontSize: '16px',
      fill: '#00ff00',
      backgroundColor: '#00000099',
      padding: { x: 20, y: 10 },
      align: 'center'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('RegisterScene'); // Navega para RegisterScene (a ser criada)
    })
    .on('pointerover', () => createAccountButton.setStyle({ fill: '#ffffff' }))
    .on('pointerout', () => createAccountButton.setStyle({ fill: '#00ff00' }));

    // Botão FAZER LOGIN
    const loginButton = this.add.text(centerX, centerY + 70, 'FAZER LOGIN', {
      fontFamily: fontFamily,
      fontSize: '16px',
      fill: '#00ffff',
      backgroundColor: '#00000099',
      padding: { x: 20, y: 10 },
      align: 'center'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('LoginScene'); // Navega para LoginScene
    })
    .on('pointerover', () => loginButton.setStyle({ fill: '#ffffff' }))
    .on('pointerout', () => loginButton.setStyle({ fill: '#00ffff' }));

    // Dica
     this.add.text(centerX, centerY + 150, 'Novo por aqui? Crie uma conta para salvar seu progresso!', {
      fontFamily: fontFamily,
      fontSize: '10px',
      fill: '#dddddd',
      align: 'center',
      wordWrap: { width: centerX * 1.8 }
    }).setOrigin(0.5);
  }
}
