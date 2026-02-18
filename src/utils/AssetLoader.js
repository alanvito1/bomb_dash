import TextureGenerator from './TextureGenerator.js';

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

    // 1. Critical Game Assets (Heroes, Enemies, Bombs)
    TextureGenerator.createHero(scene, 'ninja');
    TextureGenerator.createHero(scene, 'ninja_hero');
    TextureGenerator.createHero(scene, 'witch');
    TextureGenerator.createHero(scene, 'witch_hero');

    TextureGenerator.createEnemy(scene, 'enemy');
    TextureGenerator.createBomb(scene, 'bomb');

    // 2. Backgrounds
    TextureGenerator.createBackground(scene, 'bg1', 0x000033);
    TextureGenerator.createBackground(scene, 'menu_bg_vertical', 0x050011);

    // 3. Effects (Explosions, Hearts, Particles)
    TextureGenerator.generate(scene);

    console.log('✅ AssetLoader: Procedural asset check complete.');
  }
}
