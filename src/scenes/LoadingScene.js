// src/scenes/LoadingScene.js
import LanguageManager from '../utils/LanguageManager.js';
import contractProvider from '../web3/ContractProvider.js';
import api from '../api.js';
import AssetLoader from '../utils/AssetLoader.js';
import { MockHeroes } from '../config/MockNFTData.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
    console.log('✅ LoadingScene: Constructor has been called!');
    this.contractsInitializedPromise = null;
  }

  preload() {
    console.log('🔄 LoadingScene: Preload is starting...');
    // --- E2E Test Reliability Fix ---
    LanguageManager.init(this);
    this.contractsInitializedPromise = contractProvider.initialize();

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Display Loading UI ---
    const textStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      fill: '#00ffff',
      align: 'center',
    };

    this.add
      .text(centerX, centerY - 80, 'ESTABLISHING LINK...', textStyle)
      .setOrigin(0.5);

    const loadingMessages = [
      'Calibrating Bombs...',
      'Mining BCOIN...',
      'Summoning Heroes...',
      'Synchronizing Blockchain...',
      'Loading Pixel Assets...',
      'Generating World...',
    ];
    const randomMsg =
      loadingMessages[Math.floor(Math.random() * loadingMessages.length)];

    const loadingText = this.add
      .text(centerX, centerY + 40, randomMsg, {
        ...textStyle,
        fontSize: '10px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Progress Bar
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x000033, 0.8);
    progressBox.lineStyle(2, 0x00ffff, 1);
    progressBox.fillRoundedRect(centerX - 150, centerY - 10, 300, 20, 4);
    progressBox.strokeRoundedRect(centerX - 150, centerY - 10, 300, 20, 4);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ffff, 1);
      progressBar.fillRoundedRect(
        centerX - 148,
        centerY - 8,
        296 * value,
        16,
        2
      );
    });

    // --- ROBUST FALLBACK SYSTEM ---
    this.load.on('loaderror', (fileObj) => {
      console.warn('⚠️ Asset failed to load, creating fallback:', fileObj.key, fileObj.url);
      if (fileObj.type === 'image' || fileObj.type === 'spritesheet') {
        const key = fileObj.key;
        if (!this.textures.exists(key)) {
            // Generate a 32x32 Placeholder Texture
            // Color code based on type for visual debugging
            let color = 0xff00ff; // Magenta = Error
            if (key.includes('hero')) color = 0x00ff00; // Green = Hero
            if (key.includes('enemy')) color = 0xff0000; // Red = Enemy
            if (key.includes('boss')) color = 0x880000; // Dark Red = Boss
            if (key.includes('item') || key.includes('powerup')) color = 0xffff00; // Yellow = Item

            const graphics = this.make.graphics({x:0, y:0, add:false});
            graphics.fillStyle(color);
            graphics.fillRect(0,0,32,32);
            graphics.lineStyle(2, 0xffffff);
            graphics.strokeRect(0,0,32,32);
            graphics.generateTexture(key, 32, 32);
        }
      }
    });

    // --- ASSET LOADING ---
    this.load.script(
      'webfont',
      'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'
    );

    // 1. Dynamic Hero Loading (Optimization: Load only user heroes)
    console.log('🔄 Loading Heroes from MockData...');
    MockHeroes.forEach(hero => {
        const { skin, color } = hero.visuals;
        const key = `hero_s${skin}_c${color}`;
        const path = `assets/heroes/hero_s${skin}_c${color}.png`;
        this.load.image(key, path);
        // Also map standard hero keys if needed
        if (hero.sprite_name && hero.sprite_name !== key) {
           // We will handle sprite_name remapping in GameScene or via a helper,
           // but for now, let's load the asset.
        }
    });
    // Load Legacy/Default Heroes as fallback
    this.load.image('ninja_hero', 'assets/heroes/hero_s1_c2.png'); // Default Ninja
    this.load.image('witch_hero', 'assets/heroes/hero_s5_c4.png'); // Default Witch

    // 2. Enemies
    for (let i = 1; i <= 5; i++) {
        this.load.image(`enemy${i}`, `assets/enemies/enemy${i}.png`);
    }
    // Map generic 'enemy' to enemy1 for backward compatibility
    this.load.image('enemy', 'assets/enemies/enemy1.png');

    // 3. Bosses (Standardized Keys)
    this.load.image('boss_robot', 'assets/bosses/Robot/robot_front-(1).png');
    this.load.image('boss_tank', 'assets/bosses/boss_tank/down (1).png');
    this.load.image('boss_golzilla', 'assets/bosses/golzilla/golzilla_small_front (1).png');
    this.load.image('boss_soldier', 'assets/bosses/soldier/soldier (1).png');
    this.load.image('boss5', 'assets/bosses/boss5.png');

    // 4. Powerups
    const powerups = [
        { key: 'rapid_fire', file: 'powerup1.png' },
        { key: 'multi_shot', file: 'powerup2.png' },
        { key: 'power_bomb', file: 'powerup3.png' },
        { key: 'mega_bomb', file: 'powerup4.png' },
        { key: 'energy_shield', file: 'powerup5.png' }
    ];
    powerups.forEach(p => {
        this.load.image(p.key, `assets/items/powerups/${p.file}`);
    });

    // 5. VFX & Projectiles
    this.load.image('bomb', 'assets/vfx/bomb.png');
    this.load.spritesheet('explosion_sheet', 'assets/vfx/explosion_sheet.png', { frameWidth: 32, frameHeight: 32 });
    // Fallback if sheet is missing, load raw and we'll slice it? No, raw is 160x32, Phaser handles sheets well.
    // Ensure path matches Inventory: public/assets/vfx/explosion.png (Wait, inventory said explosion.png)
    // Checking memory: "The explosion texture is generated as 'explosion_sheet' ... source asset is .../explosion.png"
    // The previous loader loaded from icons/explosion_sheet.png.
    // I need to be careful here. I will try loading 'assets/vfx/explosion.png' as a spritesheet.
    this.load.spritesheet('explosion', 'assets/vfx/explosion.png', { frameWidth: 32, frameHeight: 32 });

    // 6. Backgrounds & UI
    this.load.image('floor_grid', 'assets/backgrounds/menu_bg_vertical.png'); // Temp grid
    for (let i = 1; i <= 5; i++) {
        this.load.image(`bg${i}`, `assets/backgrounds/bg${i}.png`);
    }
    this.load.image('menu_bg_vertical', 'assets/backgrounds/menu_bg_vertical.png');

    // UI Icons
    const uiIcons = [
        'btn_menu', 'btn_pause'
    ];
    uiIcons.forEach(icon => {
        this.load.image(icon, `assets/ui/${icon}.png`);
    });

    // New Menu Icons (Task Force: UI Polish)
    this.load.image('icon_heroes', 'assets/icons/HeroSIcon.png');
    this.load.image('icon_play', 'assets/icons/shield_lightning.png');
    this.load.image('icon_shop', 'assets/icons/token.png');
    this.load.image('icon_forge', 'assets/icons/bhouse.webp');
    this.load.image('icon_summoner', 'assets/icons/Icon_L.png');

    // Resource Icons
    this.load.image('icon_gold', 'assets/icons/token.png');
    this.load.image('icon_bcoin', 'assets/icons/sen_token.png');
    this.load.image('icon_avatar', 'assets/icons/Icon_L.png'); // Default avatar

    // Load Rarity/Leaderboard assets if needed later (skipping for now to save bandwidth/time, will load on demand or in Menu)

    this.load.on('complete', () => {
      console.log('✅ All assets finished loading.');

      // --- ASSET RECOVERY SYSTEM ---
      // Checks if critical keys exist, generates blocks
      AssetLoader.ensureAssets(this);

      const handleFontLoaded = () => {
        this.checkSessionAndProceed(loadingText);
      };

      if (window.WebFont) {
        WebFont.load({
          google: { families: ['Press Start 2P'] },
          active: () => {
            console.log('✅ Custom font "Press Start 2P" loaded.');
            handleFontLoaded();
          },
          inactive: () => {
            console.error('🔥 Failed to load custom font.');
            handleFontLoaded();
          },
        });
      } else {
        handleFontLoaded();
      }
    });
  }

  async checkSessionAndProceed(loadingText) {
    try {
      console.log('⏳ LoadingScene: Waiting for ContractProvider...');
      try {
        await this.contractsInitializedPromise;
        console.log('✅ LoadingScene: Contracts Initialized.');
      } catch (e) {
        console.error('⚠️ LoadingScene: Contract Initialization Failed/Timed Out.', e);
      }

      loadingText.setText('VERIFYING SESSION...');

      if (api.hasSession()) {
        console.log('[LoadingScene] Session detected. Attempting to validate...');
        try {
          const loginStatus = await api.checkLoginStatus();
          if (loginStatus.success) {
            this.registry.set('loggedInUser', loginStatus.user);
            this.scene.start('MenuScene');
            return;
          }
        } catch (e) {
          console.warn('[LoadingScene] API Validation failed, entering Offline Mode.', e);
        }

        console.log('[LoadingScene] Bypassing AuthChoice (Fail-Safe).');
        const mockUser = {
          walletAddress: 'OFFLINE-MODE',
          isGuest: true,
          isOffline: true,
        };
        this.registry.set('loggedInUser', mockUser);
        this.scene.start('MenuScene');
        return;
      }

      console.log('[LoadingScene] No session found. Showing Overlay Prompt.');
      this.showLoginOverlayPrompt(loadingText);
    } catch (error) {
      console.error('[LoadingScene] Critical Initialization Error:', error);
      if (api.hasSession()) {
        const mockUser = { walletAddress: 'EMERGENCY-MODE', isGuest: true };
        this.registry.set('loggedInUser', mockUser);
        this.scene.start('MenuScene');
      } else {
        this.showLoginOverlayPrompt(loadingText);
      }
    }
  }

  showLoginOverlayPrompt(loadingText) {
    if (loadingText) loadingText.destroy();

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.9);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);

    this.add.text(centerX, centerY - 20, 'SESSION NOT FOUND', {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      color: '#ff0000',
      align: 'center'
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 20, 'Please Login via the HTML Overlay\nand Reload the Page.', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);
  }
}
