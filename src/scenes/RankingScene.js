import SoundManager from '../utils/sound.js';

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('RankingScene');
  }

  preload() {
    SoundManager.loadAll(this);
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.cameras.main.setBackgroundColor('#000');

    // Título do ranking
    this.add.text(centerX, 60, '🏆 TOP 10 RANKING', {
      fontSize: '32px',
      fill: '#00ffff',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Recuperar e ordenar ranking
    const fullRanking = JSON.parse(localStorage.getItem('ranking') || '[]');
    const ranking = fullRanking
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // mostra só os 10 melhores

    if (ranking.length === 0) {
      this.add.text(centerX, centerY, 'No scores yet.', {
        fontSize: '20px',
        fill: '#fff',
        fontFamily: 'monospace'
      }).setOrigin(0.5);
    } else {
      ranking.forEach((entry, index) => {
        const position = `${index + 1}.`.padEnd(4);
        const name = entry.name.padEnd(12);
        const score = `${entry.score} pts`;
        const row = `${position}${name} - ${score}`;

        this.add.text(centerX, 110 + index * 30, row, {
          fontSize: '20px',
          fill: '#ffffff',
          fontFamily: 'monospace'
        }).setOrigin(0.5);
      });
    }

    // Botão de voltar
    const backBtn = this.add.text(centerX, 520, '[ BACK TO MENU ]', {
      fontSize: '20px',
      fill: '#0ff',
      fontFamily: 'monospace',
      backgroundColor: '#111',
      padding: { x: 10, y: 5 }
    })
    .setOrigin(0.5)
    .setInteractive();

    backBtn.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('MenuScene');
    });
  }
}
