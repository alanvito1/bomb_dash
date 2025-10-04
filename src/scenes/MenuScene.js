// src/scenes/MenuScene.js
import { backgroundImages } from '../config/background.js';
import SoundManager from '../utils/sound.js';
import { CST } from '/src/CST.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js'; // Import the centralized api client
import { ethers } from 'ethers'; // Required for Wager Arena contract interaction

// --- Contract Configuration ---
const WAGER_ARENA_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; // From .env
const BCOIN_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"; // From .env
const BCOIN_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
];
const WAGER_ARENA_ABI = [
    "function enterWagerQueue(uint256 _tierId)",
    "event WagerMatchCreated(uint256 indexed matchId, uint256 indexed tierId, address player1, address player2, uint256 totalWager)"
];
// ------------------------------------

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
    this.bcoinBalanceText = null;
    this.userData = null;
    this.web3 = null;
  }

  init(data) {
    if (window.DEBUG_MODE) {
        console.log('[DEBUG] MenuScene: init() called.', data);
    }
    this.userData = data.userData;
    this.web3 = data.web3;
  }

  preload() {
    if (window.DEBUG_MODE) {
        console.log('[DEBUG] MenuScene: preload() started...');
    }
    // Nothing to preload for this specific scene, but the hook is here.
    if (window.DEBUG_MODE) {
        console.log('[DEBUG] MenuScene: preload() finished.');
    }
  }

  create() {
    if (window.DEBUG_MODE) {
        debugger; // This will pause the browser
        console.log('[DEBUG] MenuScene: create() started...');
    }
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

    this.playMenuMusic();
    this.displayBcoinBalance();

    if (window.DEBUG_MODE) {
        console.log('[DEBUG] MenuScene: create() finished.');
    }
  }

  createBackground(centerX, centerY) {
    this.add.image(centerX, centerY, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);
  }

  createMenuContent(centerX, centerY, useFallback = false) {
    // 🎮 Título do jogo
    this.add.text(centerX, 100, LanguageManager.get('game_title'), {
      fontFamily: useFallback ? 'monospace' : '"Press Start 2P"',
      fontSize: '20px',
      fill: '#FFD700',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    this.createMenu(centerX, centerY, useFallback);
  }

  async displayBcoinBalance() {
    const textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      fill: '#FFD700',
      align: 'right'
    };
    this.bcoinBalanceText = this.add.text(this.scale.width - 20, 20, LanguageManager.get('hud_bcoin_loading'), textStyle).setOrigin(1, 0);

    try {
      if (!window.ethereum) {
        this.bcoinBalanceText.setText(LanguageManager.get('hud_bcoin_no_wallet'));
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, provider);

      const balance = await bcoinContract.balanceOf(userAddress);

      // Format the balance to 8 decimal places.
      const formattedBalance = parseFloat(ethers.formatUnits(balance, 18)).toFixed(8);

      this.bcoinBalanceText.setText(LanguageManager.get('menu_bcoin_balance', { balance: formattedBalance }));

    } catch (error) {
      console.error('Failed to fetch BCOIN balance:', error);
      this.bcoinBalanceText.setText(LanguageManager.get('hud_bcoin_error'));
    }
  }

  createMenu(centerX, centerY, useFallback = false) {
    const menuItems = [
      { key: 'menu_solo', label: LanguageManager.get('menu_solo'), scene: 'CharacterSelectionScene' },
      { key: 'menu_pvp_ranked', label: "PvP Ranqueado", scene: CST.SCENES.PVP },
      { key: 'menu_altar', label: LanguageManager.get('menu_altar'), scene: 'AltarScene' },
      { key: 'menu_shop', label: LanguageManager.get('menu_shop'), scene: 'ShopScene' },
      { key: 'menu_profile', label: LanguageManager.get('profile_title'), scene: 'ProfileScene' },
      { key: 'menu_ranking', label: LanguageManager.get('menu_ranking'), scene: 'RankingScene' },
      { key: 'menu_logout', label: LanguageManager.get('menu_logout'), action: 'logout', color: '#FF6347' }
    ];

    const buttonStartY = centerY - 120;
    const buttonSpacing = 55;

    menuItems.forEach((item, i) => {
      const button = this.add.text(centerX, buttonStartY + i * buttonSpacing, item.label, {
        fontFamily: useFallback ? 'monospace' : '"Press Start 2P"',
        fontSize: '16px',
        fill: item.color || '#00ffff',
        backgroundColor: '#000000cc',
        padding: { x: 15, y: 10 },
        align: 'center'
      });
      button.setName(item.key); // Assign a stable name for automation
      button.setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          SoundManager.play(this, 'click');
          if (item.action === 'logout') {
            api.logout();
            this.registry.remove('loggedInUser');
            this.scene.start('AuthChoiceScene');
          } else if (item.scene) {
            this.scene.start(item.scene, { userData: this.userData, web3: this.web3 });
          }
        })
        .on('pointerover', () => button.setStyle({ fill: '#ffffff' }))
        .on('pointerout', () => button.setStyle({ fill: item.color || '#00ffff' }));
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
