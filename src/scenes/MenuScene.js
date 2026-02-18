// src/scenes/MenuScene.js
import SoundManager from '../utils/sound.js';
import { CST } from '../CST.js';
import api from '../api.js';
import bcoinService from '../web3/bcoin-service.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';
import TextureGenerator from '../modules/TextureGenerator.js';
import { addJuice } from '../modules/UIGenerator.js';
import ShopModal from '../ui/ShopModal.js';
import HeroesModal from '../ui/HeroesModal.js';
import RankingModal from '../ui/RankingModal.js';
import SettingsModal from '../ui/SettingsModal.js';
import WalletModal from '../ui/WalletModal.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: CST.SCENES.MENU });
    this.userData = null;
    this.grid = null;
    this.goldText = null;
    this.bcoinText = null;
  }

  init(data) {
    if (window.DEBUG_MODE) {
      console.log('[DEBUG] MenuScene: init() called.', data);
    }
    this.userData = data.userData;
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

    // Ensure assets are generated
    TextureGenerator.generate(this);

    const { width, height } = this.scale;

    // --- BACKGROUND ---
    this.grid = this.add.tileSprite(
      width / 2,
      height / 2,
      width,
      height,
      'floor_grid'
    );

    // --- LAYOUT ---
    this.createHeroShowcase(width, height);
    this.createTopBar(width);
    this.createBottomDock(width, height);

    // --- MODALS ---
    this.shopModal = new ShopModal(this);
    this.heroesModal = new HeroesModal(this);
    this.rankingModal = new RankingModal(this);
    this.settingsModal = new SettingsModal(this);
    this.walletModal = new WalletModal(this);

    // --- AUDIO ---
    this.playMenuMusic();

    // --- EVENTS ---
    GameEventEmitter.on('bcoin-balance-update', this.handleBalanceUpdate, this);

    // Initial fetch
    bcoinService.updateBalance();
    this.loadUserHero();
  }

  async loadUserHero() {
    // Check registry first
    const cachedHero = this.registry.get('selectedHero');
    if (cachedHero) {
      this.updateHeroSprite(cachedHero.sprite_name);
      return;
    }

    try {
      const res = await api.getHeroes();
      if (res.success && res.heroes.length > 0) {
        const hero = res.heroes[0];
        this.registry.set('selectedHero', hero);
        this.updateHeroSprite(hero.sprite_name);
      }
    } catch (e) {
      console.warn('Failed to load heroes for showcase', e);
    }
  }

  updateHeroSprite(key) {
    if (this.heroSprite && this.textures.exists(key)) {
      this.heroSprite.setTexture(key);
    }
  }

  update() {
    // Animate Grid
    if (this.grid) {
      this.grid.tilePositionY -= 0.5;
    }
  }

  createTopBar(width) {
    const barHeight = 80;
    const container = this.add.container(0, 0);

    // Background (Gradient-ish via multiple rects or just solid with alpha)
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRect(0, 0, width, barHeight);

    // Bottom Border (Neon Cyan)
    bg.lineStyle(2, 0x00ffff, 0.5);
    bg.beginPath();
    bg.moveTo(0, barHeight);
    bg.lineTo(width, barHeight);
    bg.strokePath();

    container.add(bg);

    // --- LEFT: PLAYER INFO ---
    // Avatar Circle
    const avatarX = 40;
    const avatarY = 40;
    const avatarBg = this.add.circle(avatarX, avatarY, 22, 0x00ffff); // Cyan border
    const avatarImg = this.add
      .image(avatarX, avatarY, 'icon_avatar')
      .setDisplaySize(40, 40);
    // Masking the avatar to be a circle
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillCircle(avatarX, avatarY, 20);
    const mask = maskShape.createGeometryMask();
    avatarImg.setMask(mask);

    // Name
    const nameText = this.add.text(70, 25, this.getShortName(), {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      fill: '#ffffff',
    });

    // XP Bar (Thin)
    const xpY = 45;
    const xpWidth = 80;
    const xpBg = this.add
      .rectangle(70, xpY, xpWidth, 6, 0x333333)
      .setOrigin(0, 0);
    const xpFill = this.add
      .rectangle(70, xpY, xpWidth * 0.6, 6, 0x00ff00)
      .setOrigin(0, 0); // Mock 60%

    container.add([avatarBg, avatarImg, nameText, xpBg, xpFill]);

    // --- CENTER/RIGHT: RESOURCES ---
    const resStartX = width - 180;

    // Gold
    const goldY = 25;
    const goldIcon = this.add
      .image(resStartX, goldY, 'icon_gold')
      .setScale(0.8);
    this.goldText = this.add.text(resStartX + 20, goldY - 8, '1250', {
      // Mock Value
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      fill: '#ffffff',
    });

    // BCOIN
    const bcoinY = 55;
    // Darker background for BCOIN
    const bcoinBg = this.add
      .rectangle(resStartX, bcoinY, 110, 24, 0x000033)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    bcoinBg.on('pointerup', () => {
      SoundManager.playClick(this);
      this.walletModal.open();
    });

    const bcoinIcon = this.add
      .image(resStartX, bcoinY, 'icon_bcoin')
      .setScale(0.8);
    this.bcoinText = this.add.text(resStartX + 20, bcoinY - 8, '---', {
      fontFamily: '"Press Start 2P"',
      fontSize: '12px',
      fill: '#00ffff',
    });

    container.add([
      bcoinBg,
      goldIcon,
      this.goldText,
      bcoinIcon,
      this.bcoinText,
    ]);

    // --- RIGHT CORNER: BUTTONS ---
    // Wallet
    const walletBtn = this.add
      .image(width - 65, 30, 'icon_wallet')
      .setScale(0.8);

    addJuice(walletBtn, this);
    walletBtn.on('pointerup', () => {
      this.walletModal.open();
    });

    // Settings
    const settingsBtn = this.add
      .image(width - 25, 30, 'icon_settings')
      .setScale(0.8);

    addJuice(settingsBtn, this);
    settingsBtn.on('pointerup', () => {
      this.settingsModal.open();
    });

    container.add([walletBtn, settingsBtn]);

    // Red Dot on Wallet if Guest
    if (this.userData.isGuest) {
      const dot = this.add.circle(width - 65 + 10, 30 - 10, 4, 0xff0000);
      container.add(dot);
    }
  }

  createHeroShowcase(width, height) {
    // Center
    const cx = width / 2;
    const cy = height / 2;

    // Hero
    this.heroSprite = this.add.image(cx, cy, 'ninja_hero').setScale(4);

    // Breathing Tween
    this.tweens.add({
      targets: this.heroSprite,
      scaleY: 4.2,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createBottomDock(width, height) {
    const dockHeight = 80;
    const container = this.add.container(0, height - dockHeight); // Fixed 80px bar

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRect(0, 0, width, dockHeight);
    bg.lineStyle(2, 0x00ffff, 1); // Neon Cyan Top Border
    bg.beginPath();
    bg.moveTo(0, 0);
    bg.lineTo(width, 0);
    bg.strokePath();
    container.add(bg);

    // Buttons
    const buttons = [
      { icon: 'icon_base', label: 'Base', active: true },
      { icon: 'icon_heroes', label: 'Heroes', action: () => this.heroesModal.open() },
      {
        icon: 'icon_battle',
        label: 'BATTLE',
        scene: CST.SCENES.CHARACTER_SELECTION,
        isBattle: true,
      },
      { icon: 'icon_shop', label: 'Shop', action: () => this.shopModal.open() },
      { icon: 'icon_ranking', label: 'Ranking', action: () => this.rankingModal.open() },
    ];

    const step = width / buttons.length;
    const halfStep = step / 2;

    buttons.forEach((btn, i) => {
      const x = i * step + halfStep;
      const y = dockHeight / 2;

      if (btn.isBattle) {
        // Floating Battle Button
        const battleContainer = this.add.container(x, y - 30);

        // Glow
        const glow = this.add.graphics();
        glow.fillStyle(0xffd700, 0.3);
        glow.fillCircle(0, 0, 45);

        // Button Body
        const circle = this.add.graphics();
        circle.lineStyle(4, 0xffaa00);
        circle.fillStyle(0xffd700);
        circle.fillCircle(0, 0, 35);
        circle.strokeCircle(0, 0, 35);

        // Icon
        const icon = this.add
          .image(0, 0, btn.icon)
          .setScale(1.2)
          .setTint(0x000000);

        battleContainer.add([glow, circle, icon]);
        battleContainer.setSize(80, 80);
        battleContainer.setInteractive({ useHandCursor: true });

        // Pulse
        this.tweens.add({
          targets: battleContainer,
          scale: 1.05,
          duration: 800,
          yoyo: true,
          repeat: -1,
        });

        battleContainer.on('pointerdown', () => {
          SoundManager.playClick(this);
          console.log('Battle Button Clicked');
          if (btn.scene)
            this.scene.start(btn.scene, { userData: this.userData });
        });

        container.add(battleContainer);
      } else {
        // Normal Button
        const btnContainer = this.add.container(x, y);

        const icon = this.add.image(0, -10, btn.icon);
        if (btn.active) icon.setTint(0x00ffff);
        else icon.setTint(0x888888);

        const text = this.add
          .text(0, 15, btn.label, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            fill: btn.active ? '#00ffff' : '#888888',
          })
          .setOrigin(0.5);

        btnContainer.add([icon, text]);
        btnContainer.setSize(60, 60);

        addJuice(btnContainer, this);

        btnContainer.on('pointerup', () => {
          if (btn.action) btn.action();
          if (btn.scene) {
            this.scene.start(btn.scene, { userData: this.userData });
          }
        });

        container.add(btnContainer);
      }
    });
  }

  getShortName() {
    if (!this.userData || !this.userData.walletAddress) return 'Guest';
    const addr = this.userData.walletAddress;
    return `${addr.substring(0, 6)}...`;
  }

  handleBalanceUpdate(data) {
    if (this.bcoinText) {
      if (data.error) {
        this.bcoinText.setText('Err');
      } else {
        this.bcoinText.setText(data.balance.toString());
      }
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
    GameEventEmitter.off(
      'bcoin-balance-update',
      this.handleBalanceUpdate,
      this
    );
    this.children.removeAll(true);
  }
}
