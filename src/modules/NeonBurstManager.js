export default class NeonBurstManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.emitter = this.createEmitter();
    this.lastExplosionTime = 0;
  }

  createEmitter() {
    if (!this.scene.textures.exists('particle_pixel')) {
      console.warn(
        'NeonBurstManager: particle_pixel texture missing. Aborting.'
      );
      return null;
    }

    const emitter = this.scene.add.particles(0, 0, 'particle_pixel', {
      lifespan: 600,
      speed: { min: 50, max: 200 },
      scale: { start: 2, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      gravityY: 0,
      blendMode: 'ADD',
      tint: 0xff5f1f, // Neon Orange
      emitting: false,
      maxParticles: 100, // Hard limit on active particles (culling)
    });

    return emitter;
  }

  /**
   * Triggers a neon burst explosion at the given coordinates.
   * @param {number} x
   * @param {number} y
   * @param {number} count - Number of particles (default 20)
   */
  explode(x, y, count = 20) {
    if (!this.emitter) return;

    const now = this.scene.time.now;

    // ⚡ Bolt Optimization: Throttle bursts
    // If multiple enemies die in the same frame (e.g., big explosion),
    // only show one burst to save GPU/CPU.
    if (now - this.lastExplosionTime < 50) {
      return;
    }

    // Cap particles per burst
    const safeCount = Math.min(count, 30);

    this.emitter.explode(safeCount, x, y);
    this.lastExplosionTime = now;
  }
}
