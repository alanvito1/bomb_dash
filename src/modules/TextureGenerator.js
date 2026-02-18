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

    // Eyes: White dots (optional, for "ninja" look)
    // The prompt says "Um retângulo Ciano com uma faixa preta (olhos)."
    // I'll stick to the minimalist instruction strictly.

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
   * Generates a dynamic explosion sprite sheet.
   * 5 frames of orange circles expanding and fading.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createExplosion(scene, key = 'explosion') {
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

  static createIconBase(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff);
    // House shape
    g.beginPath();
    g.moveTo(16, 6);
    g.lineTo(28, 16);
    g.lineTo(28, 28);
    g.lineTo(4, 28);
    g.lineTo(4, 16);
    g.closePath();
    g.fill();
    g.generateTexture(key, 32, 32);
  }

  static createIconHeroes(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff);
    // Backpack shape
    g.fillRoundedRect(6, 8, 20, 20, 4);
    // Flap
    g.fillStyle(0xcccccc);
    g.fillRoundedRect(6, 8, 20, 8, 2);
    g.generateTexture(key, 32, 32);
  }

  static createIconBattle(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, 0xffffff);
    // Sword 1
    g.beginPath();
    g.moveTo(8, 24);
    g.lineTo(24, 8);
    g.stroke();
    // Sword 2
    g.beginPath();
    g.moveTo(24, 24);
    g.lineTo(8, 8);
    g.stroke();
    g.generateTexture(key, 32, 32);
  }

  static createIconShop(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff);
    // Cart body
    g.fillRect(8, 10, 18, 12);
    // Wheels
    g.fillCircle(10, 24, 2);
    g.fillCircle(24, 24, 2);
    // Handle
    g.lineStyle(2, 0xffffff);
    g.beginPath();
    g.moveTo(4, 8);
    g.lineTo(8, 10);
    g.stroke();
    g.generateTexture(key, 32, 32);
  }

  static createIconRanking(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffd700); // Gold
    // Trophy cup
    g.beginPath();
    g.moveTo(8, 8);
    g.lineTo(24, 8);
    g.lineTo(20, 20);
    g.lineTo(16, 20);
    g.lineTo(12, 20);
    g.lineTo(8, 8);
    g.fill();
    // Base
    g.fillRect(14, 20, 4, 4);
    g.fillRect(10, 24, 12, 2);
    g.generateTexture(key, 32, 32);
  }

  static createIconGold(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffd700);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xffaa00);
    g.fillCircle(16, 16, 8);
    g.generateTexture(key, 32, 32);
  }

  static createIconBcoin(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x00ffff); // Cyan/Neon
    g.fillCircle(16, 16, 12);
    g.fillStyle(0x000033);
    g.fillCircle(16, 16, 8);
    // B letter (simplified)
    g.fillStyle(0xffffff);
    g.fillRect(14, 10, 2, 12);
    g.fillRect(14, 10, 6, 2);
    g.fillRect(14, 15, 6, 2);
    g.fillRect(14, 20, 6, 2);
    g.generateTexture(key, 32, 32);
  }

  static createIconSettings(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, 0xffffff);
    g.strokeCircle(16, 16, 8);
    // Cogs
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = 16 + Math.cos(angle) * 8;
        const y1 = 16 + Math.sin(angle) * 8;
        const x2 = 16 + Math.cos(angle) * 12;
        const y2 = 16 + Math.sin(angle) * 12;
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
    }
    g.generateTexture(key, 32, 32);
  }

  static createIconWallet(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x8B4513); // Brown leather
    g.fillRoundedRect(4, 8, 24, 16, 2);
    // Flap
    g.fillStyle(0xA0522D);
    g.fillRoundedRect(4, 10, 12, 12, 2);
    g.generateTexture(key, 32, 32);
  }

  static createAvatar(scene, key) {
     if (scene.textures.exists(key)) return;
     const g = scene.make.graphics({ x: 0, y: 0, add: false });
     g.fillStyle(0x333333);
     g.fillCircle(16, 16, 16);
     g.fillStyle(0xcccccc);
     g.fillCircle(16, 12, 6); // Head
     // Shoulders
     g.beginPath();
     g.arc(16, 32, 12, Math.PI, 0);
     g.fill();
     g.generateTexture(key, 32, 32);
  }

  /**
   * Helper to generate all common missing assets.
   * @param {Phaser.Scene} scene
   */
  static generate(scene) {
    // Heroes
    this.createHero(scene, 'ninja');
    this.createHero(scene, 'ninja_hero'); // Alias/Same style
    this.createHero(scene, 'witch');      // Reusing hero style (or could make variation)
    this.createHero(scene, 'witch_hero'); // Alias

    // Mobs/Items
    this.createEnemy(scene, 'enemy');
    this.createBomb(scene, 'bomb');
    this.createExplosion(scene, 'explosion');

    // Backgrounds
    this.createGridBackground(scene, 'bg1');
    this.createGridBackground(scene, 'floor_grid');

    // UI Icons
    this.createIconBase(scene, 'icon_base');
    this.createIconHeroes(scene, 'icon_heroes');
    this.createIconBattle(scene, 'icon_battle');
    this.createIconShop(scene, 'icon_shop');
    this.createIconRanking(scene, 'icon_ranking');
    this.createIconGold(scene, 'icon_gold');
    this.createIconBcoin(scene, 'icon_bcoin');
    this.createIconSettings(scene, 'icon_settings');
    this.createIconWallet(scene, 'icon_wallet');
    this.createAvatar(scene, 'icon_avatar');

    // Additional assets needed for full game functionality
    this.createHearts(scene);
    this.createShadow(scene);
    this.createParticles(scene);
  }
}
