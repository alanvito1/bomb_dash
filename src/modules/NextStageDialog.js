import SoundManager from '../utils/sound.js';

export function showNextStageDialog(scene, onNext = () => {}) {
  if (!scene || !scene.add) {
    console.error('[NextStageDialog] Cena inválida');
    return;
  }

  const centerX = scene.scale.width / 2;
  const centerY = scene.scale.height / 2;
  let alreadyClicked = false;

  // Pausar física e timer
  scene.physics.pause();
  if (scene.bombTimer) scene.bombTimer.paused = true;

  // Fundo do diálogo
  const dialog = scene.add.rectangle(centerX, centerY, 300, 150, 0x000000, 0.8).setOrigin(0.5);

  // Texto principal
  const message = scene.add.text(centerX, centerY - 30, 'Boss defeated!\nAdvance to next stage?', {
    fontSize: '18px',
    fill: '#ffffff',
    align: 'center',
    fontFamily: 'monospace'
  }).setOrigin(0.5);

  // Botão "Next Stage"
  const nextButton = scene.add.text(centerX, centerY + 40, '[ NEXT STAGE ]', {
    fontSize: '20px',
    fill: '#00ff00',
    fontFamily: 'monospace',
    backgroundColor: '#111',
    padding: { x: 12, y: 6 }
  })
    .setOrigin(0.5)
    .setInteractive()
    .on('pointerdown', () => {
      if (alreadyClicked) return;
      alreadyClicked = true;

      SoundManager.play(scene, 'click'); // ✅ som de clique ao avançar

      console.log('[NextStageDialog] NEXT STAGE button clicked');

      // Limpar elementos da UI
      dialog.destroy();
      message.destroy();
      nextButton.destroy();
      console.log('[NextStageDialog] Diálogo destruído, chamando onNext');

      try {
        onNext();
      } catch (e) {
        console.error('[NextStageDialog] Erro ao executar onNext:', e);
      }
    });
}
