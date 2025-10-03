import api from '../api.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('RankingScene');
  }

  async create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Visual Polish: Background and Data Window ---
    this.add.image(centerX, centerY, 'menu_bg_vertical').setOrigin(0.5).setDisplaySize(this.scale.width, this.scale.height);
    this.add.graphics().fillStyle(0x000000, 0.8).fillRect(20, 20, this.scale.width - 40, this.scale.height - 40);

    // --- Visual Polish: Standard Font Styles ---
    const titleStyle = { fontSize: '24px', fill: '#FFD700', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 };
    const textStyle = { fontSize: '14px', fill: '#cccccc', fontFamily: '"Press Start 2P"', align: 'center' };
    const buttonStyle = { fontSize: '16px', fill: '#00ffff', fontFamily: '"Press Start 2P"', backgroundColor: '#00000099', padding: { x: 10, y: 5 } };

    // --- UI Elements ---
    this.add.text(centerX, 70, LanguageManager.get(this, 'ranking_title'), titleStyle).setOrigin(0.5);
    this.createBackButton(centerX, this.scale.height - 60, buttonStyle);

    const loadingText = this.add.text(centerX, centerY, LanguageManager.get(this, 'ranking_loading'), textStyle).setOrigin(0.5);

    try {
        const rankingData = await api.getRanking();
        loadingText.destroy();

        if (rankingData && rankingData.length > 0) {
            this.createRankingTable(centerX, 130, rankingData);
        } else if (rankingData && rankingData.length === 0) {
            this.add.text(centerX, centerY, LanguageManager.get(this, 'ranking_empty'), { ...textStyle, fill: '#ffdddd' }).setOrigin(0.5);
        } else {
            this.add.text(centerX, centerY, LanguageManager.get(this, 'ranking_failed'), { ...textStyle, fill: '#ffdddd' }).setOrigin(0.5);
        }
    } catch (error) {
        loadingText.destroy();
        console.error("Error fetching ranking for scene:", error);
        this.add.text(centerX, centerY, LanguageManager.get(this, 'ranking_error'), { ...textStyle, fill: '#ff0000' }).setOrigin(0.5);
    }
  }

  createBackButton(x, y, style) {
    const backButton = this.add.text(x, y, LanguageManager.get(this, 'shop_back_to_menu'), style)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    backButton.on('pointerdown', () => {
        SoundManager.play(this, 'click');
        this.scene.start('MenuScene');
    });

    backButton.on('pointerover', () => backButton.setStyle({ fill: '#ffffff' }));
    backButton.on('pointerout', () => backButton.setStyle({ fill: '#00ffff' }));
  }

  createRankingTable(x, startY, rankingData) {
    const headerStyle = { fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#FFD700' };
    const rowStyle = { fontFamily: '"Press Start 2P"', fontSize: '14px', fill: '#ffffff' };

    // Define column positions relative to the center `x`
    const rankX = x - 140;
    const playerX = x;
    const scoreX = x + 140;

    // Add Headers
    this.add.text(rankX, startY, LanguageManager.get(this, 'ranking_header_rank'), headerStyle).setOrigin(0.5);
    this.add.text(playerX, startY, LanguageManager.get(this, 'ranking_header_player'), headerStyle).setOrigin(0.5);
    this.add.text(scoreX, startY, LanguageManager.get(this, 'ranking_header_score'), headerStyle).setOrigin(0.5);

    // Add a separator line
    this.add.graphics().fillStyle(0x00ffff, 0.5).fillRect(x - 180, startY + 25, 360, 2);

    // Add Player Rows
    let yPos = startY + 60;
    const top10 = rankingData.slice(0, 10); // Ensure we only show top 10

    top10.forEach((player, index) => {
        const rank = (index + 1).toString();
        const playerName = this.truncateAddress(player.username);
        const score = player.score.toString();

        this.add.text(rankX, yPos, rank, rowStyle).setOrigin(0.5);
        this.add.text(playerX, yPos, playerName, rowStyle).setOrigin(0.5);
        this.add.text(scoreX, yPos, score, rowStyle).setOrigin(0.5);

        yPos += 35;
    });
  }

  truncateAddress(address) {
      if (!address || address.length <= 10) return address;
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
}