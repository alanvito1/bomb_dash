// src/scenes/GameOverScene.js
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  preload() {
    SoundManager.loadAll(this);
    this.load.image('gameover_bg', 'src/assets/gameover_bg.png');
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create(data) {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.image(centerX, centerY, 'gameover_bg')
        .setOrigin(0.5)
        .setDisplaySize(this.scale.width, this.scale.height)
        .setAlpha(0.7);

    const originalScore = data.score || 0;
    const finalScore = data.finalScore;
    const coinsEarned = data.coinsEarned || 0;
    const cheatDetected = data.cheatDetected || false;

    WebFont.load({
        google: { families: ['Press Start 2P'] },
        active: () => {
            this.add.text(centerX, centerY - 200, LanguageManager.get(this, 'game_over_title'), {
                fontFamily: '"Press Start 2P"',
                fontSize: '32px',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6,
                align: 'center'
            }).setOrigin(0.5);

            this.add.text(centerX, centerY - 100, LanguageManager.get(this, 'game_over_your_score', { score: originalScore }), {
                fontFamily: '"Press Start 2P"',
                fontSize: '20px',
                fill: '#ffffff',
                align: 'center'
            }).setOrigin(0.5);

            this.add.text(centerX, centerY - 50, LanguageManager.get(this, 'game_over_coins_earned', { coins: coinsEarned }), {
                fontFamily: '"Press Start 2P"',
                fontSize: '16px',
                fill: '#FFD700',
                align: 'center'
            }).setOrigin(0.5);

            let scoreMessage = '';
            if (cheatDetected) {
                scoreMessage = LanguageManager.get(this, 'game_over_cheat_detected');
            } else {
                const loggedInUser = this.registry.get('loggedInUser');
                if (finalScore > 0) {
                     if (loggedInUser && finalScore === loggedInUser.max_score) {
                        scoreMessage = LanguageManager.get(this, 'game_over_new_high_score');
                     } else if (loggedInUser && originalScore > loggedInUser.max_score && finalScore < originalScore) {
                        scoreMessage = LanguageManager.get(this, 'game_over_score_adjusted');
                     } else if (loggedInUser && finalScore < loggedInUser.max_score) {
                        scoreMessage = LanguageManager.get(this, 'game_over_nice_try');
                     } else if (!loggedInUser) {
                        scoreMessage = LanguageManager.get(this, 'game_over_login_to_save');
                     } else {
                        scoreMessage = LanguageManager.get(this, 'game_over_score_processed');
                     }
                } else if (!cheatDetected && originalScore > 0) {
                    scoreMessage = LanguageManager.get(this, 'game_over_score_processed');
                } else {
                    scoreMessage = LanguageManager.get(this, 'game_over_better_luck');
                }
            }
            this.add.text(centerX, centerY, scoreMessage, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: cheatDetected ? '#ff6347' : '#00ff00',
                align: 'center',
                wordWrap: {width: this.scale.width * 0.8}
            }).setOrigin(0.5);

            this.add.text(centerX, centerY + 100, LanguageManager.get(this, 'game_over_return_to_menu'), {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                fill: '#00ffff',
                align: 'center'
            }).setOrigin(0.5);

            this.input.keyboard.on('keydown-SPACE', () => {
                SoundManager.play(this, 'click');
                this.scene.start('MenuScene');
            });

            const rankingButton = this.add.text(centerX, centerY + 150, LanguageManager.get(this, 'game_over_view_ranking'), {
                fontFamily: '"Press Start 2P"',
                fontSize: '14px',
                fill: '#00ffff',
                backgroundColor: '#00000099',
                padding: { x: 10, y: 5 }
              })
              .setOrigin(0.5)
              .setInteractive({ useHandCursor: true });

              rankingButton.on('pointerdown', () => {
                SoundManager.play(this, 'click');
                this.scene.start('RankingScene');
              });
              rankingButton.on('pointerover', () => rankingButton.setStyle({ fill: '#ffffff'}));
              rankingButton.on('pointerout', () => rankingButton.setStyle({ fill: '#00ffff'}));

        }
    });
  }
}
