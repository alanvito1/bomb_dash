// src/scenes/LoadingScene.js
import LanguageManager from '../utils/LanguageManager.js';
import contractProvider from '../web3/ContractProvider.js';
import api from '../api.js';
import AssetLoader from '../utils/AssetLoader.js';
import TextureGenerator from '../modules/TextureGenerator.js';
import { MockHeroes } from '../config/MockNFTData.js';
import playerStateService from '../services/PlayerStateService.js';
import { Stages } from '../config/Stages.js';

export default class LoadingScene extends Phaser.Scene {
  constructor() {
    super('LoadingScene');
    this.contractsInitializedPromise = null;
  }

  preload() {
    console.log('🔄 LoadingScene: Preload is starting...');
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

    const loadingText = this.add
      .text(centerX, centerY + 40, 'Loading Assets...', {
        ...textStyle,
        fontSize: '10px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Progress Bar
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x050505, 1);
    progressBox.lineStyle(2, 0xff5f1f, 1);
    progressBox.fillRoundedRect(centerX - 150, centerY - 10, 300, 20, 4);
    progressBox.strokeRoundedRect(centerX - 150, centerY - 10, 300, 20, 4);

    const progressBar = this.add.graphics();

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xff5f1f, 1);
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
      console.warn('⚠️ Asset failed to load, creating fallback:', fileObj.key);
      if (fileObj.type === 'image' || fileObj.type === 'spritesheet') {
        const key = fileObj.key;
        if (!this.textures.exists(key)) {
          if (key.includes('hero')) {
            TextureGenerator.createHero(this, key);
          } else if (key.includes('enemy')) {
            TextureGenerator.createEnemy(this, key);
          } else if (key === 'bomb') {
            TextureGenerator.createBomb(this, key);
          } else {
            // Generic Fallback
            TextureGenerator.createAsciiIcon(this, key, '❓', 0xff00ff);
          }
        }
      }
    });

    // --- ASSET LOADING ---
    this.load.script(
      'webfont',
      'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js'
    );

    // Heroes
    MockHeroes.forEach((hero) => {
      const { skin, color } = hero.visuals;
      this.load.image(
        `hero_s${skin}_c${color}`,
        `assets/heroes/hero_s${skin}_c${color}.png`
      );
    });
    this.load.image('ninja_hero', 'assets/heroes/hero_s1_c2.png');
    this.load.image('witch_hero', 'assets/heroes/hero_s5_c4.png');

    // Enemies & Bosses
    for (let i = 1; i <= 5; i++) {
      this.load.image(`enemy${i}`, `assets/enemies/enemy${i}.png`);
    }
    this.load.image('enemy', 'assets/enemies/enemy1.png');
    this.load.image('boss_robot', 'assets/bosses/Robot/robot_front-(1).png');
    this.load.image('boss_tank', 'assets/bosses/boss_tank/down (1).png');
    this.load.image(
      'boss_golzilla',
      'assets/bosses/golzilla/golzilla_small_front (1).png'
    );
    this.load.image('boss_soldier', 'assets/bosses/soldier/soldier (1).png');
    this.load.image('boss5', 'assets/bosses/boss5.png');

    // VFX & Items
    this.load.image('bomb', 'assets/vfx/bomb.png');

    // We intentionally skip loading 'explosion_sheet' to avoid 404s and let AssetLoader generate it procedurally

    this.load.spritesheet('explosion', 'assets/vfx/explosion.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image('floor_grid', 'assets/backgrounds/menu_bg_vertical.png');
    for (let i = 1; i <= 5; i++) {
      this.load.image(`bg${i}`, `assets/backgrounds/bg${i}.png`);
    }
    this.load.image(
      'menu_bg_vertical',
      'assets/backgrounds/menu_bg_vertical.png'
    );

    // TASK FORCE: STABLE EXTERNAL ASSETS (Zero Tolerance for Debug Visuals)
    this.load.image('hard_block', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/block.png');
    this.load.image('soft_block', 'https://raw.githubusercontent.com/photonstorm/phaser3-examples/master/public/assets/sprites/crate.png');

    const uiIcons = [
      'btn_menu',
      'btn_pause',
      // The following are missing, removing them to skip the 404 errors
      // 'icon_heroes',
      // 'icon_play',
      // 'icon_shop',
      // 'icon_forge',
      // 'icon_summoner',
      // 'icon_gold',
      // 'icon_bcoin',
      // 'icon_avatar',
    ];
    uiIcons.forEach((icon) => {
      if (!icon.startsWith('assets'))
        this.load.image(icon, `assets/ui/${icon}.png`);
    });

    const powerups = [
      'rapid_fire',
      'multi_shot',
      'power_bomb',
      'mega_bomb',
      'energy_shield',
    ];
    powerups.forEach((p, i) =>
      this.load.image(p, `assets/items/powerups/powerup${i + 1}.png`)
    );

    this.load.on('complete', () => {
      console.log('✅ All assets finished loading.');
      AssetLoader.ensureAssets(this);
      if (window.WebFont) {
        WebFont.load({
          google: { families: ['Press Start 2P'] },
          active: () => this.checkSessionAndProceed(loadingText),
          inactive: () => this.checkSessionAndProceed(loadingText),
        });
      } else {
        this.checkSessionAndProceed(loadingText);
      }
    });
  }

  async checkSessionAndProceed(loadingText) {
    loadingText.setText('INITIALIZING SYSTEM...');

    // In Offline Mode, we skip supabase session checks.
    // We always initialize as Guest.
    try {
      console.log('[LoadingScene] Offline Mode: Initializing Local State...');
      await playerStateService.init();
    } catch (e) {
      console.warn('[LoadingScene] Initialization Error', e);
      await playerStateService.init(); // Fallback
    }

    const user = playerStateService.getUser();
    const heroes = playerStateService.getHeroes();

    // Set Registry for Game Scenes
    this.registry.set('loggedInUser', user);
    this.registry.set('selectedHero', heroes[0]); // Default Hero

    // CHECK FRICTIONLESS ONBOARDING
    const termsAccepted = localStorage.getItem('termsAccepted');

    // Logic: If guest AND terms accepted -> Go straight to game (Stage 1)
    if (playerStateService.isGuest && termsAccepted === 'true') {
      console.log(
        '[LoadingScene] Guest + Terms Accepted -> Launching GameScene directly.'
      );

      // Setup Stage 1
      const stage1 = Stages.find((s) => s.id === 1);

      this.scene.start('GameScene', {
        stageConfig: stage1,
        gameMode: 'solo',
        hero: heroes[0] 
      });
      return;
    }

    // Normal Flow (or returning user)
    this.scene.start('MenuScene');
  }
}
