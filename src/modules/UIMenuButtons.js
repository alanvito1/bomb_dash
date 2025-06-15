// src/modules/UIMenuButtons.js

export function createUIButtons(scene, playerStats) {
  scene.add.image(scene.scale.width - 10, 20, 'btn_pause')
    .setInteractive().setScale(0.5).setOrigin(1, 0)
    .on('pointerdown', () => {
      scene.gamePaused = !scene.gamePaused;
      scene.physics.world.isPaused = scene.gamePaused;
      scene.bombTimer.paused = scene.gamePaused;
    });

  scene.add.image(scene.scale.width - 60, 20, 'btn_menu')
    .setInteractive().setScale(0.5).setOrigin(1, 0)
    .on('pointerdown', () => {
      localStorage.setItem('playerStats', JSON.stringify(playerStats));
      scene.scene.start('MenuScene');
    });
}
