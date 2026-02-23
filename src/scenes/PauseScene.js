import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { CST } from '../CST.js';
import { createRetroButton, createRetroPanel } from '../utils/ui.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create() {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Overlay
    this.add.graphics()
      .fillStyle(0x000000, 0.85)
      .fillRect(0, 0, this.scale.width, this.scale.height);

    // Modal Panel (300x200)
    const panelW = 300;
    const panelH = 220;
    createRetroPanel(this, cx, cy, panelW, panelH, 'metal');

    // Title
    this.add.text(cx, cy - 70, 'PAUSED', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        fill: '#FF5F1F',
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5);

    // Resume Button
    createRetroButton(this, cx, cy - 10, 200, 50, 'RESUME', 'primary', () => {
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.pauseManager) {
            gameScene.pauseManager.resume();
        }
    });

    // Quit Button
    createRetroButton(this, cx, cy + 60, 200, 50, 'QUIT TO MENU', 'danger', () => {
        SoundManager.stopAll(this);
        const gameScene = this.scene.get('GameScene');
        const hudScene = this.scene.get('HUDScene');
        if (gameScene) gameScene.scene.stop();
        if (hudScene) hudScene.scene.stop();
        this.scene.start(CST.SCENES.MENU);
    });
  }
}
