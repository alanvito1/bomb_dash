// src/scenes/LoginScene.js (Controlador para Formulário HTML)
import { loginUser } from '../api.js';
import SoundManager from '../utils/sound.js';

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
    // Referências aos elementos do formulário e handlers
    this.formContainer = null;
    this.usernameInput = null;
    this.pinInput = null;
    this.messageText = null;
    this.loginButton = null;
    this.backButton = null;

    this.handleLoginSubmit = this.handleLoginSubmit.bind(this);
    this.handleBack = this.handleBack.bind(this);
  }

  preload() {
    this.load.image('auth_bg', 'src/assets/menu_bg_vertical.png');
    SoundManager.loadAll(this);
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.image(centerX, centerY, 'auth_bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    this.formContainer = document.getElementById('login-form-container');
    this.usernameInput = document.getElementById('login-username');
    this.pinInput = document.getElementById('login-pin');
    this.messageText = document.getElementById('login-message');
    this.loginButton = document.getElementById('login-submit-button');
    this.backButton = document.getElementById('login-back-button');

    if (!this.formContainer || !this.usernameInput || !this.pinInput || !this.messageText || !this.loginButton || !this.backButton) {
      console.error('LoginScene: Não foi possível encontrar um ou mais elementos do formulário HTML!');
      this.add.text(centerX, centerY, 'Erro: Formulário de Login não encontrado no HTML.', {
        fontFamily: 'monospace', fontSize: '12px', fill: '#ff0000', wordWrap: { width: this.scale.width - 20 }
      }).setOrigin(0.5);
      return;
    }

    this.usernameInput.value = '';
    this.pinInput.value = '';
    this.messageText.textContent = '';
    this.messageText.className = 'form-message'; // Reset class

    this.loginButton.addEventListener('click', this.handleLoginSubmit);
    this.backButton.addEventListener('click', this.handleBack);

    this.formContainer.style.display = 'flex';
    console.log('LoginScene criada e formulário HTML de login está visível.');
  }

  async handleLoginSubmit() {
    SoundManager.play(this, 'click');
    const username = this.usernameInput.value.trim();
    const pin = this.pinInput.value.trim();

    if (!username || !pin) {
      this.setMessage('Username e PIN são obrigatórios.', 'error');
      return;
    }
    if (!/^\d{4}$/.test(pin)) { // Validação simples de formato do PIN
        this.setMessage('PIN deve ter 4 dígitos.', 'error');
        return;
    }

    this.setMessage('Logando...', 'processing');
    const result = await loginUser(username, pin);

    if (result.success && result.token && result.user) {
      localStorage.setItem('loggedInUser', result.user.username);
      localStorage.setItem('jwtToken', result.token);
      this.registry.set('loggedInUser', result.user);
      this.registry.set('jwtToken', result.token);

      // Limpar dados legados do localStorage
      localStorage.removeItem('playerUpgrades');
      localStorage.removeItem('bomb_dash_sqlite_db'); // Remove BD sql.js antigo
      console.log('[LoginScene] Dados legados (playerUpgrades, bomb_dash_sqlite_db) limpos do localStorage.');

      this.setMessage(`Bem-vindo, ${result.user.username}!`, 'success');
      SoundManager.play(this, 'submit');

      this.formContainer.style.display = 'none';
      this.scene.start('MenuScene');
    } else {
      this.setMessage(result.message || 'Login falhou: Usuário ou PIN inválido.', 'error');
      SoundManager.play(this, 'error');
    }
  }

  handleBack() {
    SoundManager.play(this, 'click');
    this.formContainer.style.display = 'none';
    this.scene.start('AuthChoiceScene');
  }

  setMessage(message, type = 'error') {
    if (this.messageText) {
      this.messageText.textContent = message;
      this.messageText.className = 'form-message'; // Reset
      if (type === 'success') {
        this.messageText.classList.add('success');
      } else if (type === 'processing') {
        this.messageText.classList.add('processing');
      }
      // error é o padrão (vermelho)
    }
  }

  shutdown() {
    console.log('LoginScene shutdown. Escondendo formulário e removendo listeners.');
    if (this.formContainer) {
      this.formContainer.style.display = 'none';
    }
    if (this.loginButton) {
      this.loginButton.removeEventListener('click', this.handleLoginSubmit);
    }
    if (this.backButton) {
      this.backButton.removeEventListener('click', this.handleBack);
    }
  }
}
