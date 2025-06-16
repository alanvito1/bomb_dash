// src/scenes/LoadingScene.js
import SoundManager from '../utils/sound.js';
// import { initDB, getUser } from '../database/database.js'; // REMOVIDO
import { validateCurrentSession } from '../api.js'; // ADICIONADO

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
  }

  preload() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

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

    SoundManager.loadAll(this);
    this.load.image('bg', 'src/assets/menu_bg_vertical.png');
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  async create() {
    // await initDB(); // REMOVIDO

    this.time.delayedCall(500, async () => {
        const jwtToken = localStorage.getItem('jwtToken');

        if (jwtToken) {
            console.log('LoadingScene: Found JWT token. Validating session...');
            const validationResult = await validateCurrentSession(jwtToken);

            if (validationResult.success && validationResult.user) {
                console.log(`LoadingScene: Session validated for user: ${validationResult.user.username}. Max score: ${validationResult.user.max_score}.`);

                // Atualizar localStorage e Phaser Registry com os dados frescos do servidor
                localStorage.setItem('loggedInUser', validationResult.user.username); // Armazena apenas o username
                // O jwtToken já está no localStorage, não precisa setar de novo a menos que seja um novo token (não é o caso aqui)

                this.registry.set('loggedInUser', validationResult.user); // Armazena o objeto user completo
                this.registry.set('jwtToken', jwtToken); // Garante que o registry também tenha o token

                this.scene.start('StartScene'); // Ou MenuScene, conforme preferência
            } else {
                // Token inválido ou sessão expirada/não encontrada no servidor
                console.log(`LoadingScene: Session validation failed. ${validationResult.message || 'Redirecting to LoginScene.'}`);
                localStorage.removeItem('loggedInUser');
                localStorage.removeItem('jwtToken');
                this.registry.remove('loggedInUser');
                this.registry.remove('jwtToken');
                this.scene.start('LoginScene');
            }
        } else {
            // No JWT token found in localStorage
            console.log('LoadingScene: No JWT token found. Proceeding to LoginScene.');
            localStorage.removeItem('loggedInUser'); // Limpar por segurança, caso jwtToken tenha sido removido manualmente
            this.registry.remove('loggedInUser');
            this.registry.remove('jwtToken');
            this.scene.start('LoginScene');
        }
    });
  }
}
