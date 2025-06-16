// src/scenes/LoginScene.js
import { loginUser } from '../api.js'; // Apenas loginUser é necessário aqui
import SoundManager from '../utils/sound.js';

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  preload() {
    SoundManager.loadAll(this);
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
    // Carregar a mesma imagem de fundo usada nas outras cenas de autenticação
    this.load.image('auth_bg', 'src/assets/menu_bg_vertical.png');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Aplicar background
    this.add.image(centerX, centerY, 'auth_bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

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

    this.add.text(centerX, centerY - 200, 'FAZER LOGIN', { // Título alterado
      fontFamily: fontFamily,
      fontSize: '24px',
      fill: '#00ffff', // Cor ciano para login
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(centerX - 150, centerY - 110, 'Username:', { fontFamily: fontFamily, fontSize: '12px', fill: '#ffffff' });
    const usernameInput = this.add.dom(centerX, centerY - 80).createElement('input', {
      type: 'text',
      name: 'username',
      autocomplete: 'username',
      style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ffff; background-color: #333; color: #fff; font-family: monospace;'
    });
    usernameInput.setOrigin(0.5);
    usernameInput.addListener('click');

    this.add.text(centerX - 150, centerY - 30, 'PIN (4 digits):', { fontFamily: fontFamily, fontSize: '12px', fill: '#ffffff' });
    const pinInput = this.add.dom(centerX, centerY).createElement('input', {
      type: 'password',
      name: 'pin',
      maxLength: 4,
      autocomplete: 'current-password',
      style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ffff; background-color: #333; color: #fff; font-family: monospace;'
    });
    pinInput.setOrigin(0.5);
    pinInput.addListener('click');

    const messageText = this.add.text(centerX, centerY + 50, '', {
      fontFamily: fontFamily,
      fontSize: '10px',
      fill: '#ff0000',
      align: 'center',
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    // Botão CREATE ACCOUNT removido
    // const createButton = ... (REMOVIDO)

    // Botão LOGIN ajustado na posição Y
    const loginButton = this.add.text(centerX, centerY + 120, 'LOGIN', { // Posição Y ajustada
      fontFamily: fontFamily,
      fontSize: '14px',
      fill: '#00ffff',
      backgroundColor: '#00000099',
      padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    loginButton.on('pointerdown', async () => {
      SoundManager.play(this, 'click');
      const username = usernameInput.node.value.trim();
      const pin = pinInput.node.value.trim();
      if (!username || !pin) {
        messageText.setText('Username e PIN são obrigatórios.');
        return;
      }
      // Validações de formato podem ser adicionadas aqui também se desejado,
      // embora o servidor já as faça. Ex: PIN deve ser 4 dígitos.
      if (!/^\d{4}$/.test(pin)) {
        messageText.setText('PIN deve ter 4 dígitos.');
        return;
      }
      await this.attemptLogin(username, pin, messageText);
    });
    loginButton.on('pointerover', () => loginButton.setStyle({ fill: '#ffffff' }));
    loginButton.on('pointerout', () => loginButton.setStyle({ fill: '#00ffff' }));

    // Botão VOLTAR adicionado
    const backButton = this.add.text(centerX, centerY + 180, '[ VOLTAR ]', { // Posição Y ajustada
      fontFamily: fontFamily,
      fontSize: '12px',
      fill: '#00ff00', // Cor diferente para voltar
      backgroundColor: '#00000077',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('AuthChoiceScene'); // Volta para a tela de escolha
    });
    backButton.on('pointerover', () => backButton.setStyle({ fill: '#ffffff' }));
    backButton.on('pointerout', () => backButton.setStyle({ fill: '#00ff00' }));

    // Dica para a tela de login
    this.add.text(centerX, centerY + 230, 'Entre com seu username e PIN de 4 dígitos.', {
      fontFamily: fontFamily,
      fontSize: '10px',
      fill: '#dddddd',
      align: 'center',
      wordWrap: { width: centerX * 1.8 }
    }).setOrigin(0.5);

    // Foco inicial no campo de username
    // usernameInput.node.focus(); // Pode ser reativado se desejado e testado
    console.log("LoginScene UI (apenas login) criada.");
  }

  async attemptLogin(username, pin, messageText) {
    messageText.setText(`Logando como ${username}...`);
    messageText.setStyle({ fill: '#ffff00' }); // Amarelo para processando

    const result = await loginUser(username, pin);

    if (result.success && result.token && result.user) {
      localStorage.setItem('loggedInUser', result.user.username);
      localStorage.setItem('jwtToken', result.token);
      this.registry.set('loggedInUser', result.user);
      this.registry.set('jwtToken', result.token);

      messageText.setText(`Bem-vindo, ${result.user.username}!`);
      messageText.setStyle({ fill: '#00ff00' }); // Verde para sucesso
      SoundManager.play(this, 'submit');

      this.time.delayedCall(1000, () => {
        this.scene.start('MenuScene');
      });
    } else {
      messageText.setText(result.message || 'Login falhou: Usuário ou PIN inválido.');
      messageText.setStyle({ fill: '#ff0000' }); // Vermelho para erro
      SoundManager.play(this, 'error');
    }
  }

  // update() não é necessário para esta cena
}
