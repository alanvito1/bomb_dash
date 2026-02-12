import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { CST } from '../CST.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Create a semi-transparent background overlay
    this.add
      .graphics()
      .fillStyle(0x000000, 0.75)
      .fillRect(0, 0, this.scale.width, this.scale.height);

    // Pause Title with neon style
    this.add
      .text(centerX, centerY - 150, LanguageManager.get('pause_title'), {
        fontFamily: '"Press Start 2P"',
        fontSize: '36px',
        fill: '#FFD700',
        stroke: '#000',
        strokeThickness: 5,
        shadow: {
          offsetX: 2,
          offsetY: 2,
          color: '#FFD700',
          blur: 10,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5);

    // Menu Buttons using the game's button asset
    const menuItems = [
      { label: LanguageManager.get('pause_continue'), action: 'resume' },
      {
        label: LanguageManager.get('pause_restart', {}, 'Restart'),
        action: 'restart',
      },
      { label: LanguageManager.get('pause_exit'), action: 'exit' },
    ];

    const buttonSpacing = 80;
    menuItems.forEach((item, index) => {
      const buttonY = centerY - 20 + index * buttonSpacing;
      const button = this.add
        .image(centerX, buttonY, 'btn_menu')
        .setOrigin(0.5);
      button.setDisplaySize(300, 60);

      const buttonText = this.add
        .text(centerX, buttonY, item.label, {
          fontFamily: '"Press Start 2P"',
          fontSize: '18px',
          fill: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);

      button.setInteractive({ useHandCursor: true });

      button.on('pointerover', () => button.setTint(0xcccccc));
      button.on('pointerout', () => button.clearTint());
      button.on('pointerdown', () => button.setTint(0xaaaaaa));
      button.on('pointerup', () => {
        button.clearTint();
        SoundManager.play(this, 'click');
        this.handleAction(item.action);
      });
    });
  }

  handleAction(action) {
    const gameScene = this.scene.get('GameScene');
    const hudScene = this.scene.get('HUDScene');

    switch (action) {
      case 'resume':
        // Delegate the entire resume process to the centralized PauseManager
        gameScene.pauseManager.resume();
        break;
      case 'restart':
        // Stop all scenes and restart the GameScene
        SoundManager.stopAll(this);
        if (gameScene) gameScene.scene.stop();
        if (hudScene) hudScene.scene.stop();
        this.scene.start(CST.SCENES.GAME);
        break;
      case 'exit':
        // Stop all scenes and return to the main menu
        SoundManager.stopAll(this);
        if (gameScene) gameScene.scene.stop();
        if (hudScene) hudScene.scene.stop();
        this.scene.start(CST.SCENES.MENU);
        break;
    }
  }
}
