import api from '../api.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import { CST } from '../CST.js';
import {
  createButton,
  createTitle,
  createPanel,
  drawCyberpunkGrid,
} from '../modules/UIGenerator.js';

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('RankingScene');
  }

  async create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Background & UI Window ---
    // Replaced static image with procedural cyberpunk grid
    drawCyberpunkGrid(this);

    createPanel(this, 20, 20, this.scale.width - 40, this.scale.height - 80);

    // --- Title with Neon Style ---
    createTitle(this, centerX, 70, LanguageManager.get('ranking_title'));

    // --- Back Button ---
    createButton(
      this,
      centerX,
      this.scale.height - 60,
      LanguageManager.get('shop_back_to_menu'),
      () => {
        this.scene.start(CST.SCENES.MENU);
      }
    );

    // --- Loading/Error Text ---
    const statusText = this.add
      .text(centerX, centerY, LanguageManager.get('ranking_loading'), {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#cccccc',
      })
      .setOrigin(0.5);

    try {
      const response = await api.getRanking();
      statusText.destroy();

      if (response.success && response.ranking.length > 0) {
        this.createRankingTable(centerX, 130, response.ranking);
      } else if (response.success && response.ranking.length === 0) {
        statusText
          .setText(LanguageManager.get('ranking_empty'))
          .setStyle({ fill: '#ffdddd' });
      } else {
        statusText
          .setText(LanguageManager.get('ranking_failed'))
          .setStyle({ fill: '#ffdddd' });
      }
    } catch (error) {
      statusText.destroy();
      console.warn('Error fetching ranking for scene:', error);

      // --- MOCK DATA FALLBACK ---
      // Display fake data so the menu doesn't look broken
      const mockRanking = [
        { rank: 1, address: '0x1234...MOCK', wave: 99 },
        { rank: 2, address: '0xABCD...TEST', wave: 88 },
        { rank: 3, address: '0x9876...FAKE', wave: 77 },
        { rank: 4, address: '0x5555...GUEST', wave: 50 },
        { rank: 5, address: '0xYOUR...NAME', wave: 42 },
      ];
      this.createRankingTable(centerX, 130, mockRanking);

      this.add
        .text(centerX, this.scale.height - 100, 'OFFLINE MODE - MOCK DATA', {
          fontFamily: '"Press Start 2P"',
          fontSize: '10px',
          fill: '#ffaa00',
        })
        .setOrigin(0.5);
    }
  }

  createRankingTable(x, startY, rankingData) {
    const headerStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: '16px',
      fill: '#FFD700',
    };
    const rowStyle = {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      fill: '#ffffff',
    };

    const rankX = x - 140;
    const playerX = x;
    const waveX = x + 140;

    // Headers
    this.add
      .text(
        rankX,
        startY,
        LanguageManager.get('ranking_header_rank'),
        headerStyle
      )
      .setOrigin(0.5);
    this.add
      .text(
        playerX,
        startY,
        LanguageManager.get('ranking_header_player'),
        headerStyle
      )
      .setOrigin(0.5);
    this.add
      .text(
        waveX,
        LanguageManager.get('ranking_header_wave', {}, 'Wave'),
        headerStyle
      )
      .setOrigin(0.5);

    this.add
      .graphics()
      .fillStyle(0x00ffff, 0.5)
      .fillRect(x - 180, startY + 25, 360, 2);

    // Rows
    let yPos = startY + 60;
    rankingData.forEach((player, index) => {
      // Add a background panel for each row for better readability
      const panel = this.add.graphics();
      panel.fillStyle(0x1a1a1a, 0.5);
      panel.fillRoundedRect(x - 180, yPos - 15, 360, 40, 10);

      const rank = player.rank.toString();
      const playerName = this.truncateAddress(player.address);
      const wave = player.wave.toString();

      // Add icons for top 3 players
      if (index < 3) {
        const medalKey = `medal_${index + 1}`;
        if (this.textures.exists(medalKey)) {
          this.add.image(rankX - 30, yPos, medalKey).setScale(0.5);
        } else {
          // Fallback: Simple colored circle
          this.add.circle(
            rankX - 30,
            yPos,
            8,
            index === 0 ? 0xffd700 : index === 1 ? 0xc0c0c0 : 0xcd7f32
          );
        }
      }

      this.add.text(rankX, yPos, rank, rowStyle).setOrigin(0.5);
      this.add.text(playerX, yPos, playerName, rowStyle).setOrigin(0.5);
      this.add.text(waveX, yPos, wave, rowStyle).setOrigin(0.5);

      yPos += 50; // Increased spacing
    });
  }

  truncateAddress(address) {
    if (!address || address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  }
}
