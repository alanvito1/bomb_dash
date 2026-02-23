import SoundManager from '../utils/sound.js';

class ExplosionSprite extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'explosion_sheet');

    // Default state: inactive, invisible
    this.setActive(false);
    this.setVisible(false);

    // Bind deactivate to animation complete
    // Note: We use arrow function or bind to ensure 'this' context
    this.on('animationcomplete', () => {
        this.deactivate();
    });
  }

  fire(x, y, scale) {
    this.setPosition(x, y);
    this.setScale(scale);
    this.setActive(true);
    this.setVisible(true);

    // Ensure animation exists and play
    if (this.scene.anims.exists('explosion_anim')) {
        this.play('explosion_anim');
    } else {
        // Fallback or retry init? Should be handled by Manager.
        this.deactivate();
    }
  }

  deactivate() {
    this.setActive(false);
    this.setVisible(false);
  }
}

export default class ExplosionManager {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;

    // Initialize animation data
    this.initAnimation();

    // Create object pool
    this.pool = this.scene.add.group({
      classType: ExplosionSprite,
      maxSize: 20, // Limit simultaneous explosions
      runChildUpdate: false
    });
  }

  initAnimation() {
    if (!this.scene || !this.scene.anims) return;

    // Ensure animation exists
    if (!this.scene.anims.exists('explosion_anim')) {
      if (!this.scene.textures.exists('explosion_sheet')) {
        console.warn(
          '[ExplosionManager] Texture "explosion_sheet" missing. Skipping effect setup.'
        );
        return;
      }

      const texture = this.scene.textures.get('explosion_sheet');

      // If the texture was generated but acts as a single frame, slice it.
      if (texture && texture.frameTotal === 1) {
        const frameWidth = 32;
        const frameHeight = 32;
        // We know it's 160x32 (5 frames)
        for (let i = 0; i < 5; i++) {
          texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
        }
      }

      this.scene.anims.create({
        key: 'explosion_anim',
        frames: [
          { key: 'explosion_sheet', frame: 0 },
          { key: 'explosion_sheet', frame: 1 },
          { key: 'explosion_sheet', frame: 2 },
          { key: 'explosion_sheet', frame: 3 },
          { key: 'explosion_sheet', frame: 4 },
        ],
        frameRate: 20,
        repeat: 0,
        hideOnComplete: false, // We handle hiding manually in sprite
      });
    }
  }

  spawn(x, y, scale = 2) {
    // Get from pool
    const explosion = this.pool.get(x, y);

    if (!explosion) return; // Pool exhausted

    explosion.fire(x, y, scale);

    // Throttled Shake
    this.shakeCamera(scale);

    SoundManager.play(this.scene, 'explosion');
  }

  shakeCamera(scale) {
    if (!this.scene.cameras || !this.scene.cameras.main) return;

    // ⚡ Bolt Optimization: Throttle Shake
    // Only shake if camera is stable to prevent "stuttering" overlap
    if (!this.scene.cameras.main.shakeEffect.isRunning) {
         const shakeIntensity = 0.01 * (scale / 2);
         this.scene.cameras.main.shake(200, Math.min(shakeIntensity, 0.05));
    }
  }
}
