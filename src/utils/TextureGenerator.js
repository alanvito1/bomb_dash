export default class TextureGenerator {
  /**
   * Generates all "Game Juice" assets (particles, UI icons) if they don't exist.
   * @param {Phaser.Scene} scene
   */
  static generate(scene) {
    this.createExplosion(scene);
    this.createHearts(scene);
    this.createShadow(scene);
    this.createParticles(scene);
    console.log('✅ TextureGenerator: Generated common pixel art textures.');
  }

  static createExplosion(scene) {
    if (scene.textures.exists('explosion_sheet')) return;

    // 1. Explosion Sprite Sheet (64x16 - 4 frames of 16x16)
    const explosionGraphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Frame 1: Small center (White)
    explosionGraphics.fillStyle(0xffffff);
    explosionGraphics.fillRect(6, 6, 4, 4);

    // Frame 2: Expanding (Yellow)
    explosionGraphics.fillStyle(0xffff00);
    explosionGraphics.fillRect(20, 4, 8, 8); // x=16+4
    explosionGraphics.fillRect(18, 6, 12, 4); // x=16+2
    explosionGraphics.fillRect(22, 2, 4, 12); // x=16+6

    // Frame 3: Big (Orange)
    explosionGraphics.fillStyle(0xffa500);
    explosionGraphics.fillRect(34, 2, 12, 12); // x=32+2
    explosionGraphics.fillRect(32, 4, 16, 8); // x=32+0
    explosionGraphics.fillRect(36, 0, 8, 16); // x=32+4

    // Frame 4: Dissipating (Red/Grey)
    explosionGraphics.fillStyle(0xff4500);
    explosionGraphics.fillRect(48, 0, 16, 16); // x=48
    explosionGraphics.fillStyle(0x222222); // Holes
    explosionGraphics.fillRect(52, 4, 2, 2);
    explosionGraphics.fillRect(58, 10, 2, 2);
    explosionGraphics.fillRect(50, 12, 2, 2);
    explosionGraphics.fillRect(60, 2, 2, 2);

    explosionGraphics.generateTexture('explosion_sheet', 64, 16);
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

  // --- New Procedural Assets for Missing Files ---

  /**
   * Generates a Cyan placeholder hero (Ninja/Witch).
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createHero(scene, key) {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Body (Cyan)
    graphics.fillStyle(0x00ffff);
    graphics.fillRect(4, 4, 24, 24);

    // Headband (Dark Blue)
    graphics.fillStyle(0x000088);
    graphics.fillRect(4, 8, 24, 6);

    // Eyes (Black)
    graphics.fillStyle(0x000000);
    graphics.fillRect(8, 10, 4, 2);
    graphics.fillRect(20, 10, 4, 2);

    graphics.generateTexture(key, 32, 32);
    console.log(`✅ Generated procedural texture for hero: ${key}`);
  }

  /**
   * Generates a Red placeholder enemy.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createEnemy(scene, key) {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Body (Red)
    graphics.fillStyle(0xff0000);
    graphics.fillRect(4, 4, 24, 24);

    // Angry Eyes (Black)
    graphics.fillStyle(0x000000);
    // Left Eye
    graphics.beginPath();
    graphics.moveTo(6, 8);
    graphics.lineTo(12, 12);
    graphics.lineTo(12, 8);
    graphics.fill();

    // Right Eye
    graphics.beginPath();
    graphics.moveTo(26, 8);
    graphics.lineTo(20, 12);
    graphics.lineTo(20, 8);
    graphics.fill();

    // Mouth (Grimace)
    graphics.fillRect(8, 20, 16, 4);
    graphics.fillStyle(0xffffff); // Teeth
    graphics.fillRect(10, 20, 2, 2);
    graphics.fillRect(14, 20, 2, 2);
    graphics.fillRect(18, 20, 2, 2);

    graphics.generateTexture(key, 32, 32);
    console.log(`✅ Generated procedural texture for enemy: ${key}`);
  }

  /**
   * Generates a Black pulsating bomb placeholder.
   * @param {Phaser.Scene} scene
   * @param {string} key
   */
  static createBomb(scene, key) {
    if (scene.textures.exists(key)) return;

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Bomb Body (Black)
    graphics.fillStyle(0x000000);
    graphics.fillCircle(16, 18, 12);

    // Shine (White)
    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillCircle(12, 14, 3);

    // Fuse (Orange)
    graphics.lineStyle(3, 0xffa500);
    graphics.beginPath();
    graphics.moveTo(16, 6);
    graphics.lineTo(16, 2);
    graphics.lineTo(20, 0);
    graphics.stroke();

    graphics.generateTexture(key, 32, 32);
    console.log(`✅ Generated procedural texture for bomb: ${key}`);
  }

  /**
   * Generates a simple placeholder background.
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
}
