// src/scenes/MenuScene.js
import SoundManager from '../utils/sound.js';
import { CST } from '../CST.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js'; // Import the centralized api client
import GameEventEmitter from '../utils/GameEventEmitter.js';
import bcoinService from '../web3/bcoin-service.js';
import { ethers } from 'ethers'; // Required for Wager Arena contract interaction - KEPT FOR CLAIM REWARDS

// --- Contract Configuration ---
// Note: BCOIN contract details are now handled by the bcoin-service
const PERPETUAL_REWARD_POOL_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // From .env
const PERPETUAL_REWARD_POOL_ABI = [
    "function claimReward(address player, uint256 gamesPlayed, uint256 nonce, bytes calldata signature)"
];
// ------------------------------------

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: CST.SCENES.MENU });
    this.bcoinBalanceText = null;
    this.userAddressText = null;
    this.userData = null;
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
    // Nothing to preload for this specific scene, but the hook is here.
    if (window.DEBUG_MODE) {
        console.log('[DEBUG] MenuScene: preload() finished.');
    }
  }

  create() {
    if (window.DEBUG_MODE) {
        console.log('[DEBUG] MenuScene: create() started...');
    }
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.createBackground(centerX, centerY);

    this.createMenuContent(centerX, centerY);
    this.playMenuMusic();
    this.setupBcoinListener();
    this.displayUserData();

    // Trigger an initial balance update
    bcoinService.updateBalance();

    if (window.DEBUG_MODE) {
        console.log('[DEBUG] MenuScene: create() finished.');
    }
  }

  createBackground(centerX, centerY) {
    this.add.image(centerX, centerY, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);
  }

  createMenuContent(centerX, centerY) {
    // 🎮 Título do jogo
    this.add.text(centerX, 80, LanguageManager.get('game_title'), {
      fontFamily: '"Press Start 2P"',
      fontSize: '20px',
      fill: '#FFD700',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    this.createMenu(centerX, centerY);
  }

  setupBcoinListener() {
    const textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      fill: '#FFD700',
      align: 'right'
    };
    this.bcoinBalanceText = this.add.text(this.scale.width - 20, 20, LanguageManager.get('hud_bcoin_loading'), textStyle).setOrigin(1, 0);

    GameEventEmitter.on('bcoin-balance-update', ({ balance, error }) => {
        if (error) {
            this.bcoinBalanceText.setText(LanguageManager.get('hud_bcoin_error'));
        } else {
            const formattedBalance = parseFloat(balance).toFixed(4);
            this.bcoinBalanceText.setText(`$BCOIN: ${formattedBalance}`);
        }
    });
  }

  displayUserData() {
    if (this.userData && this.userData.walletAddress) {
        const address = this.userData.walletAddress;
        const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
        this.userAddressText = this.add.text(20, 20, `Player: ${shortAddress}`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#FFFFFF'
        }).setOrigin(0, 0);
    }
  }

  createMenu(centerX, centerY) {
    const menuItems = [
      { name: 'solo_button', label: LanguageManager.get('menu_solo'), scene: CST.SCENES.CHARACTER_SELECTION },
      { name: 'pvp_button', label: "PvP Modes", scene: CST.SCENES.PVP },
      { name: 'shop_button', label: LanguageManager.get('menu_shop'), scene: CST.SCENES.SHOP },
      { name: 'profile_button', label: LanguageManager.get('profile_title'), scene: CST.SCENES.PROFILE },
      { name: 'config_button', label: "Settings", scene: CST.SCENES.CONFIG },
      { name: 'logout_button', label: LanguageManager.get('menu_logout'), action: 'logout' }
    ];

    const buttonStartY = centerY - 120;
    const buttonSpacing = 65;

    menuItems.forEach((item, i) => {
        const buttonY = buttonStartY + i * buttonSpacing;
        const button = this.add.image(centerX, buttonY, 'btn_menu').setOrigin(0.5);
        button.setDisplaySize(280, 50);

        const buttonText = this.add.text(centerX, buttonY, item.label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        button.setName(item.name);
        button.setInteractive({ useHandCursor: true });

        button.on('pointerover', () => {
            button.setTint(0xcccccc);
            buttonText.setTint(0xffd700);
        });
        button.on('pointerout', () => {
            button.clearTint();
            buttonText.clearTint();
        });
        button.on('pointerdown', () => {
            button.setTint(0xaaaaaa);
        });
        button.on('pointerup', () => {
            button.clearTint();
            SoundManager.play(this, 'click');
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
        });
    });
  }

  // The claimSoloRewards function is removed as it's not part of the core navigation task.
  // It can be re-added or moved to a more appropriate scene (like Profile) later if needed.

  playMenuMusic() {
    const musicEnabled = this.registry.get('musicEnabled') ?? true;

    // 🎵 Para qualquer música que possa estar tocando (ex: mundo anterior)
    SoundManager.stopAll(this);

    // ▶ Toca música do menu se ativada
    if (musicEnabled) {
      SoundManager.playMusic(this, 'menu_music');
    }
  }

  // Ensure to clean up the event listener when the scene is destroyed
  shutdown() {
    if (window.DEBUG_MODE) {
        console.log('[DEBUG] MenuScene: shutdown() called.');
    }
    GameEventEmitter.off('bcoin-balance-update');
    // Destroy all children to prevent them from leaking into the next scene
    this.children.removeAll(true);
  }
}
