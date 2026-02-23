import TextureGenerator from '../modules/TextureGenerator.js';

/**
 * @class AssetLoader
 * @description Ensures all critical game assets exist, generating procedural fallbacks if necessary.
 */
export default class AssetLoader {
  /**
   * Checks for critical textures and generates procedural replacements if missing.
   * @param {Phaser.Scene} scene - The Phaser scene instance.
   */
  static ensureAssets(scene) {
    console.log('🔄 AssetLoader: Verifying assets...');

    // 1. Blocks (Missing from Assets - Must Generate)
    if (!scene.textures.exists('soft_block')) {
      console.log('🔨 Generating Procedural Soft Block...');
      TextureGenerator.createSoftBlock(scene);
    }
    if (!scene.textures.exists('hard_block')) {
      console.log('🔨 Generating Procedural Hard Block...');
      TextureGenerator.createHardBlock(scene);
    }

    // 2. UI Icons (Missing from Assets - Generate Geometric Fallbacks)
    const uiIcons = [
      'icon_settings',
      'icon_wallet',
      'icon_altar',
      'icon_book',
      'icon_guild',
      'icon_forge',
      'icon_house',
      'icon_gold',
      'icon_bcoin',
      'icon_avatar',
      'icon_heroes',
      'icon_shop',
      'icon_ranking',
      'icon_battle',
      'icon_base',
      'ui_panel', // Ensure UI panel exists
      'ui_button', // Ensure UI button exists
    ];

    uiIcons.forEach((key) => {
      if (!scene.textures.exists(key)) {
        // Try specific generators first
        switch (key) {
          case 'icon_settings':
            TextureGenerator.createIconSettings(scene, key);
            break;
          case 'icon_wallet':
            TextureGenerator.createIconWallet(scene, key);
            break;
          case 'icon_altar':
            TextureGenerator.createIconAltar(scene, key);
            break;
          case 'icon_book':
            TextureGenerator.createIconBook(scene, key);
            break;
          case 'icon_guild':
            TextureGenerator.createIconGuild(scene, key);
            break;
          case 'icon_forge':
            TextureGenerator.createIconForge(scene, key);
            break;
          case 'icon_house':
            TextureGenerator.createIconBase(scene, key);
            break;
          case 'icon_gold':
            TextureGenerator.createIconGold(scene, key);
            break;
          case 'icon_bcoin':
            TextureGenerator.createIconBcoin(scene, key);
            break;
          case 'icon_avatar':
            TextureGenerator.createAvatar(scene, key);
            break;
          case 'icon_heroes':
            TextureGenerator.createIconHeroes(scene, key);
            break;
          case 'icon_shop':
            TextureGenerator.createIconShop(scene, key);
            break;
          case 'icon_ranking':
            TextureGenerator.createIconRanking(scene, key);
            break;
          case 'icon_battle':
            TextureGenerator.createIconBattle(scene, key);
            break;
          case 'icon_base':
            TextureGenerator.createIconBase(scene, key);
            break;
          case 'ui_panel':
            TextureGenerator.createUIPanel(scene, key);
            break;
          case 'ui_button':
            TextureGenerator.createButtonBackground(scene, key);
            break;
          default:
            // Generic Fallback
            console.warn(`⚠️ Missing UI Icon: ${key}. Generating generic fallback.`);
            TextureGenerator.createAsciiIcon(scene, key, '❓', 0xff00ff);
            break;
        }
      }
    });

    // 3. Critical Game Assets (Verify Only)
    const critical = ['bomb', 'explosion_sheet', 'enemy', 'ninja_hero', 'bg1', 'floor_grid'];
    critical.forEach((key) => {
      if (!scene.textures.exists(key)) {
        console.warn(`⚠️ Critical Asset Missing: ${key}. Generating fallback.`);
        if (key === 'bomb') TextureGenerator.createBomb(scene, 'bomb');
        if (key === 'enemy') TextureGenerator.createEnemy(scene, 'enemy');
        if (key === 'ninja_hero') TextureGenerator.createHero(scene, 'ninja_hero');
        if (key === 'explosion_sheet') TextureGenerator.createExplosion(scene, 'explosion_sheet');
        if (key === 'bg1') TextureGenerator.createGridBackground(scene, 'bg1');
        if (key === 'floor_grid') TextureGenerator.createGridBackground(scene, 'floor_grid');
      }
    });

    // 4. Ensure Particles Exist
    if (!scene.textures.exists('particle_pixel')) {
      console.log('✨ Generating Procedural Particles...');
      TextureGenerator.createParticles(scene);
    }

    // 5. Ensure Heart & Shadow
    if (!scene.textures.exists('heart_full')) {
        TextureGenerator.createHearts(scene);
    }
    if (!scene.textures.exists('shadow')) {
        TextureGenerator.createShadow(scene);
    }

    // 6. Shop Items
    const shopItems = ['item_chest', 'item_potion', 'item_gems'];
    shopItems.forEach(key => {
        if (!scene.textures.exists(key)) {
             if (key === 'item_chest') TextureGenerator.createChest(scene, key);
             else if (key === 'item_potion') TextureGenerator.createPotion(scene, key);
             else if (key === 'item_gems') TextureGenerator.createGemPack(scene, key);
        }
    });

    console.log('✅ AssetLoader: Asset verification complete.');
  }
}
