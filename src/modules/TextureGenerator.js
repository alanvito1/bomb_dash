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

    // Additional assets needed for full game functionality
    this.createHearts(scene);
    this.createShadow(scene);
    this.createParticles(scene);
  }
}
