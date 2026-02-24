// src/scenes/MenuScene.js
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
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
import ProfileModal from '../ui/ProfileModal.js';
import playerStateService from '../services/PlayerStateService.js';
import PostFXManager from '../modules/PostFXManager.js';
import { getStageById } from '../config/Stages.js';
import TextureGenerator from '../modules/TextureGenerator.js';

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
    this.userData = data && data.userData ? data.userData : null;
  }

  create() {
    if (window.DEBUG_MODE) {
      console.log('[DEBUG] MenuScene: create() started...');
    }

    this.userData = this.registry.get('loggedInUser');

    // --- ROBUST FALLBACK ---
    if (!this.userData) {
      console.warn(
        'MenuScene: loggedInUser missing in registry. Fetching from PlayerStateService.'
      );
      this.userData = playerStateService.getUser();

      // If still missing (shouldn't happen if initialized), then critical error
      if (!this.userData) {
          console.error('CRITICAL: PlayerStateService not initialized. Redirecting to Loading.');
          this.scene.start(CST.SCENES.LOADING);
          return;
      }

      // Fix Registry
      this.registry.set('loggedInUser', this.userData);
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
    this.profileModal = new ProfileModal(this);

    // --- AUDIO ---
    this.playMenuMusic();

    // --- EVENTS ---
    GameEventEmitter.on('bcoin-balance-update', this.handleBalanceUpdate, this);

    // Initial fetch
    bcoinService.updateBalance();
    this.loadUserHero();

    // --- CHAT ---
    this.chatWidget = new ChatWidget(this);

    // --- ADMIN / GOD MODE TOOLS ---
    if (playerStateService.isAdmin) {
      this.createAdminTools();
    }

    // Apply Retro Filter
    // PostFXManager.init(this); // Clean UI: Removed CRT filter
  }

  createAdminTools() {
    console.log('🌹 ADMIN TOOLS ACTIVATED 🌹');
    const btn = this.add
      .text(20, 100, '⚙️', { fontSize: '24px' })
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.openGodPanel();
    });
  }

  openGodPanel() {
    if (this.godPanel) {
      this.godPanel.destroy();
      this.godPanel = null;
      return;
    }

    const w = 300;
    const h = 350;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.godPanel = this.add.container(cx, cy).setDepth(9999);

    // BG
    const bg = createRetroPanel(this, 0, 0, w, h, 'dark');
    this.godPanel.add(bg);

    // Title
    const title = this.add
      .text(0, -h / 2 + 20, 'THE OVERSEER', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        color: '#ff0000',
      })
      .setOrigin(0.5);
    this.godPanel.add(title);

    // Buttons
    let y = -h / 2 + 60;
    const gap = 50;

    // 1. +1000 Resources
    const btn1 = createRetroButton(
      this,
      0,
      y,
      250,
      40,
      '+1000 XP & COINS',
      'success',
      () => {
        playerStateService.addResources(1000, 1000);
        this.bcoinText.setText(playerStateService.getUser().bcoin.toString());
        // Refresh level text?
        // For now just resource update is fine
        SoundManager.play(this, 'coin_collect');
      }
    );
    this.godPanel.add(btn1);

    y += gap;

    // 2. Reset Hero
    const btn2 = createRetroButton(
      this,
      0,
      y,
      250,
      40,
      'RESET HERO LVL',
      'danger',
      () => {
        const hero = this.registry.get('selectedHero');
        if (hero) {
          playerStateService.resetHero(hero.id);
          SoundManager.play(this, 'powerup_collect');
        }
      }
    );
    this.godPanel.add(btn2);

    y += gap;

    // 3. God Mode Toggle
    const isGod = playerStateService.godMode;
    const btn3 = createRetroButton(
      this,
      0,
      y,
      250,
      40,
      `GOD MODE: ${isGod ? 'ON' : 'OFF'}`,
      isGod ? 'primary' : 'neutral',
      () => {
        const newState = playerStateService.toggleGodMode();
        // Update button text manually or recreate
        // Simple way: Close and reopen or just accept toast
        console.log('God Mode:', newState);
        this.openGodPanel(); // Refresh
      }
    );
    this.godPanel.add(btn3);

    y += gap;

    // 4. Stage 30 Skip
    const btn4 = createRetroButton(
      this,
      0,
      y,
      250,
      40,
      'WARP TO BOSS (STG 30)',
      'primary',
      () => {
        const stage30 = getStageById(30);
        if (stage30) {
          this.scene.start(CST.SCENES.GAME, {
            stageConfig: stage30,
            gameMode: 'solo',
          });
        } else {
          console.error('Stage 30 not found');
        }
      }
    );
    this.godPanel.add(btn4);

    y += gap;

    // 5. Analytics View
    const btn5 = createRetroButton(
        this,
        0,
        y,
        250,
        40,
        'VIEW ANALYTICS',
        'neutral',
        () => {
            const user = playerStateService.getUser();
            const stats = `
LVL: ${user.accountLevel} | XP: ${user.accountXp}
EARNED: ${user.totalEarned || 0}
SPENT: ${user.totalSpent || 0}
DAYS: ${user.daysLogged || 1}
            `;
            alert(stats); // Simple Alert for Admin MVP
        }
    );
    this.godPanel.add(btn5);

    y += gap;

    // Close
    const close = createRetroButton(
      this,
      0,
      y,
      100,
      30,
      'CLOSE',
      'neutral',
      () => {
        this.godPanel.destroy();
        this.godPanel = null;
      }
    );
    this.godPanel.add(close);
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
        // Task Force: Load Selected Hero from User Data if available
        let hero = res.heroes[0];
        if (this.userData && this.userData.selectedHeroId) {
          const found = res.heroes.find(
            (h) => h.id === this.userData.selectedHeroId
          );
          if (found) hero = found;
        }

        this.registry.set('selectedHero', hero);
        this.updateHeroSprite(hero.sprite_name);
      }
    } catch (e) {
      console.warn('Failed to load heroes for showcase', e);
    }
  }

  updateHeroSprite(key) {
    TextureGenerator.ensureHero(this, key);

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

    const label = this.add
      .text(0, -6, 'REWARD POOL', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        fill: '#ffd700',
      })
      .setOrigin(0.5);

    this.poolText = this.add
      .text(0, 6, 'Loading...', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#fff',
      })
      .setOrigin(0.5);

    this.trendArrow = this.add
      .text(85, 0, '-', {
        fontSize: '12px',
        fill: '#00ff00',
      })
      .setOrigin(0.5);

    container.add([bg, label, this.poolText, this.trendArrow]);

    this.time.addEvent({
      delay: 10000,
      callback: this.updateRewardPool,
      callbackScope: this,
      loop: true,
    });
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

        const prev =
          this.lastPoolValue !== undefined ? this.lastPoolValue : val;
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
    const bg = createRetroPanel(
      this,
      width / 2,
      barHeight / 2,
      width,
      barHeight,
      'metal'
    );
    container.add(bg);

    // --- LEFT: PLAYER INFO ---
    const avatarX = 40;
    const avatarY = 40;

    // Avatar
    const avatarBg = this.add.circle(avatarX, avatarY, 22, 0x00ffff);
    const avatarImg = this.add
      .image(avatarX, avatarY, 'icon_summoner')
      .setDisplaySize(40, 40)
      .setInteractive({ useHandCursor: true });

    avatarImg.on('pointerup', () => {
        SoundManager.playClick(this);
        this.profileModal.open();
    });

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillCircle(avatarX, avatarY, 20);
    const mask = maskShape.createGeometryMask();
    avatarImg.setMask(mask);

    // Summoner Title (Lore Update)
    const summonerTitle = LanguageManager.get('summoner_title', {}, 'SUMMONER');
    const nameText = this.add
      .text(70, 25, summonerTitle, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        fill: '#ffffff',
      })
      .setOrigin(0, 0.5);

    // Account Level Logic
    // Refresh user state from service to get latest XP
    const pState = playerStateService.getUser();
    const accountLevel = pState.accountLevel || 1;
    const accountXp = pState.accountXp || 0;
    const requiredXp = accountLevel * 100;
    const progress = requiredXp > 0 ? Math.min(accountXp / requiredXp, 1) : 0;

    // Account Level (Lore Update)
    const levelText = this.add
      .text(
        70 + nameText.width + 10,
        25,
        LanguageManager.get(
          'account_level',
          { level: accountLevel },
          `Lvl ${accountLevel}`
        ),
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '10px',
          fill: '#00ff00',
        }
      )
      .setOrigin(0, 0.5);

    // XP Bar
    const xpY = 45;
    const xpWidth = 80;
    const xpBg = this.add
      .rectangle(70, xpY, xpWidth, 6, 0x222222) // Darker for retro
      .setOrigin(0, 0);
    const xpFill = this.add
      .rectangle(70, xpY, xpWidth * progress, 6, 0x00ff00)
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

    container.add([
      goldIcon,
      this.goldText,
      bcoinBg,
      bcoinIcon,
      this.bcoinText,
    ]);

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
    // addBtn('icon_book', () => this.bestiaryModal.open(), 0xdc143c); // Moved to Dock
    addBtn('icon_guild', () => this.socialModal.open(), 0xff00ff);
    // addBtn('icon_forge', () => this.forgeModal.open(), 0xff4500); // Moved to Dock
    addBtn('icon_house', () => this.housesModal.open(), 0x00ffff);

    // Guest "SAVE" Button
    if (this.userData.isGuest) {
      const saveBtn = createRetroButton(
        this,
        width - 150, // Position to the left of icons
        btnY,
        80,
        30,
        'SAVE',
        'danger', // Red for attention
        () => {
            SoundManager.playClick(this);
            // Open Auth Choice as a Scene (it will handle return to Menu)
            this.scene.start(CST.SCENES.AUTH_CHOICE);
        }
      );
      container.add(saveBtn);
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
    const bg = createRetroPanel(
      this,
      width / 2,
      dockHeight / 2,
      width,
      dockHeight,
      'metal'
    );
    container.add(bg);

    const btnY = dockHeight / 2;
    // 5 Buttons Layout
    // Bestiary | Heroes | Play | Forge | Shop
    const sideBtnW = 85;
    const playBtnW = 100;

    // Calculated Centers for 480px width
    // Gaps approx 10px
    const x1 = 43; // Bestiary
    const x2 = 138; // Heroes
    const x3 = 240; // Play
    const x4 = 342; // Forge
    const x5 = 437; // Shop

    // BESTIARY (Purple) - Icon + Text
    const bestiaryBtn = createRetroButton(
      this,
      x1,
      btnY,
      sideBtnW,
      50,
      'BESTIARY',
      'neutral',
      () => {
        SoundManager.playClick(this);
        this.bestiaryModal.open();
      },
      'icon_book'
    );

    // HEROES (Cyan) - Icon + Text
    const heroesBtn = createRetroButton(
      this,
      x2,
      btnY,
      sideBtnW,
      50,
      'HEROES',
      'neutral',
      () => {
        SoundManager.playClick(this);
        this.heroesModal.open();
      },
      'icon_heroes'
    );

    // PLAY (Primary/Yellow) - Icon + Text
    const playBtn = createRetroButton(
      this,
      x3,
      btnY,
      playBtnW,
      60,
      'PLAY',
      'primary',
      () => {
        SoundManager.playClick(this);
        this.battleModal.open();
      },
      'icon_play'
    );

    // FORGE (Orange) - Icon + Text
    const canAccessForge = playerStateService.isEndGame();
    const forgeBtn = createRetroButton(
      this,
      x4,
      btnY,
      sideBtnW,
      50,
      'FORGE',
      canAccessForge ? 'danger' : 'metal',
      () => {
        if (!canAccessForge) {
            SoundManager.play(this, 'error');
            // Toast would be nice, but simple alert for MVP
            console.log('Forge Locked: Requires Level 8');
            return;
        }
        SoundManager.playClick(this);
        this.forgeModal.open();
      },
      'icon_forge'
    );

    // SHOP (Green) - Icon + Text
    const canAccessShop = playerStateService.isEndGame();
    const shopBtn = createRetroButton(
      this,
      x5,
      btnY,
      sideBtnW,
      50,
      'SHOP',
      canAccessShop ? 'success' : 'metal',
      () => {
        if (!canAccessShop) {
            SoundManager.play(this, 'error');
            console.log('Shop Locked: Requires Level 8');
            return;
        }
        SoundManager.playClick(this);
        this.shopModal.open();
      },
      'icon_shop'
    );

    container.add([bestiaryBtn, heroesBtn, playBtn, forgeBtn, shopBtn]);
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
    if (!this.scene || !this.sys || !this.bcoinText || !this.bcoinText.active) {
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
