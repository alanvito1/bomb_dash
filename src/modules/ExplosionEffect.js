// src/modules/ExplosionEffect.js
import SoundManager from '../utils/sound.js';

export default function ExplosionEffect(scene, x, y) {
  const explosion = scene.add.sprite(x, y, 'explosion');
  explosion.setScale(0.9);

  // 💥 Toca som de explosão
  SoundManager.play(scene, 'explosion');

  // ⏱️ Remove após breve tempo
  scene.time.delayedCall(300, () => explosion.destroy());
}
