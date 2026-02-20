export default class TextureGenerator {
  /**
   * Generates a neon/minimalist hero texture.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createHero(scene, key) {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Body: Cyan Rectangle (Neon Style)
    graphics.fillStyle(0x00ffff);
    graphics.fillRect(4, 4, 24, 24);

    // Headband/Eyes: Black Strip
    graphics.fillStyle(0x000000);
    graphics.fillRect(4, 10, 24, 6);

    graphics.generateTexture(key, 32, 32);
    console.log(`✅ Generated procedural HERO: ${key}`);
  }

  /**
   * Generates a neon/minimalist enemy texture.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createEnemy(scene, key) {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Body: Red Square
    graphics.fillStyle(0xff0000);
    graphics.fillRect(4, 4, 24, 24);

    // Eyes: Aggressive White Eyes (Slanted)
    graphics.fillStyle(0xffffff);
    // Left Eye
    graphics.beginPath();
    graphics.moveTo(6, 8);
    graphics.lineTo(12, 10);
    graphics.lineTo(12, 6);
    graphics.fill();
    // Right Eye
    graphics.beginPath();
    graphics.moveTo(26, 8);
    graphics.lineTo(20, 10);
    graphics.lineTo(20, 6);
    graphics.fill();

    graphics.generateTexture(key, 32, 32);
    console.log(`✅ Generated procedural ENEMY: ${key}`);
  }

  /**
   * Generates a neon/minimalist bomb texture.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createBomb(scene, key) {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Body: Black Circle
    graphics.fillStyle(0x000000);
    graphics.fillCircle(16, 16, 12);

    // Border: Pulsing Red (Static here, animated via tween in game)
    graphics.lineStyle(2, 0xff0000);
    graphics.strokeCircle(16, 16, 12);

    // Fuse: White line
    graphics.lineStyle(2, 0xffffff);
    graphics.beginPath();
    graphics.moveTo(16, 4);
    graphics.lineTo(16, 0); // Straight up
    graphics.stroke();

    // Spark at tip (Orange)
    graphics.fillStyle(0xffa500);
    graphics.fillCircle(16, 0, 2);

    graphics.generateTexture(key, 32, 32);
    console.log(`✅ Generated procedural BOMB: ${key}`);
  }

  /**
   * Generates a procedural Soft Block (Destructible - Brick).
   * @param {Phaser.Scene} scene
   */
  static createSoftBlock(scene) {
    if (scene.textures.exists('soft_block')) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Base Brown
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(0, 0, 32, 32);

    // Inner Lighter Brown (Bevel)
    graphics.fillStyle(0xA0522D);
    graphics.fillRect(2, 2, 28, 28);

    // Brick Pattern Lines
    graphics.lineStyle(2, 0x654321);
    graphics.moveTo(0, 16);
    graphics.lineTo(32, 16);
    graphics.moveTo(16, 0);
    graphics.lineTo(16, 16);
    graphics.moveTo(8, 16);
    graphics.lineTo(8, 32);
    graphics.moveTo(24, 16);
    graphics.lineTo(24, 32);
    graphics.strokePath();

    graphics.generateTexture('soft_block', 32, 32);
    console.log('✅ Generated procedural SOFT BLOCK');
  }

  /**
   * Generates a procedural Hard Block (Indestructible - Metal).
   * @param {Phaser.Scene} scene
   */
  static createHardBlock(scene) {
    if (scene.textures.exists('hard_block')) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Base Dark Grey
    graphics.fillStyle(0x444444);
    graphics.fillRect(0, 0, 32, 32);

    // Rivets (Corners)
    graphics.fillStyle(0x888888);
    graphics.fillCircle(4, 4, 2);
    graphics.fillCircle(28, 4, 2);
    graphics.fillCircle(4, 28, 2);
    graphics.fillCircle(28, 28, 2);

    // Cross Brace
    graphics.lineStyle(2, 0x222222);
    graphics.moveTo(0, 0);
    graphics.lineTo(32, 32);
    graphics.moveTo(32, 0);
    graphics.lineTo(0, 32);
    graphics.strokePath();

    // Border
    graphics.lineStyle(2, 0x888888);
    graphics.strokeRect(0, 0, 32, 32);

    graphics.generateTexture('hard_block', 32, 32);
    console.log('✅ Generated procedural HARD BLOCK');
  }

  /**
   * Generates a dynamic explosion sprite sheet.
   * 5 frames of orange circles expanding and fading.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createExplosion(scene, key = 'explosion_sheet') {
    if (scene.textures.exists(key)) return;

    // 5 frames, 32x32 each -> 160x32 texture
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Frame 1: Small start
    graphics.fillStyle(0xffa500); // Orange
    graphics.fillCircle(16, 16, 4);

    // Frame 2: Expanding
    graphics.fillStyle(0xffa500);
    graphics.fillCircle(32 + 16, 16, 8);

    // Frame 3: Peak
    graphics.fillStyle(0xffa500);
    graphics.fillCircle(64 + 16, 16, 14);
    graphics.fillStyle(0xffffff); // Core
    graphics.fillCircle(64 + 16, 16, 6);

    // Frame 4: Fading/Breaking
    graphics.fillStyle(0xff4500); // Red-Orange
    graphics.fillCircle(96 + 16, 16, 12);
    // "Holes" via erase (or just dark spots since we can't erase easily on shared context without blend modes)
    graphics.fillStyle(0x000000);
    graphics.fillCircle(96 + 16, 16, 4);

    // Frame 5: Gone/Dust
    graphics.fillStyle(0x555555); // Grey dust
    graphics.fillCircle(128 + 12, 12, 2);
    graphics.fillCircle(128 + 20, 20, 2);
    graphics.fillCircle(128 + 8, 24, 1);
    graphics.fillCircle(128 + 24, 8, 1);

    graphics.generateTexture(key, 160, 32);
    console.log(`✅ Generated procedural EXPLOSION sprite sheet: ${key}`);
  }

  /**
   * Generates a neon purple cyberpunk floor grid.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createGridBackground(scene, key) {
    if (scene.textures.exists(key)) return;

    const width = 800;
    const height = 600;
    const gridSize = 40;
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Base: Dark Purple/Black
    graphics.fillStyle(0x050011);
    graphics.fillRect(0, 0, width, height);

    // Grid Lines: Neon Purple
    graphics.lineStyle(1, 0xbf00ff, 0.5); // Color, Alpha

    // Vertical Lines
    for (let x = 0; x <= width; x += gridSize) {
        graphics.beginPath();
        graphics.moveTo(x, 0);
        graphics.lineTo(x, height);
        graphics.stroke();
    }

    // Horizontal Lines
    for (let y = 0; y <= height; y += gridSize) {
        graphics.beginPath();
        graphics.moveTo(0, y);
        graphics.lineTo(width, y);
        graphics.stroke();
    }

    // Horizon Glow (Top) - Optional Cyberpunk touch
    graphics.fillGradientStyle(0xbf00ff, 0xbf00ff, 0x050011, 0x050011, 0.2);
    graphics.fillRect(0, 0, width, height / 3);

    graphics.generateTexture(key, width, height);
    console.log(`✅ Generated procedural GRID BACKGROUND: ${key}`);
  }

  /**
   * Generates a simple placeholder background (Legacy/Solid Color).
   * @param {Phaser.Scene} scene
   * @param {string} key
   * @param {number} color
   */
  static createBackground(scene, key, color = 0x000033) {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(color);
    graphics.fillRect(0, 0, 800, 600); // Default size, will scale
    graphics.lineStyle(4, 0x00ffff, 0.2);
    graphics.strokeRect(0, 0, 800, 600);

    graphics.generateTexture(key, 800, 600);
    console.log(`✅ Generated procedural texture for background: ${key}`);
  }

  static createHearts(scene) {
    if (scene.textures.exists('heart_full')) return;

    // Heart Full (16x16)
    const heartGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    heartGraphics.fillStyle(0xff0000);
    heartGraphics.fillRect(2, 2, 5, 5);
    heartGraphics.fillRect(9, 2, 5, 5);
    heartGraphics.fillRect(0, 5, 16, 6);
    heartGraphics.fillRect(2, 11, 12, 2);
    heartGraphics.fillRect(4, 13, 8, 2);
    heartGraphics.fillRect(6, 15, 4, 1);
    heartGraphics.generateTexture('heart_full', 16, 16);

    // Heart Empty (Gray outline)
    const emptyHeartGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    emptyHeartGraphics.fillStyle(0x444444);
    emptyHeartGraphics.fillRect(2, 2, 5, 5);
    emptyHeartGraphics.fillRect(9, 2, 5, 5);
    emptyHeartGraphics.fillRect(0, 5, 16, 6);
    emptyHeartGraphics.fillRect(2, 11, 12, 2);
    emptyHeartGraphics.fillRect(4, 13, 8, 2);
    emptyHeartGraphics.fillRect(6, 15, 4, 1);
    emptyHeartGraphics.generateTexture('heart_empty', 16, 16);
  }

  static createShadow(scene) {
    if (scene.textures.exists('shadow')) return;
    const shadowGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    shadowGraphics.fillStyle(0x000000, 0.4);
    shadowGraphics.fillEllipse(16, 8, 30, 10);
    shadowGraphics.generateTexture('shadow', 32, 16);
  }

  static createParticles(scene) {
    if (scene.textures.exists('particle_pixel')) return;

    const particleGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    particleGraphics.fillStyle(0xffffff);
    particleGraphics.fillRect(0, 0, 4, 4);
    particleGraphics.generateTexture('particle_pixel', 4, 4);

    const smokeGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    smokeGraphics.fillStyle(0x888888, 0.5);
    smokeGraphics.fillRect(0, 0, 6, 6);
    smokeGraphics.generateTexture('particle_smoke', 6, 6);
  }

  // ==================================================================================
  // PRAGMATIC VISUAL FIX (Geometric + Text)
  // ==================================================================================

  /**
   * Helper to generate a simple geometric icon with text.
   * @param {Phaser.Scene} scene
   * @param {string} key
   * @param {string} label (Max 3 chars if possible)
   * @param {number} color
   */
  static createGeometricIcon(scene, key, label, color) {
    if (scene.textures.exists(key)) return;

    const size = 64;
    const rt = scene.make.renderTexture({ width: size, height: size }, false);

    const bg = scene.make.graphics({ add: false });

    // Background Shape (Circle/Hexagon-ish)
    bg.fillStyle(color, 1.0); // Solid color
    bg.fillCircle(size/2, size/2, size/2 - 4);

    // Border
    bg.lineStyle(4, 0xffffff, 1.0);
    bg.strokeCircle(size/2, size/2, size/2 - 4);

    rt.draw(bg, 0, 0);

    // Text Label (High Contrast)
    // Using simple font available everywhere
    const text = scene.make.text(size/2, size/2, label, {
        fontSize: '20px',
        align: 'center',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#000000' // Black text on colored bg
    }).setOrigin(0.5);

    rt.draw(text, size/2, size/2);

    rt.saveTexture(key);

    bg.destroy();
    text.destroy();
    rt.destroy();
  }

  static createIconBase(scene, key) {
    this.createGeometricIcon(scene, key, 'BASE', 0x00FFFF);
  }

  static createIconHeroes(scene, key) {
    this.createGeometricIcon(scene, key, 'HERO', 0x00FFFF);
  }

  static createIconBattle(scene, key) {
    this.createGeometricIcon(scene, key, 'PLAY', 0xFFFF00);
  }

  static createIconShop(scene, key) {
    this.createGeometricIcon(scene, key, 'SHOP', 0x00FF00);
  }

  static createIconRanking(scene, key) {
    this.createGeometricIcon(scene, key, 'RANK', 0x00FFFF);
  }

  static createIconForge(scene, key) {
    this.createGeometricIcon(scene, key, 'FORG', 0xFF4500);
  }

  static createIconGold(scene, key) {
    this.createGeometricIcon(scene, key, '$$$', 0xFFD700);
  }

  static createIconBcoin(scene, key) {
    this.createGeometricIcon(scene, key, 'B', 0x00FFFF);
  }

  static createIconSettings(scene, key) {
    this.createGeometricIcon(scene, key, 'SET', 0xAAAAAA);
  }

  static createIconWallet(scene, key) {
    this.createGeometricIcon(scene, key, 'WAL', 0xCD7F32);
  }

  static createIconBook(scene, key) {
    this.createGeometricIcon(scene, key, 'BOOK', 0xDC143C);
  }

  static createIconGuild(scene, key) {
    this.createGeometricIcon(scene, key, 'GLD', 0xFF00FF);
  }

  static createIconAltar(scene, key) {
    this.createGeometricIcon(scene, key, 'ALT', 0xFFD700);
  }

  static createAvatar(scene, key) {
     this.createGeometricIcon(scene, key, 'YOU', 0xCCCCCC);
  }

  static createChest(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Box
    g.fillStyle(0x8B4513);
    g.fillRect(4, 10, 24, 16);
    // Lid (Arc)
    g.fillStyle(0xA0522D);
    g.beginPath();
    g.arc(16, 10, 12, Math.PI, 0);
    g.fill();
    // Gold Bands
    g.fillStyle(0xFFD700);
    g.fillRect(14, 10, 4, 16); // Vertical lock strip
    g.fillRect(4, 10, 24, 2); // Lid seam
    g.generateTexture(key, 32, 32);
  }

  static createPotion(scene, key) {
    // Reuse but fill
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFF00FF);
    g.beginPath();
    g.arc(16, 20, 10, 0, Math.PI * 2);
    g.fill();
    g.fillRect(12, 4, 8, 8);
    g.fillStyle(0xFFFFFF);
    g.fillCircle(12, 16, 3);
    g.generateTexture(key, 32, 32);
  }

  static createGemPack(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Gem 1
    g.fillStyle(0x00FFFF); // Cyan
    g.beginPath();
    g.moveTo(16, 4);
    g.lineTo(24, 12);
    g.lineTo(16, 20);
    g.lineTo(8, 12);
    g.fill();
    g.generateTexture(key, 32, 32);
  }

  /**
   * Generates a 9-slice compatible UI Panel (32x32).
   * Outer 2px Border (White), Inner 28x28 Center (Black).
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createUIPanel(scene, key = 'ui_panel') {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // 1. Fill Black Center
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(2, 2, 28, 28);

    // 2. Draw White Border (for Tinting)
    graphics.fillStyle(0xffffff, 1);
    // Top
    graphics.fillRect(0, 0, 32, 2);
    // Bottom
    graphics.fillRect(0, 30, 32, 2);
    // Left
    graphics.fillRect(0, 0, 2, 32);
    // Right
    graphics.fillRect(30, 0, 2, 32);

    // 3. Cyberpunk Corners (Extra pixels)
    graphics.fillRect(2, 2, 4, 2);
    graphics.fillRect(2, 2, 2, 4);

    graphics.fillRect(26, 2, 4, 2);
    graphics.fillRect(28, 2, 2, 4);

    graphics.fillRect(2, 28, 4, 2);
    graphics.fillRect(2, 26, 2, 4);

    graphics.fillRect(26, 28, 4, 2);
    graphics.fillRect(28, 26, 2, 4);

    graphics.generateTexture(key, 32, 32);
    console.log(`✅ Generated procedural UI PANEL: ${key}`);
  }

  /**
   * Generates a generic button background (32x32).
   * Filled White for full tinting.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createButtonBackground(scene, key = 'ui_button') {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Fill White
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 32, 32);

    // Inner bevel/shadow for depth (Grey)
    graphics.fillStyle(0xcccccc, 1);
    graphics.fillRect(2, 2, 28, 28);

    // Center lighter
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(4, 4, 24, 24);

    graphics.generateTexture(key, 32, 32);
    console.log(`✅ Generated procedural BUTTON BG: ${key}`);
  }

  // --- NEW RPG ITEMS ---

  static createRustySword(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Blade (Grey Line)
    g.lineStyle(4, 0x888888);
    g.beginPath();
    g.moveTo(8, 24);
    g.lineTo(24, 8);
    g.stroke();
    // Handle (Brown)
    g.lineStyle(4, 0x8B4513);
    g.beginPath();
    g.moveTo(6, 26);
    g.lineTo(10, 22);
    g.stroke();
    g.generateTexture(key, 32, 32);
  }

  static createIronKatana(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Blade (Silver/White)
    g.lineStyle(2, 0xCCCCCC);
    g.beginPath();
    g.moveTo(8, 24);
    g.lineTo(28, 4);
    g.stroke();
    // Handle (Black)
    g.lineStyle(4, 0x000000);
    g.beginPath();
    g.moveTo(6, 26);
    g.lineTo(10, 22);
    g.stroke();
    g.generateTexture(key, 32, 32);
  }

  static createLeatherVest(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x8B4513); // Brown
    g.fillRect(8, 8, 16, 20);
    // Neck cutout
    g.fillStyle(0xA0522D);
    g.fillRect(10, 10, 12, 16);
    g.generateTexture(key, 32, 32);
  }

  static createNanoVest(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00FFFF); // Cyan
    g.fillRect(8, 8, 16, 20);
    g.lineStyle(2, 0xFFFFFF);
    g.strokeRect(8, 8, 16, 20);
    g.generateTexture(key, 32, 32);
  }

  static createNeonBoots(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xFF00FF); // Neon Pink
    // Left Boot
    g.fillRect(8, 16, 6, 12);
    g.fillRect(8, 28, 8, 4);
    // Right Boot
    g.fillRect(20, 16, 6, 12);
    g.fillRect(20, 28, 8, 4);
    g.generateTexture(key, 32, 32);
  }

  static createHealthPotion(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    // Flask
    g.fillStyle(0xFF0000); // Red
    g.fillCircle(16, 20, 8);
    // Neck
    g.fillRect(14, 8, 4, 6);
    g.fillStyle(0xFFFFFF); // Shine
    g.fillCircle(14, 18, 2);
    g.generateTexture(key, 32, 32);
  }

  static createScrap(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x555555); // Grey
    // Random jagged shapes
    g.beginPath();
    g.moveTo(10, 10);
    g.lineTo(20, 8);
    g.lineTo(24, 16);
    g.lineTo(18, 24);
    g.lineTo(8, 20);
    g.closePath();
    g.fill();
    g.generateTexture(key, 32, 32);
  }

  static createCyberCore(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x0000FF); // Blue Core
    g.fillCircle(16, 16, 10);
    g.lineStyle(2, 0x00FFFF); // Cyan Glow
    g.strokeCircle(16, 16, 10);
    g.lineStyle(1, 0xFFFFFF);
    g.strokeCircle(16, 16, 6);
    g.generateTexture(key, 32, 32);
  }

  /**
   * Helper to generate all common missing assets.
   * @param {Phaser.Scene} scene
   */
  static generate(scene) {
    try {
      // Heroes
      this.createHero(scene, 'ninja');
      this.createHero(scene, 'ninja_hero'); // Alias/Same style
      this.createHero(scene, 'witch');      // Reusing hero style (or could make variation)
      this.createHero(scene, 'witch_hero'); // Alias

      // Mobs/Items
      this.createEnemy(scene, 'enemy');
      this.createBomb(scene, 'bomb');
      this.createExplosion(scene, 'explosion_sheet'); // Updated Key

      // Backgrounds
      this.createGridBackground(scene, 'bg1');
      this.createGridBackground(scene, 'floor_grid');

      // UI Icons
      this.createIconBase(scene, 'icon_base');
      this.createIconHeroes(scene, 'icon_heroes');
      this.createIconBattle(scene, 'icon_battle');
      this.createIconShop(scene, 'icon_shop');
      this.createIconRanking(scene, 'icon_ranking');
      this.createIconForge(scene, 'icon_forge');
      this.createIconGold(scene, 'icon_gold');
      this.createIconBcoin(scene, 'icon_bcoin');
      this.createIconSettings(scene, 'icon_settings');
      this.createIconWallet(scene, 'icon_wallet');
      this.createIconBook(scene, 'icon_book');
      this.createIconGuild(scene, 'icon_guild');
      this.createIconAltar(scene, 'icon_altar');
      this.createAvatar(scene, 'icon_avatar');

      // Shop Items
      this.createChest(scene, 'item_chest');
      this.createPotion(scene, 'item_potion');
      this.createGemPack(scene, 'item_gems');

      // New RPG Items
      this.createRustySword(scene, 'item_rusty_sword');
      this.createIronKatana(scene, 'item_iron_katana');
      this.createLeatherVest(scene, 'item_leather_vest');
      this.createNanoVest(scene, 'item_nano_vest');
      this.createNeonBoots(scene, 'item_neon_boots');
      this.createHealthPotion(scene, 'item_health_potion');
      this.createScrap(scene, 'item_scrap');
      this.createCyberCore(scene, 'item_cyber_core');

      // UI Assets (Task Force Step 3)
      this.createUIPanel(scene, 'ui_panel');
      this.createButtonBackground(scene, 'ui_button');

      // Additional assets needed for full game functionality
      this.createHearts(scene);
      this.createShadow(scene);
      this.createParticles(scene);
    } catch (e) {
      console.warn('⚠️ TextureGenerator: Failed to generate procedural assets.', e);
    }
  }
}
