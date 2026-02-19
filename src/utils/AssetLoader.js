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
        'icon_settings', 'icon_wallet', 'icon_altar', 'icon_book',
        'icon_guild', 'icon_forge', 'icon_house', 'icon_gold', 'icon_bcoin',
        'icon_avatar'
    ];
    uiIcons.forEach(key => {
        if (!scene.textures.exists(key)) {
            // Capitalize first letter for label (e.g. icon_forge -> Forge -> FORG)
            // But TextureGenerator has specific methods, let's use them if possible.
            // Or generic mapping.
            switch(key) {
                case 'icon_settings': TextureGenerator.createIconSettings(scene, key); break;
                case 'icon_wallet': TextureGenerator.createIconWallet(scene, key); break;
                case 'icon_altar': TextureGenerator.createIconAltar(scene, key); break;
                case 'icon_book': TextureGenerator.createIconBook(scene, key); break;
                case 'icon_guild': TextureGenerator.createIconGuild(scene, key); break;
                case 'icon_forge': TextureGenerator.createIconForge(scene, key); break;
                case 'icon_house': TextureGenerator.createGeometricIcon(scene, key, 'HOUSE', 0x00ffff); break;
                case 'icon_gold': TextureGenerator.createIconGold(scene, key); break;
                case 'icon_bcoin': TextureGenerator.createIconBcoin(scene, key); break;
                case 'icon_avatar': TextureGenerator.createAvatar(scene, key); break;
            }
        }
    });

    // 3. Critical Game Assets (Verify Only)
    const critical = ['bomb', 'explosion', 'enemy', 'ninja_hero'];
    critical.forEach(key => {
        if (!scene.textures.exists(key)) {
            console.warn(`⚠️ Critical Asset Missing: ${key}. Generating fallback.`);
             if (key === 'bomb') TextureGenerator.createBomb(scene, 'bomb');
             if (key === 'enemy') TextureGenerator.createEnemy(scene, 'enemy');
             if (key === 'ninja_hero') TextureGenerator.createHero(scene, 'ninja_hero');
        }
    });

    console.log('✅ AssetLoader: Asset verification complete.');
  }
}
