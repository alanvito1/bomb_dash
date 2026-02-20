import UIModal from './UIModal.js';
import api from '../api.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class RankingModal extends UIModal {
  constructor(scene) {
    super(
      scene,
      460,
      600,
      LanguageManager.get('ranking_title', {}, 'LEADERBOARD')
    );
    this.populate();
  }

  async populate() {
    try {
      const ranking = await api.getRanking();
      if (ranking && Array.isArray(ranking)) {
        this.renderList(ranking);
      } else {
        this.showError('No ranking data available.');
      }
    } catch (e) {
      console.error(e);
      this.showError('Failed to load ranking.');
    }
  }

  renderList(ranking) {
    const startY = -this.modalHeight / 2 + 80;
    const rowHeight = 40;
    const width = this.modalWidth - 40;

    // Headers
    this.createRow(
      0,
      startY - 30,
      width,
      rowHeight,
      { rank: '#', name: 'PLAYER', score: 'SCORE' },
      true
    );

    ranking.forEach((entry, index) => {
      const y = startY + index * rowHeight;
      // Limit to top 10 to fit
      if (index < 10) {
        this.createRow(
          0,
          y,
          width,
          rowHeight,
          {
            rank: (index + 1).toString(),
            name: entry.name || entry.walletAddress || 'Unknown',
            score: entry.score.toString(),
          },
          false,
          index
        );
      }
    });
  }

  createRow(x, y, w, h, data, isHeader, index = -1) {
    const container = this.scene.add.container(x, y);

    // Background (Zebra Striping)
    if (!isHeader) {
      const color = index % 2 === 0 ? 0x222222 : 0x111111;
      const bg = this.scene.add.graphics();

      // Top 3 Highlight
      let strokeColor = 0x000000;
      let strokeAlpha = 0;
      if (index === 0) {
        strokeColor = 0xffd700;
        strokeAlpha = 1;
      } // Gold
      else if (index === 1) {
        strokeColor = 0xc0c0c0;
        strokeAlpha = 1;
      } // Silver
      else if (index === 2) {
        strokeColor = 0xcd7f32;
        strokeAlpha = 1;
      } // Bronze

      bg.fillStyle(color, 1);
      bg.fillRect(-w / 2, -h / 2, w, h);

      if (strokeAlpha > 0) {
        bg.lineStyle(2, strokeColor, 1);
        bg.strokeRect(-w / 2, -h / 2, w, h);
      }

      container.add(bg);
    }

    const style = {
      fontFamily: '"Press Start 2P"',
      fontSize: isHeader ? '12px' : '10px',
      fill: isHeader ? '#00ffff' : '#ffffff',
    };

    // Rank
    const rankText = this.scene.add
      .text(-w / 2 + 30, 0, data.rank, style)
      .setOrigin(0.5);

    // Name (Left Aligned)
    const nameText = this.scene.add
      .text(-w / 2 + 80, 0, this.truncateName(data.name), style)
      .setOrigin(0, 0.5);

    // Score (Right Aligned)
    const scoreText = this.scene.add
      .text(w / 2 - 30, 0, data.score, { ...style, fill: '#ffff00' })
      .setOrigin(1, 0.5);

    // Top 3 Colors for Rank Number
    if (!isHeader) {
      if (index === 0) rankText.setColor('#ffd700');
      else if (index === 1) rankText.setColor('#c0c0c0');
      else if (index === 2) rankText.setColor('#cd7f32');
    }

    container.add([rankText, nameText, scoreText]);
    this.windowContainer.add(container);
  }

  truncateName(name) {
    if (name.length > 15) return name.substring(0, 12) + '...';
    return name;
  }

  showError(msg) {
    const text = this.scene.add
      .text(0, 0, msg, {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#ff0000',
      })
      .setOrigin(0.5);
    this.windowContainer.add(text);
  }
}
