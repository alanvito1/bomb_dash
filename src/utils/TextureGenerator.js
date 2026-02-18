export default class TextureGenerator {
  static generate(scene) {
    // Check if textures already exist to avoid recreation
    if (scene.textures.exists('explosion_sheet')) return;

    // 1. Explosion Sprite Sheet (64x16 - 4 frames of 16x16)
    // We will use 4 frames. Ideally this should be a proper spritesheet.
    const explosionGraphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // Frame 1: Small center (White) at x=0
    explosionGraphics.fillStyle(0xffffff);
    explosionGraphics.fillRect(6, 6, 4, 4);

    // Frame 2: Expanding (Yellow) at x=16
    explosionGraphics.fillStyle(0xffff00);
    explosionGraphics.fillRect(16 + 4, 4, 8, 8);
    explosionGraphics.fillRect(16 + 2, 6, 12, 4);
    explosionGraphics.fillRect(16 + 6, 2, 4, 12);

    // Frame 3: Big (Orange) at x=32
    explosionGraphics.fillStyle(0xffa500);
    explosionGraphics.fillRect(32 + 2, 2, 12, 12);
    explosionGraphics.fillRect(32 + 0, 4, 16, 8);
    explosionGraphics.fillRect(32 + 4, 0, 8, 16);

    // Frame 4: Dissipating (Red/Grey) at x=48
    explosionGraphics.fillStyle(0xff4500);
    explosionGraphics.fillRect(48 + 0, 0, 16, 16);
    explosionGraphics.fillStyle(0x222222); // Holes
    explosionGraphics.fillRect(48 + 4, 4, 2, 2);
    explosionGraphics.fillRect(48 + 10, 10, 2, 2);
    explosionGraphics.fillRect(48 + 2, 12, 2, 2);
    explosionGraphics.fillRect(48 + 12, 2, 2, 2);

    explosionGraphics.generateTexture('explosion_sheet', 64, 16);

    // 2. Heart Icons (16x16)
    const heartGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    heartGraphics.fillStyle(0xff0000);
    // Draw a simple pixel heart shape
    heartGraphics.fillRect(2, 2, 5, 5);
    heartGraphics.fillRect(9, 2, 5, 5);
    heartGraphics.fillRect(0, 5, 16, 6);
    heartGraphics.fillRect(2, 11, 12, 2);
    heartGraphics.fillRect(4, 13, 8, 2);
    heartGraphics.fillRect(6, 15, 4, 1);
    heartGraphics.generateTexture('heart_full', 16, 16);

    // Empty Heart (Gray outline)
    const emptyHeartGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    emptyHeartGraphics.fillStyle(0x444444);
    emptyHeartGraphics.fillRect(2, 2, 5, 5);
    emptyHeartGraphics.fillRect(9, 2, 5, 5);
    emptyHeartGraphics.fillRect(0, 5, 16, 6);
    emptyHeartGraphics.fillRect(2, 11, 12, 2);
    emptyHeartGraphics.fillRect(4, 13, 8, 2);
    emptyHeartGraphics.fillRect(6, 15, 4, 1);
    // Cut out center to make it look empty
    emptyHeartGraphics.fillStyle(0x000000); // Assuming black background or transparent logic needed?
    // Actually, let's just make it dark gray for "empty slot"
    emptyHeartGraphics.generateTexture('heart_empty', 16, 16);

    // 3. Shadow (Ellipse)
    const shadowGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    shadowGraphics.fillStyle(0x000000, 0.4);
    shadowGraphics.fillEllipse(16, 8, 30, 10);
    shadowGraphics.generateTexture('shadow', 32, 16);

    // 4. Particles
    const particleGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    particleGraphics.fillStyle(0xffffff);
    particleGraphics.fillRect(0, 0, 4, 4);
    particleGraphics.generateTexture('particle_pixel', 4, 4);

    const smokeGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    smokeGraphics.fillStyle(0x888888, 0.5);
    smokeGraphics.fillRect(0, 0, 6, 6);
    smokeGraphics.generateTexture('particle_smoke', 6, 6);

    console.log('✅ TextureGenerator: Generated pixel art textures.');
  }
}
