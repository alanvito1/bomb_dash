import api from '../api.js';
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
        const rankingData = await api.getRanking();
        loadingText.destroy();

        if (rankingData && rankingData.length > 0) {
                this.createRankingTable(centerX, centerY - 180, rankingData);
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

  createRankingTable(x, startY, rankingData) {
    const headerStyle = { fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#FFD700' };
    const rowStyle = { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#ffffff' };
    const columnWidths = { rank: 80, player: 200, score: 100 };
    const rankX = x - 150;
    const playerX = x - 50;
    const scoreX = x + 150;

    // Add Headers
    this.add.text(rankX, startY, 'Rank', headerStyle).setOrigin(0.5);
    this.add.text(playerX, startY, 'Player', headerStyle).setOrigin(0.5);
    this.add.text(scoreX, startY, 'Score', headerStyle).setOrigin(0.5);

    // Add Player Rows
    let yPos = startY + 40;
    rankingData.forEach((player, index) => {
        const rank = (index + 1).toString();
        const playerName = this.truncateAddress(player.username);
        const score = player.score.toString();

        this.add.text(rankX, yPos, rank, rowStyle).setOrigin(0.5);
        this.add.text(playerX, yPos, playerName, rowStyle).setOrigin(0.5);
        this.add.text(scoreX, yPos, score, rowStyle).setOrigin(0.5);

        yPos += 30;
    });
  }

  truncateAddress(address) {
      if (address.length <= 10) return address;
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}
