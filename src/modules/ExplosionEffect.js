import SoundManager from '../utils/sound.js';

export default function ExplosionEffect(scene, x, y) {
  // 1. Ensure animation exists
  if (!scene.anims.exists('explosion_anim')) {
    const texture = scene.textures.get('explosion_sheet');

    // If the texture was generated but acts as a single frame, slice it.
    if (texture && texture.frameTotal === 1) {
      const frameWidth = 16;
      const frameHeight = 16;
      // We know it's 64x16
      for (let i = 0; i < 4; i++) {
        // Add frames 0, 1, 2, 3
        texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
      }
    }

    scene.anims.create({
      key: 'explosion_anim',
      frames: [
        { key: 'explosion_sheet', frame: 0 },
        { key: 'explosion_sheet', frame: 1 },
        { key: 'explosion_sheet', frame: 2 },
        { key: 'explosion_sheet', frame: 3 },
      ],
      frameRate: 15,
      repeat: 0,
      hideOnComplete: true,
    });
  }

  // 2. Create Sprite
  const explosion = scene.add.sprite(x, y, 'explosion_sheet');
  explosion.setScale(3); // Make it big and pixelated (16px * 3 = 48px)

  // 3. Play Animation
  explosion.play('explosion_anim');

  // 4. Cleanup
  explosion.on('animationcomplete', () => {
    explosion.destroy();
  });

  // 5. Screen Shake
  // Only shake if configured or reasonable default
  if (scene.cameras && scene.cameras.main) {
    scene.cameras.main.shake(200, 0.01);
  }

  // 6. Sound
  SoundManager.play(scene, 'explosion');
}
