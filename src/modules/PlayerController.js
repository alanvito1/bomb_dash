import { createFloatingText } from './FloatingText.js';
import SoundManager from '../utils/sound.js';
import TextureGenerator from './TextureGenerator.js';

export default class PlayerController {
  constructor(scene) {
    this.scene = scene;
    this.player = null;
  }

  create() {
    const playerStats = this.scene.playerStats;
    // Dynamically set the texture based on the selected hero
    const textureKey = playerStats.sprite_name
      ? `${playerStats.sprite_name.toLowerCase()}_hero`
      : 'player_default';

    TextureGenerator.ensureHero(this.scene, textureKey);

    this.player = this.scene.physics.add.sprite(
      this.scene.scale.width / 2,
      this.scene.scale.height * 0.85,
      textureKey
    );
    this.player.setDisplaySize(40, 40).setCollideWorldBounds(true);

    // TASK FORCE: FLUID GRID PHYSICS & HITBOX TUNING
    // 1. Reduced Hitbox Size (20px width for tolerance in 32/48px corridors)
    // 2. Focused Hitbox on Feet (Offset Y) for depth perception
    this.player.body.setSize(20, 20);
    this.player.body.setOffset(10, 20); // Center X (10), Bottom Y (20) for 40x40 sprite

    // 🌑 SHADOW
    if (this.scene.textures.exists('shadow')) {
      this.shadow = this.scene.add.image(
        this.player.x,
        this.player.y + 20,
        'shadow'
      );
      this.shadow.setAlpha(0.5);
      this.shadow.setDepth(this.player.depth - 1);
    }

    // 💨 SMOKE TRAIL
    if (this.scene.textures.exists('particle_smoke')) {
      this.trailEmitter = this.scene.add.particles(0, 0, 'particle_smoke', {
        speed: { min: 10, max: 20 },
        scale: { start: 0.5, end: 0 },
        lifespan: 200,
        alpha: { start: 0.5, end: 0 },
        emitting: false,
      });
    }

    // 🏃 WALK ANIMATION (Bobbing)
    this.walkTween = this.scene.tweens.add({
      targets: this.player,
      y: '+=2',
      duration: 150,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    return this.player;
  }

  update(cursors, speed, delta = 16.6) {
    if (!this.player) return;

    // Sync Shadow
    if (this.shadow) {
      this.shadow.setPosition(this.player.x, this.player.y + 20);
    }

    // TASK FORCE: 4-Way Movement Support
    const isMovingHorizontal = cursors.left.isDown || cursors.right.isDown;
    const isMovingVertical = cursors.up.isDown || cursors.down.isDown;
    const isMoving = isMovingHorizontal || isMovingVertical;

    // Reset Velocity
    this.player.setVelocity(0);

    if (cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(speed);
    }

    if (cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (cursors.down.isDown) {
      this.player.setVelocityY(speed);
    }

    // Handle Effects
    if (isMoving) {
      if (this.walkTween && this.walkTween.isPaused()) this.walkTween.resume();

      // Emit smoke
      if (this.trailEmitter) {
        this.trailEmitter.setPosition(this.player.x, this.player.y + 18);
        if (this.scene.time.now % 100 < 20) {
          // Limit emission rate manually roughly
          this.trailEmitter.emitParticle(1);
        }
      }
    } else {
      if (this.walkTween && this.walkTween.isPlaying()) {
        this.walkTween.pause();
        this.player.y = Math.round(this.player.y); // Reset pixel snap?
      }
    }
  }
}
