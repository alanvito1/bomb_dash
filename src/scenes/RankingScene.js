import { getRanking } from '../api.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('RankingScene');
  }

  async create() {
    this.cameras.main.setBackgroundColor('#000022');
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.text(centerX, centerY - 250, LanguageManager.get(this, 'ranking_title'), {
        fontFamily: '"Press Start 2P"',
        fontSize: '28px',
        fill: '#FFD700',
        align: 'center'
    }).setOrigin(0.5);

    const backButton = this.add.text(centerX, this.scale.height - 50, LanguageManager.get(this, 'shop_back_to_menu'), {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#00ffff',
        backgroundColor: '#00000099',
        padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
        SoundManager.play(this, 'click');
        this.scene.start('MenuScene');
    });
    backButton.on('pointerover', () => backButton.setStyle({ fill: '#ffffff'}));
    backButton.on('pointerout', () => backButton.setStyle({ fill: '#00ffff'}));

    const loadingText = this.add.text(centerX, centerY, LanguageManager.get(this, 'ranking_loading'), {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#cccccc',
        align: 'center'
    }).setOrigin(0.5);

    try {
        const rankingData = await getRanking();
        loadingText.destroy();

        if (rankingData && rankingData.length > 0) {
            let yPos = centerY - 180;
            rankingData.forEach((player, index) => {
                const rankText = LanguageManager.get(this, 'ranking_entry', { rank: index + 1, username: player.username, score: player.score });
                this.add.text(centerX, yPos, rankText, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '14px',
                    fill: '#ffffff',
                    align: 'center'
                }).setOrigin(0.5);
                yPos += 30;
            });
        } else if (rankingData && rankingData.length === 0) {
            this.add.text(centerX, centerY, LanguageManager.get(this, 'ranking_empty'), {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: '#ffdddd',
                align: 'center'
            }).setOrigin(0.5);
        } else {
             this.add.text(centerX, centerY, LanguageManager.get(this, 'ranking_failed'), {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: '#ffdddd',
                align: 'center'
            }).setOrigin(0.5);
        }
    } catch (error) {
        loadingText.destroy();
        console.error("Error fetching ranking for scene:", error);
        this.add.text(centerX, centerY, LanguageManager.get(this, 'ranking_error'), {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#ff0000',
            align: 'center'
        }).setOrigin(0.5);
    }
  }
}
