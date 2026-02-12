import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { CST } from '../CST.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Background ---
    this.add
      .image(centerX, centerY, 'gameover_bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height)
      .setAlpha(0.7);

    // --- Data from GameScene ---
    const score = data.score || 0;
    const world = data.world || 1;
    const phase = data.phase || 1;
    const coinsEarned = data.coinsEarned || 0;
    const xpGained = data.xpGained || 0;

    // --- Title with Neon Style ---
    this.add
      .text(centerX, centerY - 200, LanguageManager.get('game_over_title'), {
        fontFamily: '"Press Start 2P"',
        fontSize: '36px',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: {
          offsetX: 3,
          offsetY: 3,
          color: '#ff0000',
          blur: 15,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5);

    // --- Stats Display ---
    const statsY = centerY - 100;
    const textStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: '18px',
      fill: '#ffffff',
    };
    const valueStyle = { ...textStyle, fill: '#FFD700' };

    // World-Phase Reached
    this.add
      .text(
        centerX,
        statsY,
        `${LanguageManager.get('hud_world', {}, 'World')} ${world}-${phase}`,
        textStyle
      )
      .setOrigin(0.5);

    // Score
    this.add
      .text(
        centerX,
        statsY + 40,
        `${LanguageManager.get('game_over_your_score', { score: '' })}${score}`,
        textStyle
      )
      .setOrigin(0.5);

    // XP Gained
    this.add
      .text(centerX, statsY + 80, `XP Gained: ${xpGained}`, valueStyle)
      .setOrigin(0.5);

    // Coins Earned
    this.add
      .text(
        centerX,
        statsY + 120,
        `${LanguageManager.get('game_over_coins_earned', {
          coins: '',
        })}${coinsEarned}`,
        valueStyle
      )
      .setOrigin(0.5);

    // --- Buttons ---
    const buttonY = centerY + 150;
    const buttonSpacing = 180;

    // Restart Button
    const restartButton = this.add
      .image(centerX - buttonSpacing / 2, buttonY, 'btn_menu')
      .setInteractive({ useHandCursor: true });
    this.add
      .text(
        restartButton.x,
        restartButton.y,
        LanguageManager.get('pause_restart', {}, 'Restart'),
        textStyle
      )
      .setOrigin(0.5);
    restartButton.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start(CST.SCENES.GAME);
    });

    // Menu Button
    const menuButton = this.add
      .image(centerX + buttonSpacing / 2, buttonY, 'btn_menu')
      .setInteractive({ useHandCursor: true });
    this.add
      .text(
        menuButton.x,
        menuButton.y,
        LanguageManager.get('menu_title', {}, 'Menu'),
        textStyle
      )
      .setOrigin(0.5);
    menuButton.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start(CST.SCENES.MENU);
    });
  }
}
