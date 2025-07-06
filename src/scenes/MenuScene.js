// src/scenes/MenuScene.js
import { backgroundImages } from '../config/background.js';
import SoundManager from '../utils/sound.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  preload() {
    // 🎨 Carrega o fundo visual específico dessa cena
    const bgImage = backgroundImages[this.scene.key] || 'menu_bg_vertical.png';
    this.load.image('bg', `src/assets/${bgImage}`);

    // 🔊 Carrega todos os sons via gerenciador
    SoundManager.loadAll(this);

    // 🅰️ Fonte retrô arcade
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.createBackground(centerX, centerY);

    if (window.WebFont) {
      WebFont.load({
        google: { families: ['Press Start 2P'] },
        active: () => this.createMenuContent(centerX, centerY)
      });
    } else {
      console.warn('[MenuScene] WebFont indisponível, usando fallback.');
      this.createMenuContent(centerX, centerY, true);
    }

    this.playMenuMusic(); // 🎵 Garante que a música do menu toque
  }

  createBackground(centerX, centerY) {
    this.add.image(centerX, centerY, 'bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);
  }

  createMenuContent(centerX, centerY, useFallback = false) {
    // 🎮 Título do jogo
    this.add.text(centerX, 100, '💣 BOMB DASH 💥', {
      fontFamily: useFallback ? 'monospace' : '"Press Start 2P"',
      fontSize: '20px',
      fill: '#FFD700',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    this.createMenu(centerX, centerY, useFallback);
  }

  createMenu(centerX, centerY, useFallback = false) {
    const menuItems = [
      { label: '▶ PLAY', scene: 'GameScene', action: null },
      { label: '🛒 SHOP', scene: 'ShopScene', action: null },
      { label: '📊 STATS', scene: 'StatsScene', action: null },
      { label: '🏆 RANKING', scene: 'RankingScene', action: null },
      { label: '⚙️ SETTINGS', scene: 'ConfigScene', action: null },
      { label: '↪️ LOGOUT', scene: 'LoginScene', action: 'logout' } // Added Logout
    ];

    const buttonStartY = centerY - 100; // Adjust starting Y to fit more items if needed
    const buttonSpacing = 50; // Adjust spacing

    menuItems.forEach((item, i) => {
      const button = this.add.text(centerX, buttonStartY + i * buttonSpacing, item.label, {
        fontFamily: useFallback ? 'monospace' : '"Press Start 2P"',
        fontSize: '14px', // Standardized font size
        fill: item.action === 'logout' ? '#FF6347' : '#00ffff', // Different color for logout
        backgroundColor: '#000000cc',
        padding: { x: 10, y: 8 },
        align: 'center'
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          SoundManager.play(this, 'click');
          if (item.action === 'logout') {
            // Clear user session data
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('jwtToken');
            this.registry.remove('loggedInUser');
            this.registry.remove('jwtToken');

            // Clear local game progress/stats
            localStorage.removeItem('playerStats');

            console.log('[MenuScene] User logged out. Cleared loggedInUser, jwtToken, and playerStats from localStorage and registry.');
            this.scene.start('AuthChoiceScene'); // Go to AuthChoiceScene instead of LoginScene for a cleaner flow
          } else {
            this.scene.start(item.scene);
          }
        })
        .on('pointerover', () => button.setStyle({ fill: '#ffffff' }))
        .on('pointerout', () => button.setStyle({ fill: item.action === 'logout' ? '#FF6347' : '#00ffff' }));
    });
  }

  playMenuMusic() {
    const musicEnabled = this.registry.get('musicEnabled') ?? true;

    // 🎵 Para qualquer música que possa estar tocando (ex: mundo anterior)
    SoundManager.stopAll(this);

    // ▶ Toca música do menu se ativada
    if (musicEnabled) {
      SoundManager.playMusic(this, 'menu_music');
    }
  }
}
