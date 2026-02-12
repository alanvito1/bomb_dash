// modules/StageDialog.js
import EnemySpawner from './EnemySpawner.js';
// ❌ Removido o import da função que não existe
// import { updateHUD } from '../modules/hud.js';

export function showNextStageDialog(scene) {
  const centerX = scene.scale.width / 2;
  const centerY = scene.scale.height / 2;

  const dialog = scene.add
    .rectangle(centerX, centerY, 300, 150, 0x000000, 0.8)
    .setOrigin(0.5);
  const text = scene.add
    .text(centerX, centerY - 30, 'Boss defeated!\nAdvance to next stage?', {
      fontSize: '18px',
      fill: '#ffffff',
      align: 'center',
      fontFamily: 'monospace',
    })
    .setOrigin(0.5);

  const nextButton = scene.add
    .text(centerX, centerY + 40, '[ NEXT STAGE ]', {
      fontSize: '20px',
      fill: '#00ff00',
      fontFamily: 'monospace',
      backgroundColor: '#111',
      padding: { x: 12, y: 6 },
    })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => {
      dialog.destroy();
      text.destroy();
      nextButton.destroy();

      scene.level++;
      scene.enemyHp++;

      // ✅ Agora chamando diretamente o método da instância da classe HUD
      if (scene.hud && typeof scene.hud.updateHUD === 'function') {
        scene.hud.updateHUD();
      }

      scene.bg.setTexture(`bg${Math.min(Math.ceil(scene.level / 5), 5)}`);

      const spawner = new EnemySpawner(scene);
      spawner.spawn();

      scene.physics.resume();
      scene.bombTimer.paused = false;
    });
}
