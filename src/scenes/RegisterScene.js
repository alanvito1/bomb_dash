// src/scenes/RegisterScene.js
import { registerUser, loginUser } from '../api.js'; // Importa loginUser também para auto-login
import SoundManager from '../utils/sound.js';
// Usar a mesma imagem de fundo da AuthChoiceScene para consistência
// import { backgroundImages } from '../config/background.js';

export default class RegisterScene extends Phaser.Scene {
  constructor() {
    super('RegisterScene');
  }

  preload() {
    // Usar a mesma chave de asset de background que AuthChoiceScene usou
    this.load.image('auth_bg', 'src/assets/menu_bg_vertical.png');
    SoundManager.loadAll(this);
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

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

    this.add.text(centerX, centerY - 200, 'CRIAR CONTA', {
      fontFamily: fontFamily,
      fontSize: '24px',
      fill: '#00ff00', // Verde para criar conta
      align: 'center'
    }).setOrigin(0.5);

    // Username Input
    this.add.text(centerX - 150, centerY - 110, 'Novo Username:', { fontFamily: fontFamily, fontSize: '12px', fill: '#ffffff' });
    const usernameInput = this.add.dom(centerX, centerY - 80).createElement('input', {
      type: 'text',
      name: 'username',
      autocomplete: 'username',
      style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ff00; background-color: #333; color: #fff; font-family: monospace;'
    });
    usernameInput.setOrigin(0.5);
    usernameInput.addListener('click');

    // PIN Input
    this.add.text(centerX - 150, centerY - 30, 'Novo PIN (4 dígitos):', { fontFamily: fontFamily, fontSize: '12px', fill: '#ffffff' });
    const pinInput = this.add.dom(centerX, centerY).createElement('input', {
      type: 'password', // Usar password para esconder o PIN
      name: 'pin',
      maxLength: 4,
      autocomplete: 'new-password',
      style: 'width: 300px; padding: 10px; font-size: 16px; border: 2px solid #00ff00; background-color: #333; color: #fff; font-family: monospace;'
    });
    pinInput.setOrigin(0.5);
    pinInput.addListener('click');

    // Mensagem de Status/Erro
    const messageText = this.add.text(centerX, centerY + 50, '', {
      fontFamily: fontFamily,
      fontSize: '10px',
      fill: '#ff0000', // Vermelho para erros, pode mudar para verde para sucesso
      align: 'center',
      wordWrap: { width: 300 }
    }).setOrigin(0.5);

    // Botão REGISTRAR
    const registerButton = this.add.text(centerX, centerY + 120, 'REGISTRAR E ENTRAR', {
      fontFamily: fontFamily,
      fontSize: '14px',
      fill: '#00ff00',
      backgroundColor: '#00000099',
      padding: { x: 15, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    registerButton.on('pointerdown', async () => {
      SoundManager.play(this, 'click');
      const username = usernameInput.node.value.trim();
      const pin = pinInput.node.value.trim();

      // Validações
      if (!username || !pin) {
        messageText.setText('Username e PIN são obrigatórios.');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username) || username.length < 3) {
        messageText.setText('Username: min 3 chars, sem espaços, letras, números, underscores.');
        return;
      }
      if (!/^\d{4}$/.test(pin)) {
        messageText.setText('PIN deve ter exatamente 4 dígitos numéricos.');
        return;
      }

      messageText.setText('Registrando...');
      messageText.setStyle({ fill: '#ffff00' }); // Amarelo para processando

      const registerResult = await registerUser(username, pin);

      if (registerResult.success) {
        messageText.setText(`Conta ${username} criada! Logando...`);
        messageText.setStyle({ fill: '#00ff00' }); // Verde para sucesso

        // Tentar fazer login automaticamente após o registro
        const loginResult = await loginUser(username, pin);
        if (loginResult.success && loginResult.token && loginResult.user) {
          localStorage.setItem('loggedInUser', loginResult.user.username);
          localStorage.setItem('jwtToken', loginResult.token);
          this.registry.set('loggedInUser', loginResult.user);
          this.registry.set('jwtToken', loginResult.token);

          SoundManager.play(this, 'submit');
          this.time.delayedCall(1000, () => {
            this.scene.start('MenuScene');
          });
        } else {
          // Se o auto-login falhar (improvável, mas para ser completo)
          messageText.setText(`Conta criada, mas login automático falhou. Tente logar manualmente. ${loginResult.message || ''}`);
          messageText.setStyle({ fill: '#ff0000' });
          this.time.delayedCall(2000, () => {
            this.scene.start('LoginScene'); // Envia para LoginScene para tentativa manual
          });
        }
      } else {
        messageText.setText(registerResult.message || 'Falha ao criar conta.');
        messageText.setStyle({ fill: '#ff0000' });
      }
    });
    registerButton.on('pointerover', () => registerButton.setStyle({ fill: '#ffffff' }));
    registerButton.on('pointerout', () => registerButton.setStyle({ fill: '#00ff00' }));

    // Botão VOLTAR
    const backButton = this.add.text(centerX, centerY + 180, '[ VOLTAR ]', {
      fontFamily: fontFamily,
      fontSize: '12px',
      fill: '#00ffff',
      backgroundColor: '#00000077',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('AuthChoiceScene');
    });
    backButton.on('pointerover', () => backButton.setStyle({ fill: '#ffffff' }));
    backButton.on('pointerout', () => backButton.setStyle({ fill: '#00ffff' }));

    // Dica
    this.add.text(centerX, centerY + 230, 'Escolha um nome de usuário e um PIN de 4 dígitos.', {
      fontFamily: fontFamily,
      fontSize: '10px',
      fill: '#dddddd',
      align: 'center',
      wordWrap: { width: centerX * 1.8 }
    }).setOrigin(0.5);
  }

  // attemptLogin não é mais necessário aqui se o fluxo de login é feito no callback do registro
}
