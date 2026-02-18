import { createFloatingText } from './FloatingText.js';
import SoundManager from '../utils/sound.js';

// Disparo de bombas com tamanho ajustado por upgrades e power-ups
export function fireBomb(scene) {
  if (scene.gamePaused) return;

  const count = 1 + (scene.playerStats.multiShot ?? 0);
  const spacing = 15;
  const startX = scene.player.x - (spacing * (count - 1)) / 2;

  const bombSize = 8 * (scene.playerStats.bombSize || 1); // ✅ Aplica multiplicador de tamanho

  for (let i = 0; i < count; i++) {
    const bomb = scene.bombs.create(
      startX + spacing * i,
      scene.player.y - 20,
      'bomb'
    );
    bomb.setDisplaySize(bombSize, bombSize);
    bomb.setVelocityY(-300);
  }
}

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

    this.player = this.scene.physics.add.sprite(
      this.scene.scale.width / 2,
      this.scene.scale.height * 0.85,
      textureKey
    );
    this.player.setDisplaySize(40, 40).setCollideWorldBounds(true);

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

    const isMoving = cursors.left.isDown || cursors.right.isDown;

    if (cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (cursors.right.isDown) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    // Proficiency: Agility
    if (isMoving) {
        // Distance = speed (pixels/sec) * delta (ms) / 1000
        const distance = speed * (delta / 1000);
        this.scene.sessionDistance = (this.scene.sessionDistance || 0) + distance;

        // Check for Level Up (Logarithmic: Level = sqrt(XP)/2)
        const startXp = this.scene.playerStats.agility_xp || 0;
        const currentDistance = this.scene.sessionDistance;
        const currentXp = startXp + Math.floor(currentDistance / 100); // 100 distance = 1 XP

        const prevDistance = currentDistance - distance;
        const prevXp = startXp + Math.floor(prevDistance / 100);

        // Calculate Levels
        const currentLevel = Math.floor(Math.sqrt(currentXp) / 2);
        const prevLevel = Math.floor(Math.sqrt(prevXp) / 2);

        if (currentLevel > prevLevel) {
            createFloatingText(this.scene, this.player.x, this.player.y - 40, 'AGILITY UP!', '#00ff00');
            SoundManager.play(this.scene, 'powerup_collect');
        }
    }

    // Impede movimento vertical
    this.player.setVelocityY(0);

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
