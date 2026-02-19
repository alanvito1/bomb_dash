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
import AltarModal from '../ui/AltarModal.js';
import BestiaryModal from '../ui/BestiaryModal.js';
import SocialModal from '../ui/SocialModal.js';
import ForgeModal from '../ui/ForgeModal.js';
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

      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.7);
      bg.fillRoundedRect(-100, 0, 200, 30, 4);
      bg.lineStyle(1, 0xffd700);
      bg.strokeRoundedRect(-100, 0, 200, 30, 4);

      const label = this.add.text(0, 5, 'REWARD POOL', {
          fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#ffd700'
      }).setOrigin(0.5);

      this.poolText = this.add.text(0, 20, 'Loading...', {
          fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#fff'
      }).setOrigin(0.5);

      this.trendArrow = this.add.text(85, 15, '-', {
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
          if (!this.sys || !this.scene) return; // Prevent crash if scene destroyed
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

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.9);
    bg.fillRect(0, 0, width, barHeight);
    bg.lineStyle(2, 0x00ffff, 0.5);
    bg.beginPath();
    bg.moveTo(0, barHeight);
    bg.lineTo(width, barHeight);
    bg.strokePath();
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

    // Name - Truncated for safety
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
      .rectangle(70, xpY, xpWidth, 6, 0x333333)
      .setOrigin(0, 0);
    const xpFill = this.add
      .rectangle(70, xpY, xpWidth * 0.6, 6, 0x00ff00)
      .setOrigin(0, 0);

    container.add([avatarBg, avatarImg, nameText, xpBg, xpFill]);

    // --- CENTER/RIGHT: RESOURCES (Compact Stack) ---
    // Start after XP bar (approx 160px)
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

    // --- FAR RIGHT: BUTTONS (Compact Row) ---
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

    // Add buttons from Right to Left
    addBtn('icon_settings', () => this.settingsModal.open(), 0xaaaaaa);
    addBtn('icon_wallet', () => this.walletModal.open(), 0xcd7f32);
    addBtn('icon_altar', () => this.altarModal.open(), 0xffd700);
    addBtn('icon_book', () => this.bestiaryModal.open(), 0xdc143c);
    addBtn('icon_guild', () => this.socialModal.open(), 0xff00ff);
    addBtn('icon_forge', () => this.forgeModal.open(), 0xff4500);

    // Guest Dot
    if (this.userData.isGuest) {
      // Wallet is the 2nd button added (index 1 in reverse order)
      // X = (width - 20) - 36
      const walletX = width - 20 - 36;
      const dot = this.add.circle(walletX + 10, btnY - 10, 4, 0xff0000);
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

        battleContainer.on('pointerup', (pointer, localX, localY, event) => {
          if (event && event.stopPropagation) {
            event.stopPropagation();
          }
          SoundManager.playClick(this);
          console.log('Battle Button Clicked');
          this.battleModal.open();
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
