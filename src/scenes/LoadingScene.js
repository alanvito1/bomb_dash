// src/scenes/LoadingScene.js
import SoundManager from '../utils/sound.js';
import { validateCurrentSession } from '../api.js'; // Importa a função de validação da API

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Estilo do texto de carregamento
    const textStyle = {
      fontFamily: 'monospace', // Fonte fallback caso Press Start 2P não carregue a tempo
      fontSize: '20px',
      fill: '#00ffff'
    };
    const titleStyle = { ...textStyle, fontSize: '28px', fill: '#FFD700'};


    this.add.text(centerX, centerY - 50, '💣 Bomb Dash', titleStyle).setOrigin(0.5);

    const loadingText = this.add.text(centerX, centerY + 10, 'Loading...', textStyle).setOrigin(0.5);

    // Barra de progresso
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(centerX - 160, centerY + 40, 320, 30); // Posição e tamanho da caixa da barra

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ffff, 1);
      progressBar.fillRect(centerX - 155, centerY + 45, 310 * value, 20); // Posição e tamanho da barra de progresso
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.setText('Complete!');
    });

    // Carregar assets essenciais
    SoundManager.loadAll(this); // Garante que todos os sons definidos em SoundManager sejam carregados
    this.load.image('auth_bg', 'src/assets/menu_bg_vertical.png'); // Background para cenas de autenticação
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'); // WebFontLoader
  }

  async create() {
    // Adiciona um pequeno atraso para garantir que 'Complete!' seja visível antes da transição
    this.time.delayedCall(500, async () => {
        const jwtToken = localStorage.getItem('jwtToken');

        if (jwtToken) {
            console.log('LoadingScene: Found JWT token. Validating session...');
            const validationResult = await validateCurrentSession(jwtToken);

            if (validationResult.success && validationResult.user) {
                console.log(`LoadingScene: Session validated for user: ${validationResult.user.username}. Max score: ${validationResult.user.max_score}.`);

                localStorage.setItem('loggedInUser', validationResult.user.username);
                this.registry.set('loggedInUser', validationResult.user);
                this.registry.set('jwtToken', jwtToken);

                this.scene.start('StartScene'); // Ou MenuScene, conforme preferência
            } else {
                console.log(`LoadingScene: Session validation failed. ${validationResult.message || 'Redirecting to AuthChoiceScene.'}`);
                localStorage.removeItem('loggedInUser');
                localStorage.removeItem('jwtToken');
                this.registry.remove('loggedInUser');
                this.registry.remove('jwtToken');
                this.scene.start('AuthChoiceScene'); // CORRIGIDO: Redireciona para AuthChoiceScene
            }
        } else {
            // No JWT token found in localStorage
            console.log('LoadingScene: No JWT token found. Proceeding to AuthChoiceScene.'); // CORRIGIDO
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('jwtToken'); // Garantir que ambos sejam limpos
            this.registry.remove('loggedInUser');
            this.registry.remove('jwtToken');
            this.scene.start('AuthChoiceScene'); // CORRIGIDO: Redireciona para AuthChoiceScene
        }
    });
  }
}
