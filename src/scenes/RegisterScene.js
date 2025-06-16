// src/scenes/RegisterScene.js (Controlador para Formulário HTML)
import { registerUser, loginUser } from '../api.js';
import SoundManager from '../utils/sound.js';

export default class RegisterScene extends Phaser.Scene {
  constructor() {
    super('RegisterScene');
    // Referências aos elementos do formulário e handlers de evento
    this.formContainer = null;
    this.usernameInput = null;
    this.pinInput = null;
    this.messageText = null;
    this.registerButton = null;
    this.backButton = null;

    // Handlers precisam ser vinculados ou definidos como arrow functions para manter o 'this' da cena
    this.handleRegisterSubmit = this.handleRegisterSubmit.bind(this);
    this.handleBack = this.handleBack.bind(this);
  }

  preload() {
    // Carregar assets visuais da cena (ex: background), sons.
    // O formulário em si já está no HTML.
    this.load.image('auth_bg', 'src/assets/menu_bg_vertical.png');
    SoundManager.loadAll(this); // Garante que sons como 'click' estejam disponíveis
    // WebFontLoader não é mais estritamente necessário aqui se não usarmos this.add.text para a UI principal
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Background da cena Phaser (pode ser sobreposto pelo form HTML)
    this.add.image(centerX, centerY, 'auth_bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    // Obter referências aos elementos do DOM
    this.formContainer = document.getElementById('register-form-container');
    this.usernameInput = document.getElementById('register-username');
    this.pinInput = document.getElementById('register-pin');
    this.messageText = document.getElementById('register-message');
    this.registerButton = document.getElementById('register-submit-button');
    this.backButton = document.getElementById('register-back-button');

    if (!this.formContainer || !this.usernameInput || !this.pinInput || !this.messageText || !this.registerButton || !this.backButton) {
      console.error('RegisterScene: Não foi possível encontrar um ou mais elementos do formulário HTML!');
      // Adicionar um texto de erro na tela Phaser se os elementos não forem encontrados
      this.add.text(centerX, centerY, 'Erro: Formulário de Registro não encontrado no HTML.', {
        fontFamily: 'monospace', fontSize: '12px', fill: '#ff0000', wordWrap: { width: this.scale.width - 20 }
      }).setOrigin(0.5);
      return;
    }

    // Limpar campos e mensagem de tentativas anteriores
    this.usernameInput.value = '';
    this.pinInput.value = '';
    this.messageText.textContent = '';
    this.messageText.className = 'form-message'; // Reset class

    // Adicionar listeners de evento
    this.registerButton.addEventListener('click', this.handleRegisterSubmit);
    this.backButton.addEventListener('click', this.handleBack);

    // Tornar o formulário visível
    this.formContainer.style.display = 'flex'; // Usar 'flex' como definido no CSS para centralizar

    console.log('RegisterScene criada e formulário HTML de registro está visível.');
  }

  async handleRegisterSubmit() {
    SoundManager.play(this, 'click'); // Tocar som de clique da cena Phaser
    const username = this.usernameInput.value.trim();
    const pin = this.pinInput.value.trim();

    // Validações
    if (!username || !pin) {
      this.setMessage('Username e PIN são obrigatórios.', 'error');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username) || username.length < 3) {
      this.setMessage('Username: min 3 chars, sem espaços, letras, números, underscores.', 'error');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      this.setMessage('PIN deve ter exatamente 4 dígitos numéricos.', 'error');
      return;
    }

    this.setMessage('Registrando...', 'processing');
    const registerResult = await registerUser(username, pin);

    if (registerResult.success) {
      this.setMessage(`Conta ${username} criada! Logando...`, 'success');

      const loginResult = await loginUser(username, pin);
      if (loginResult.success && loginResult.token && loginResult.user) {
        localStorage.setItem('loggedInUser', loginResult.user.username);
        localStorage.setItem('jwtToken', loginResult.token);
        this.registry.set('loggedInUser', loginResult.user);
        this.registry.set('jwtToken', loginResult.token);

        SoundManager.play(this, 'submit');
        // Esconder formulário ANTES de mudar de cena para evitar flash
        this.formContainer.style.display = 'none';
        this.scene.start('MenuScene');
      } else {
        this.setMessage(`Conta criada, mas login automático falhou. Tente logar manualmente. ${loginResult.message || ''}`, 'error');
        // Não esconder o formulário aqui, permitir que o usuário veja a mensagem
        // Poderia adicionar um timeout para redirecionar para LoginScene ou deixar o usuário clicar em Voltar
      }
    } else {
      this.setMessage(registerResult.message || 'Falha ao criar conta.', 'error');
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
      } else {
        // error é o padrão (vermelho)
      }
    }
  }

  shutdown() {
    // Chamado quando a cena é parada ou destruída
    console.log('RegisterScene shutdown. Escondendo formulário e removendo listeners.');
    if (this.formContainer) {
      this.formContainer.style.display = 'none';
    }
    // Remover listeners para evitar memory leaks
    if (this.registerButton) {
      this.registerButton.removeEventListener('click', this.handleRegisterSubmit);
    }
    if (this.backButton) {
      this.backButton.removeEventListener('click', this.handleBack);
    }
  }
}
