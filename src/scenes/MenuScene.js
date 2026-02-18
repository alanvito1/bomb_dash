// src/scenes/MenuScene.js
import SoundManager from '../utils/sound.js';
import { CST } from '../CST.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js'; // Import the centralized api client
import bcoinService from '../web3/bcoin-service.js';
import {
  createButton,
  createTitle,
  createPanel,
} from '../modules/UIGenerator.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: CST.SCENES.MENU });
    this.bcoinBalanceText = null;
    this.userAddressText = null;
    this.userData = null;
    this.grid = null;
  }

  init(data) {
    if (window.DEBUG_MODE) {
      console.log('[DEBUG] MenuScene: init() called.', data);
    }
    this.userData = data.userData;
  }

  preload() {
    if (window.DEBUG_MODE) {
      console.log('[DEBUG] MenuScene: preload() started...');
    }
  }

  create() {
    if (window.DEBUG_MODE) {
      console.log('[DEBUG] MenuScene: create() started...');
    }

    this.userData = this.registry.get('loggedInUser');

    // --- GUARD CLAUSE ---
    if (!this.userData) {
      console.error(
        'CRITICAL: MenuScene started without loggedInUser data. Returning to AuthChoiceScene.'
      );
      this.scene.start(CST.SCENES.AUTH_CHOICE);
      return;
    }

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- BACKGROUND ---
    // Procedural Grid Animation (Neon Grid)
    // Uses the 'floor_grid' texture generated in LoadingScene
    this.grid = this.add.tileSprite(centerX, centerY, 480, 800, 'floor_grid');

    // --- CONTENT ---
    this.createMenuContent(centerX, centerY);
    this.createDashboard(centerX);

    this.playMenuMusic();
    this.displayUserData();

    // Trigger an initial balance update safely
    try {
      bcoinService.updateBalance();
    } catch (e) {
      console.warn('Failed to update balance in Menu', e);
    }

    if (window.DEBUG_MODE) {
      console.log('[DEBUG] MenuScene: create() finished.');
    }
  }

  update() {
    // Animate Grid ("Hyperspace Travel" effect)
    if (this.grid) {
      this.grid.tilePositionY -= 0.5;
    }
  }

  createMenuContent(centerX, centerY) {
    // 🎮 Game Title (Centered at top)
    createTitle(this, centerX, 50, LanguageManager.get('game_title'));

    // Menu Buttons (Stacked at Bottom)
    // 480x800 layout: Buttons start lower to make room for widgets
    this.createMenu(centerX, 450);
  }

  displayUserData() {
    if (this.userData && this.userData.walletAddress) {
      const address = this.userData.walletAddress;
      const shortAddress = `${address.substring(0, 6)}...${address.substring(
        address.length - 4
      )}`;

      let label = `Player: ${shortAddress}`;
      if (this.userData.isGuest) label += ' (GUEST)';

      this.userAddressText = this.add
        .text(20, 20, label, {
          fontFamily: '"Press Start 2P"',
          fontSize: '12px',
          fill: '#FFFFFF',
        })
        .setOrigin(0, 0);
    }
  }

  createMenu(x, startY) {
    const menuItems = [
      {
        name: 'solo_button',
        label: LanguageManager.get('menu_solo'),
        scene: CST.SCENES.CHARACTER_SELECTION,
      },
      { name: 'pvp_button', label: 'PvP Modes', scene: CST.SCENES.PVP },
      {
        name: 'tournament_button',
        label: 'Tournaments',
        scene: CST.SCENES.TOURNAMENT_LOBBY,
      },
      {
        name: 'shop_button',
        label: LanguageManager.get('menu_shop'),
        scene: CST.SCENES.SHOP,
      },
      {
        name: 'profile_button',
        label: LanguageManager.get('profile_title'),
        scene: CST.SCENES.PROFILE,
      },
      { name: 'config_button', label: 'Settings', scene: CST.SCENES.CONFIG },
      {
        name: 'logout_button',
        label: LanguageManager.get('menu_logout'),
        action: 'logout',
      },
    ];

    const buttonSpacing = 50;

    menuItems.forEach((item, i) => {
      const buttonY = startY + i * buttonSpacing;
      const onClick = () => {
        if (item.action === 'logout') {
          api.logout();
          this.registry.remove('loggedInUser');
          this.scene.start(CST.SCENES.AUTH_CHOICE);
        } else if (item.scene === CST.SCENES.CONFIG) {
          this.scene.pause();
          this.scene.launch(item.scene);
        } else if (item.scene) {
          this.scene.stop(CST.SCENES.MENU);
          this.scene.start(item.scene, { userData: this.userData });
        }
      };
      createButton(this, x, buttonY, item.label, onClick).setName(item.name);
    });
  }

  // --- DASHBOARD (Ranking & News) ---
  createDashboard(centerX) {
    const panelWidth = 400;
    const panelX = centerX - panelWidth / 2; // Center the panel

    // 1. Ranking Panel (Top Widget)
    this.createRankingPanel(panelX, 100, panelWidth, 160);

    // 2. News Panel (Middle Widget)
    this.createNewsPanel(panelX, 280, panelWidth, 120);
  }

  async createRankingPanel(x, y, w, h) {
    // Container
    createPanel(this, x, y, w, h);

    // Header
    this.add.text(x + 10, y + 10, '🏆 TOP RANKING', {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      fill: '#FFD700'
    });

    // Loading Text
    const loadingText = this.add.text(x + w/2, y + h/2, 'Loading...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    try {
      const ranking = await api.getRanking(); // Handles mock data internally
      if (!this.scene || !this.sys) return;

      loadingText.destroy();

      // Display Top 5
      const top5 = ranking.slice(0, 5);
      let yPos = y + 40;

      top5.forEach((p, i) => {
        const name = p.name || p.username || 'Unknown'; // Adjust based on API response
        const score = p.score || p.xp || 0;
        const color = i === 0 ? '#FFFF00' : '#FFFFFF';

        this.add.text(x + 20, yPos, `${i+1}. ${name}`, {
           fontFamily: '"Press Start 2P"', fontSize: '10px', fill: color
        });

        this.add.text(x + w - 20, yPos, `${score}`, {
           fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#00ffff'
        }).setOrigin(1, 0);

        yPos += 30;
      });

      // View All Button (Small) inside panel?
      // Or just assume the dashboard is enough.
      // Maybe make the panel clickable to go to full ranking scene?
      const hitArea = this.add.rectangle(x + w/2, y + h/2, w, h).setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
         this.scene.start(CST.SCENES.RANKING, { userData: this.userData });
      });
      // Tooltip instruction
      this.add.text(x + w - 10, y + h - 15, '(Click for details)', {
          fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#666'
      }).setOrigin(1, 0.5);

    } catch (e) {
      loadingText.setText('Failed to load.');
    }
  }

  async createNewsPanel(x, y, w, h) {
    // Container
    createPanel(this, x, y, w, h);

    // Header
    this.add.text(x + 10, y + 10, '📰 LATEST NEWS', {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      fill: '#00ff00'
    });

    // Loading Text
    const loadingText = this.add.text(x + w/2, y + h/2, 'Loading...', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      fill: '#aaaaaa'
    }).setOrigin(0.5);

    try {
      const news = await api.getNews(); // Handles mock data
      if (!this.scene || !this.sys) return;

      loadingText.destroy();

      const latest = news[0]; // Show latest news
      if (latest) {
         this.add.text(x + 20, y + 40, latest.title, {
            fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#ffffff',
            wordWrap: { width: w - 40 }
         });

         this.add.text(x + 20, y + 70, latest.content, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#cccccc',
            wordWrap: { width: w - 40 }
         });
      } else {
         this.add.text(x + w/2, y + h/2, 'No news available.', {
            fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#666'
         }).setOrigin(0.5);
      }

    } catch (e) {
      loadingText.setText('Failed to load.');
    }
  }

  playMenuMusic() {
    const musicEnabled = this.registry.get('musicEnabled') ?? true;
    SoundManager.stopAll(this);
    if (musicEnabled) {
      SoundManager.playMusic(this, 'menu_music');
    }
  }

  shutdown() {
    if (window.DEBUG_MODE) {
      console.log('[DEBUG] MenuScene: shutdown() called.');
    }
    this.children.removeAll(true);
  }
}
