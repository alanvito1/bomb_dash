import SoundManager from '../utils/sound.js';

export default function ExplosionEffect(scene, x, y) {
  // [PRAGMATIC GUARD] Prevent crash if scene is dead or anims missing
  if (!scene || !scene.anims || !scene.add) {
    console.warn('[ExplosionEffect] Called on invalid scene.');
    return;
  }

  // 1. Ensure animation exists
  if (!scene.anims.exists('explosion_anim')) {
    if (!scene.textures.exists('explosion_sheet')) {
       console.warn('[ExplosionEffect] Texture "explosion_sheet" missing. Skipping effect.');
       return;
    }

    const texture = scene.textures.get('explosion_sheet');

    // If the texture was generated but acts as a single frame, slice it.
    if (texture && texture.frameTotal === 1) {
      const frameWidth = 32;
      const frameHeight = 32;
      // We know it's 160x32 (5 frames)
      for (let i = 0; i < 5; i++) {
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
        { key: 'explosion_sheet', frame: 4 },
      ],
      frameRate: 20,
      repeat: 0,
      hideOnComplete: true,
    });
  }

  // 2. Create Sprite
  const explosion = scene.add.sprite(x, y, 'explosion_sheet');
  if (!explosion) return; // Guard against sprite creation failure

  explosion.setScale(2); // 32px * 2 = 64px

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
