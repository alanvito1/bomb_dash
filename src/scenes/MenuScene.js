// src/scenes/MenuScene.js
import SoundManager from '../utils/sound.js';
import { CST } from '../CST.js';
import api from '../api.js';
import bcoinService from '../web3/bcoin-service.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';
import { createRetroButton, createRetroPanel } from '../utils/ui.js'; // Updated Import
import { MOCK_USER } from '../config/MockData.js';
import { addJuice } from '../modules/UIGenerator.js';
import ShopModal from '../ui/ShopModal.js';
import HeroesModal from '../ui/HeroesModal.js';
import RankingModal from '../ui/RankingModal.js';
import SettingsModal from '../ui/SettingsModal.js';
import WalletModal from '../ui/WalletModal.js';
import AltarModal from '../ui/AltarModal.js';
import BestiaryModal from '../ui/BestiaryModal.js';
import SocialModal from '../ui/SocialModal.js';
import ForgeModal from '../ui/ForgeModal.js';
import HousesModal from '../ui/HousesModal.js';
import ChatWidget from '../ui/ChatWidget.js';
import BattleModal from '../ui/BattleModal.js';

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

    const { width, height } = this.scale;

    // --- BACKGROUND ---
    this.grid = this.add.tileSprite(
      width / 2,
      height / 2,
      width,
      height,
      'menu_bg_vertical' // Using real asset now
    );

    // --- LAYOUT ---
    this.createHeroShowcase(width, height);
    this.createTopBar(width);
    this.createRewardPoolWidget(width);
    this.createBottomDock(width, height);

    // --- MODALS ---
    this.shopModal = new ShopModal(this);
    this.heroesModal = new HeroesModal(this);
    this.rankingModal = new RankingModal(this);
    this.settingsModal = new SettingsModal(this);
    this.walletModal = new WalletModal(this);
    this.altarModal = new AltarModal(this);
    this.bestiaryModal = new BestiaryModal(this);
    this.socialModal = new SocialModal(this);
    this.forgeModal = new ForgeModal(this);
    this.housesModal = new HousesModal(this);
    this.battleModal = new BattleModal(this);

    // --- AUDIO ---
    this.playMenuMusic();

    // --- EVENTS ---
    GameEventEmitter.on('bcoin-balance-update', this.handleBalanceUpdate, this);

    // Initial fetch
    bcoinService.updateBalance();
    this.loadUserHero();

    // --- CHAT ---
    this.chatWidget = new ChatWidget(this);

    // --- DEBUG BYPASS ---
    // Press ENTER to skip to GameScene
    this.input.keyboard.on('keydown-ENTER', () => {
        console.log('DEV START DETECTED (ENTER)');
        this.scene.start(CST.SCENES.GAME, { userData: MOCK_USER });
    });

    // Hidden Button (Top Left Corner)
    const devBtn = this.add.zone(0, 0, 100, 50).setOrigin(0).setInteractive();
    devBtn.on('pointerdown', () => {
         console.log('DEV START CLICKED');
         this.scene.start(CST.SCENES.GAME, { userData: MOCK_USER });
    });
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
      if (!this.sys || !this.scene) return; // Prevent crash if scene destroyed
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
      this.updateHeroScale();
    }
  }

  update() {
    // Animate Grid
    if (this.grid) {
      this.grid.tilePositionY -= 0.5;
    }
  }

  createRewardPoolWidget(width) {
      const container = this.add.container(width / 2, 90);

      // Replaced Graphics with RetroPanel
      const bg = createRetroPanel(this, 0, 0, 200, 30, 'dark');

      const label = this.add.text(0, -6, 'REWARD POOL', {
          fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#ffd700'
      }).setOrigin(0.5);

      this.poolText = this.add.text(0, 6, 'Loading...', {
          fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#fff'
      }).setOrigin(0.5);

      this.trendArrow = this.add.text(85, 0, '-', {
          fontSize: '12px', fill: '#00ff00'
      }).setOrigin(0.5);

      container.add([bg, label, this.poolText, this.trendArrow]);

      this.time.addEvent({ delay: 10000, callback: this.updateRewardPool, callbackScope: this, loop: true });
      this.updateRewardPool();
  }

  async updateRewardPool() {
      if (!this.poolText || !this.poolText.active) return;
      try {
          const res = await api.getRewardPool();
          if (!this.sys || !this.scene) return;
          if (res.success) {
              const val = res.pool;
              this.poolText.setText(`${val} BCOIN`);

              const prev = this.lastPoolValue !== undefined ? this.lastPoolValue : val;
              if (val > prev) {
                  this.trendArrow.setText('▲').setColor('#00ff00');
              } else if (val < prev) {
                  this.trendArrow.setText('▼').setColor('#ff0000');
              } else {
                  this.trendArrow.setText('-');
                  this.trendArrow.setColor('#888888');
              }
              this.lastPoolValue = val;
          }
      } catch (e) {
          console.warn(e);
      }
  }

  createTopBar(width) {
    const barHeight = 80;
    const container = this.add.container(0, 0);

    // Retro Panel Background (Metal Style)
    // Centered at width/2, barHeight/2
    const bg = createRetroPanel(this, width/2, barHeight/2, width, barHeight, 'metal');
    container.add(bg);

    // --- LEFT: PLAYER INFO ---
    const avatarX = 40;
    const avatarY = 40;

    // Avatar
    const avatarBg = this.add.circle(avatarX, avatarY, 22, 0x00ffff);
    const avatarImg = this.add
      .image(avatarX, avatarY, 'icon_avatar')
      .setDisplaySize(40, 40);
    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillCircle(avatarX, avatarY, 20);
    const mask = maskShape.createGeometryMask();
    avatarImg.setMask(mask);

    // Name
    let rawName = this.getShortName();
    if (rawName.length > 12) {
      rawName = rawName.substring(0, 10) + '...';
    }
    const nameText = this.add
      .text(70, 25, rawName, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        fill: '#ffffff',
      })
      .setOrigin(0, 0.5);

    // XP Bar
    const xpY = 45;
    const xpWidth = 80;
    const xpBg = this.add
      .rectangle(70, xpY, xpWidth, 6, 0x222222) // Darker for retro
      .setOrigin(0, 0);
    const xpFill = this.add
      .rectangle(70, xpY, xpWidth * 0.6, 6, 0x00ff00)
      .setOrigin(0, 0);

    container.add([avatarBg, avatarImg, nameText, xpBg, xpFill]);

    // --- CENTER/RIGHT: RESOURCES ---
    const resX = 160;
    const goldY = 25;
    const bcoinY = 50;

    // Gold
    const goldIcon = this.add
      .image(resX, goldY, 'icon_gold')
      .setScale(0.6)
      .setOrigin(0, 0.5);
    this.goldText = this.add
      .text(resX + 20, goldY, '1250', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        fill: '#ffd700',
      })
      .setOrigin(0, 0.5);

    // BCOIN
    const bcoinIcon = this.add
      .image(resX, bcoinY, 'icon_bcoin')
      .setScale(0.6)
      .setOrigin(0, 0.5);
    this.bcoinText = this.add
      .text(resX + 20, bcoinY, '---', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        fill: '#00ffff',
      })
      .setOrigin(0, 0.5);

    // Interactive BCOIN area
    const bcoinBg = this.add
      .rectangle(resX, bcoinY, 80, 20, 0x000000, 0)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    bcoinBg.on('pointerup', () => {
      SoundManager.playClick(this);
      this.walletModal.open();
    });

    container.add([goldIcon, this.goldText, bcoinBg, bcoinIcon, this.bcoinText]);

    // --- FAR RIGHT: BUTTONS (Icons) ---
    const btnY = 30;
    const btnGap = 36;
    let btnX = width - 20;

    const addBtn = (key, callback, color) => {
      let btn;
      if (this.textures.exists(key)) {
        btn = this.add.image(btnX, btnY, key).setScale(0.8);
      } else {
        const gfx = this.add.graphics();
        gfx.fillStyle(color || 0xffffff, 1);
        gfx.fillCircle(0, 0, 12);
        btn = this.add.container(btnX, btnY);
        btn.add(gfx);
        btn.add(
          this.add
            .text(0, 0, key.charAt(5).toUpperCase(), {
              fontSize: '10px',
              color: '#000',
            })
            .setOrigin(0.5)
        );
        btn.setSize(24, 24);
      }
      addJuice(btn, this);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerup', callback);
      container.add(btn);
      btnX -= btnGap;
    };

    addBtn('icon_settings', () => this.settingsModal.open(), 0xaaaaaa);
    addBtn('icon_wallet', () => this.walletModal.open(), 0xcd7f32);
    addBtn('icon_altar', () => this.altarModal.open(), 0xffd700);
    addBtn('icon_book', () => this.bestiaryModal.open(), 0xdc143c);
    addBtn('icon_guild', () => this.socialModal.open(), 0xff00ff);
    addBtn('icon_forge', () => this.forgeModal.open(), 0xff4500);
    addBtn('icon_house', () => this.housesModal.open(), 0x00ffff);

    // Guest Dot
    if (this.userData.isGuest) {
      const walletX = width - 20 - 36;
      const dot = this.add.circle(walletX + 10, btnY - 10, 4, 0xff0000);
      container.add(dot);
    }
  }

  createHeroShowcase(width, height) {
    const cx = width / 2;
    const cy = height / 2;

    this.heroSprite = this.add.image(cx, cy, 'ninja_hero');
    this.updateHeroScale();
  }

  updateHeroScale() {
    if (!this.heroSprite) return;

    // Enforce fixed display height (approx 3x larger than 40px icons = ~150px)
    const targetHeight = 150;
    const scale = targetHeight / this.heroSprite.height;

    this.heroSprite.setScale(scale);

    // Stop existing tween if any
    if (this.heroTween) this.heroTween.stop();

    // Create new breathing tween based on calculated scale
    this.heroTween = this.tweens.add({
      targets: this.heroSprite,
      scaleY: scale * 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createBottomDock(width, height) {
    const dockHeight = 100;
    const container = this.add.container(0, height - dockHeight);

    // Background (Metal Panel)
    const bg = createRetroPanel(this, width/2, dockHeight/2, width, dockHeight, 'metal');
    container.add(bg);

    const btnY = dockHeight / 2;

    // --- RETRO BUTTONS ---
    // Heroes (Neutral/Cyan)
    const heroesBtn = createRetroButton(this, width * 0.20, btnY, 120, 50, 'HEROES', 'neutral', () => {
        SoundManager.playClick(this);
        this.heroesModal.open();
    });

    // PLAY (Primary/Yellow)
    const playBtn = createRetroButton(this, width * 0.50, btnY, 140, 60, 'PLAY', 'primary', () => {
        SoundManager.playClick(this);
        this.battleModal.open();
    });

    // Shop (Success/Green)
    const shopBtn = createRetroButton(this, width * 0.80, btnY, 120, 50, 'SHOP', 'success', () => {
        SoundManager.playClick(this);
        this.shopModal.open();
    });

    container.add([heroesBtn, playBtn, shopBtn]);
  }

  getShortName() {
    if (!this.userData || !this.userData.walletAddress) return 'Guest';
    const addr = this.userData.walletAddress;
    const shortAddr = `${addr.substring(0, 6)}...`;
    if (this.userData.guildTag) {
        return `[${this.userData.guildTag}] ${shortAddr}`;
    }
    return shortAddr;
  }

  handleBalanceUpdate(data) {
    if (
      !this.scene ||
      !this.sys ||
      !this.bcoinText ||
      !this.bcoinText.active
    ) {
      return;
    }
    if (data.error) {
      this.bcoinText.setText('Err');
    } else {
      this.bcoinText.setText(data.balance.toString());
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
    if (this.chatWidget) this.chatWidget.destroy();
    this.children.removeAll(true);
  }
}
