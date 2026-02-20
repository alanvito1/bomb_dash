import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import UIHelper from '../utils/UIHelper.js';
import { CST } from '../CST.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(data) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Background (Dark & Solid) ---
    this.cameras.main.setBackgroundColor('#050505');

    // Optional: Add image if available, but keep dark bg as base
    if (this.textures.exists('gameover_bg')) {
        this.add
          .image(centerX, centerY, 'gameover_bg')
          .setOrigin(0.5)
          .setDisplaySize(this.scale.width, this.scale.height)
          .setAlpha(0.7);
    }

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
        fill: '#FF5F1F',
        stroke: '#000000',
        strokeThickness: 6,
        shadow: {
          offsetX: 3,
          offsetY: 3,
          color: '#FF5F1F',
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

    // --- Buttons (Using UIHelper Neon Buttons) ---
    const buttonY = centerY + 150;
    const buttonSpacing = 200; // Wider spacing for large buttons

    // Restart Button
    UIHelper.createNeonButton(
        this,
        centerX - buttonSpacing / 2,
        buttonY,
        LanguageManager.get('pause_restart', {}, 'RESTART'),
        160,
        50,
        () => {
            SoundManager.play(this, 'click');
            this.scene.start(CST.SCENES.GAME);
        },
        0x00ffff // Cyan for Secondary/Action
    );

    // Menu Button
    UIHelper.createNeonButton(
        this,
        centerX + buttonSpacing / 2,
        buttonY,
        LanguageManager.get('menu_title', {}, 'MENU'),
        160,
        50,
        () => {
            SoundManager.play(this, 'click');
            this.scene.start(CST.SCENES.MENU);
        },
        0xff5f1f // Orange for Primary
    );
  }
}
