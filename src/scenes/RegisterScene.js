// src/scenes/RegisterScene.js (Simplificada para Diagnóstico)
// import { registerUser, loginUser } from '../api.js';
// import SoundManager from '../utils/sound.js';

export default class RegisterScene extends Phaser.Scene {
  constructor() {
    super('RegisterScene');
  }

  preload() {
    this.load.image('auth_bg', 'src/assets/menu_bg_vertical.png');
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.image(centerX, centerY, 'auth_bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    // Tentar carregar a fonte e criar UI, com fallback
    // A lógica do WebFontLoader é mantida pois o erro ocorre dentro do callback 'active'
    if (window.WebFont) {
      WebFont.load({
        google: { families: ['Press Start 2P'] },
        active: () => {
          console.log('[RegisterScene-Simple] WebFont active. Tentando criar UI simplificada...');
          this.createUISimplified(centerX, centerY, false);
        },
        inactive: () => {
          console.warn('[RegisterScene-Simple] WebFont inactive. Tentando criar UI simplificada com fallback...');
          this.createUISimplified(centerX, centerY, true);
        }
      });
    } else {
      console.error('[RegisterScene-Simple] WebFontLoader script não encontrado. Tentando criar UI simplificada com fallback...');
      this.createUISimplified(centerX, centerY, true);
    }
  }

  createUISimplified(centerX, centerY, useFallbackFont = false) {
    // const fontFamily = useFallbackFont ? 'monospace' : '"Press Start 2P"'; // Não usado por enquanto

    console.log('[RegisterScene-Simple] Dentro de createUISimplified. Tentando this.add.dom() para usernameInput...');
    try {
      const usernameInput = this.add.dom(centerX, centerY - 80).createElement('input', {
        type: 'text',
        name: 'username',
        autocomplete: 'username', // Adicionado para consistência
        style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ff00; background-color: #333; color: #fff; font-family: monospace;'
      });
      usernameInput.setOrigin(0.5);
      // usernameInput.addListener('click'); // Removido para simplificar
      console.log('[RegisterScene-Simple] usernameInput DOM element criado (ou tentativa).');

      // Adicionar um texto simples do Phaser para ver se a cena funciona até aqui
      this.add.text(centerX, centerY + 100, 'Register Scene (Diagnóstico)', {
        fontFamily: useFallbackFont ? 'monospace' : '"Press Start 2P"',
        fontSize: '16px', fill: '#fff'
      }).setOrigin(0.5);

    } catch (e) {
      console.error('[RegisterScene-Simple] Erro ao tentar criar usernameInput com this.add.dom():', e);
      // Adicionar um texto de erro na tela se o DOM falhar, para feedback visual
      this.add.text(centerX, centerY, `Erro no DOM: ${e.message}`, {
        fontFamily: useFallbackFont ? 'monospace' : '"Press Start 2P"',
        fontSize: '12px', fill: '#ff0000', wordWrap: { width: this.scale.width - 20 }
      }).setOrigin(0.5);
    }

    // Botão VOLTAR SIMPLIFICADO (usando Phaser Text, não DOM)
    // para permitir sair da cena mesmo se o DOM falhar.
    const backButton = this.add.text(centerX, this.scale.height - 50, '[ VOLTAR PARA TESTE ]', {
      fontFamily: useFallbackFont ? 'monospace' : '"Press Start 2P"',
      fontSize: '12px',
      fill: '#00ffff',
      backgroundColor: '#00000077',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
      // SoundManager não importado, então não tocar som por enquanto
      this.scene.start('AuthChoiceScene');
    });

    console.log('[RegisterScene-Simple] createUISimplified concluída.');
  }
}
