import { createFloatingText } from './FloatingText.js';
import SoundManager from '../utils/sound.js';
import TextureGenerator from './TextureGenerator.js';

export default class PlayerController {
  constructor(scene) {
    this.scene = scene;
    this.player = null;
    this.lastDirection = new Phaser.Math.Vector2(0, -1); // Default facing UP
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
    // 1. Circular Hitbox for smoother corner sliding
    // 2. Reduced Radius (14px = 28px diameter) to slide easily
    // The previous 10px radius might be too small, 14px fits well in 48px tile (28 < 48)
    this.player.body.setCircle(14, 6, 6);

    // Physics properties for "Game Feel"
    this.player.body.setDrag(1000); // Stop quickly when releasing keys
    this.player.body.setDamping(false); // Use standard drag (deceleration)
    this.player.body.setBounce(0); // No bounce on walls, we want to slide

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

    // TASK FORCE: WASD Support
    this.wasd = this.scene.input.keyboard.addKeys('W,A,S,D');

    return this.player;
  }

  update(cursors, speed, delta = 16.6) {
    if (!this.player) return;

    // Sync Shadow
    if (this.shadow) {
      this.shadow.setPosition(this.player.x, this.player.y + 20);
    }

    // TASK FORCE: 8-Way Movement Support (Analog-like)
    // We calculate a vector based on input
    const velocity = new Phaser.Math.Vector2(0, 0);

    // Support both cursors and WASD (if needed, but cursors requested)
    // Also support virtual joystick input if injected
    const joystick = this.scene.joystick;

    if (joystick && joystick.force > 0) {
       // Joystick Input
       velocity.x = Math.cos(joystick.angle) * speed;
       velocity.y = Math.sin(joystick.angle) * speed;

       // Update last direction based on joystick angle
       this.lastDirection.set(Math.cos(joystick.angle), Math.sin(joystick.angle)).normalize();

    } else {
        // Keyboard Input (Arrows + WASD)
        const left = cursors.left.isDown || (this.wasd && this.wasd.A.isDown);
        const right = cursors.right.isDown || (this.wasd && this.wasd.D.isDown);
        const up = cursors.up.isDown || (this.wasd && this.wasd.W.isDown);
        const down = cursors.down.isDown || (this.wasd && this.wasd.S.isDown);

        if (left) velocity.x -= 1;
        if (right) velocity.x += 1;
        if (up) velocity.y -= 1;
        if (down) velocity.y += 1;

        if (velocity.lengthSq() > 0) {
            velocity.normalize().scale(speed);
            this.lastDirection.copy(velocity).normalize();
        }
    }

    this.player.setVelocity(velocity.x, velocity.y);

    // Store Last Direction for Shooting in Scene
    this.scene.playerLastDirection = this.lastDirection;

    // Handle Effects
    const isMoving = velocity.lengthSq() > 0;

    if (isMoving) {
      // Emit smoke
      if (this.trailEmitter) {
        this.trailEmitter.setPosition(this.player.x, this.player.y + 18);
        if (this.scene.time.now % 100 < 20) {
          this.trailEmitter.emitParticle(1);
        }
      }
    }
  }
}
