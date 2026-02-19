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

  // ==================================================================================
  // NEO-RETRO ICONS (Redesigned per User Specs)
  // ==================================================================================

  static createIconBase(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawHome = (graphics) => {
      // Roof: Cyberpunk Triangle (Floating)
      graphics.beginPath();
      graphics.moveTo(16, 4); // Top
      graphics.lineTo(28, 12); // Right
      graphics.lineTo(4, 12); // Left
      graphics.closePath();
      graphics.strokePath();

      // Body: Cyber Pentagonal Base
      graphics.beginPath();
      graphics.moveTo(6, 15); // Top Left
      graphics.lineTo(26, 15); // Top Right
      graphics.lineTo(26, 28); // Bottom Right
      graphics.lineTo(6, 28); // Bottom Left
      graphics.closePath();
      graphics.strokePath();

      // Door: Neon Entry
      graphics.beginPath();
      graphics.moveTo(12, 28);
      graphics.lineTo(12, 20);
      graphics.lineTo(20, 20);
      graphics.lineTo(20, 28);
      graphics.strokePath();
    };

    // Glow (Cyber Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawHome(g);

    // Core (White)
    g.lineStyle(2, 0xffffff, 1.0);
    drawHome(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconHeroes(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawHelmet = (graphics) => {
      // Helmet Dome
      graphics.beginPath();
      graphics.arc(16, 16, 10, Math.PI, 0, false); // Top half
      graphics.lineTo(26, 24); // Jaw Right
      graphics.lineTo(6, 24); // Jaw Left
      graphics.closePath();
      graphics.strokePath();

      // Visor (V Shape)
      graphics.beginPath();
      graphics.moveTo(10, 16);
      graphics.lineTo(16, 20);
      graphics.lineTo(22, 16);
      graphics.strokePath();
    };

    // Glow (Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawHelmet(g);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawHelmet(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconBattle(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Yellow for Action)
    g.fillStyle(0xFFFF00, 0.2);
    g.fillRect(0, 0, 32, 32);

    // Metallic Sword with Neon Edge
    const drawSword = (graphics, isGlow) => {
      // Blade
      graphics.beginPath();
      graphics.moveTo(16, 24); // Base
      graphics.lineTo(16, 4); // Tip
      graphics.strokePath();

      // Guard (Cross)
      graphics.beginPath();
      graphics.moveTo(8, 24);
      graphics.lineTo(24, 24);
      graphics.strokePath();

      // Hilt
      graphics.beginPath();
      graphics.moveTo(16, 24);
      graphics.lineTo(16, 30);
      graphics.strokePath();
    };

    // Glow (Yellow Neon) - Thicker
    g.lineStyle(4, 0xffff00, 0.8);
    drawSword(g, true);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawSword(g, false);

    g.generateTexture(key, 32, 32);
  }

  static createIconShop(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Green for Shop)
    g.fillStyle(0x00FF00, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawPotion = (graphics) => {
      // Round Flask
      graphics.beginPath();
      graphics.arc(16, 20, 8, 0, Math.PI * 2);
      graphics.strokePath();

      // Neck
      graphics.beginPath();
      graphics.moveTo(13, 13);
      graphics.lineTo(13, 8);
      graphics.lineTo(19, 8);
      graphics.lineTo(19, 13);
      graphics.strokePath();

      // Cork
      graphics.strokeRect(14, 6, 4, 2);
    };

    // Glow (Green Matrix) - Thicker
    g.lineStyle(4, 0x00ff00, 0.8);
    drawPotion(g);

    // Core (White)
    g.lineStyle(2, 0xffffff, 1.0);
    drawPotion(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconRanking(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Cyan for Navigation)
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawTrophy = (graphics) => {
      // Cup Body
      graphics.beginPath();
      graphics.arc(16, 8, 8, 0, Math.PI, false);
      graphics.closePath();
      graphics.strokePath();

      // Handles
      graphics.beginPath();
      graphics.moveTo(8, 10);
      graphics.lineTo(4, 12);
      graphics.lineTo(8, 16);
      graphics.moveTo(24, 10);
      graphics.lineTo(28, 12);
      graphics.lineTo(24, 16);
      graphics.strokePath();

      // Base
      graphics.beginPath();
      graphics.moveTo(16, 20);
      graphics.lineTo(16, 24);
      graphics.moveTo(10, 28);
      graphics.lineTo(22, 28);
      graphics.strokePath();
    };

    // Glow (Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawTrophy(g);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawTrophy(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconForge(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Cyan for Navigation)
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawAnvil = (graphics) => {
      // Top Flat
      graphics.strokeRect(6, 12, 20, 6);
      // Pointy End
      graphics.beginPath();
      graphics.moveTo(6, 12);
      graphics.lineTo(2, 14);
      graphics.lineTo(6, 18);
      graphics.strokePath();
      // Base
      graphics.beginPath();
      graphics.moveTo(10, 18);
      graphics.lineTo(4, 28);
      graphics.lineTo(28, 28);
      graphics.lineTo(22, 18);
      graphics.strokePath();
    };

    // Glow (Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawAnvil(g);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawAnvil(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconGold(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    const drawCoin = (graphics) => {
        graphics.strokeCircle(16, 16, 10);
        // $ Sign-ish
        graphics.beginPath();
        graphics.moveTo(16, 10);
        graphics.lineTo(16, 22);
        graphics.moveTo(14, 12);
        graphics.lineTo(18, 12);
        graphics.moveTo(14, 20);
        graphics.lineTo(18, 20);
        graphics.strokePath();
    };

    // Glow (Gold)
    g.lineStyle(3, 0xFFD700, 0.4);
    drawCoin(g);

    // Core
    g.lineStyle(1.5, 0xFFFFFF, 1.0);
    drawCoin(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconBcoin(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    const drawB = (graphics) => {
        graphics.strokeCircle(16, 16, 12);
        // B
        graphics.strokeRect(12, 10, 8, 12);
        graphics.beginPath();
        graphics.moveTo(12, 16);
        graphics.lineTo(20, 16);
        graphics.strokePath();
    };

    // Glow (Cyan)
    g.lineStyle(3, 0x00FFFF, 0.4);
    drawB(g);

    // Core
    g.lineStyle(1.5, 0xFFFFFF, 1.0);
    drawB(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconSettings(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Cyan)
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawGear = (graphics) => {
      graphics.strokeCircle(16, 16, 6);
      // Teeth
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x1 = 16 + Math.cos(angle) * 8;
        const y1 = 16 + Math.sin(angle) * 8;
        const x2 = 16 + Math.cos(angle) * 11;
        const y2 = 16 + Math.sin(angle) * 11;
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();
      }
    };

    // Glow (Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawGear(g);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawGear(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconWallet(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Cyan)
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawWallet = (graphics) => {
      graphics.strokeRoundedRect(6, 10, 20, 14, 2);
      // Flap
      graphics.beginPath();
      graphics.moveTo(6, 14);
      graphics.lineTo(26, 14);
      graphics.strokePath();
      // Button
      graphics.strokeCircle(22, 17, 2);
    };

    // Glow (Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawWallet(g);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawWallet(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconBook(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Cyan)
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawBook = (graphics) => {
      graphics.strokeRect(8, 6, 16, 20);
      // Cross or Symbol
      graphics.beginPath();
      graphics.moveTo(16, 10);
      graphics.lineTo(16, 22);
      graphics.moveTo(12, 16);
      graphics.lineTo(20, 16);
      graphics.strokePath();
    };

    // Glow (Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawBook(g);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawBook(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconGuild(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Cyan)
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawGuild = (graphics) => {
      // Flag/Banner
      graphics.beginPath();
      graphics.moveTo(6, 6);
      graphics.lineTo(26, 6);
      graphics.lineTo(26, 20);
      graphics.lineTo(16, 26);
      graphics.lineTo(6, 20);
      graphics.closePath();
      graphics.strokePath();

      // Inner G
      graphics.beginPath();
      graphics.moveTo(16, 12);
      graphics.lineTo(20, 12);
      graphics.moveTo(20, 12);
      graphics.arc(16, 16, 4, 0, Math.PI * 1.5, true);
      graphics.strokePath();
    };

    // Glow (Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawGuild(g);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawGuild(g);

    g.generateTexture(key, 32, 32);
  }

  static createIconAltar(scene, key) {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Background (Cyan)
    g.fillStyle(0x00FFFF, 0.2);
    g.fillRect(0, 0, 32, 32);

    const drawAltar = (graphics) => {
      // Base steps
      graphics.strokeRect(4, 24, 24, 4);
      graphics.strokeRect(8, 20, 16, 4);
      // Pillar
      graphics.strokeRect(10, 12, 12, 8);
      // Orb
      graphics.strokeCircle(16, 8, 4);
    };

    // Glow (Cyan) - Thicker
    g.lineStyle(4, 0x00ffff, 0.8);
    drawAltar(g);

    // Core
    g.lineStyle(2, 0xffffff, 1.0);
    drawAltar(g);

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
      this.createIconForge(scene, 'icon_forge'); // Added Forge
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

      // Additional assets needed for full game functionality
      this.createHearts(scene);
      this.createShadow(scene);
      this.createParticles(scene);
    } catch (e) {
      console.warn('⚠️ TextureGenerator: Failed to generate procedural assets.', e);
    }
  }
}
