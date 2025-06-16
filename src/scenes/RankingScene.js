// src/scenes/RankingScene.js
import SoundManager from '../utils/sound.js';
import { getRankingTop10, initDB } from '../database/database.js'; // Import database functions

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('RankingScene');
  }

  preload() {
    SoundManager.loadAll(this);
    // Ensure webfont is loaded if not already, for consistent styling
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  async create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.cameras.main.setBackgroundColor('#000033'); // Consistent dark blue background

    // Attempt to initialize DB just in case, though it should be up by now.
    // In a more robust app, DB readiness would be guaranteed by an earlier scene.
    await initDB();

    // Get logged-in user details from registry
    const loggedInUser = this.registry.get('loggedInUser'); // Format: { username: 'name', max_score: ... }

    // Load font then create content
    WebFont.load({
      google: { families: ['Press Start 2P'] },
      active: async () => {
        // Título do ranking
        this.add.text(centerX, 80, '🏆 TOP 10 RANKING 🏆', {
          fontFamily: '"Press Start 2P"',
          fontSize: '20px',
          fill: '#00ffff',
          align: 'center'
        }).setOrigin(0.5);

        // Fetch ranking data from database
        const ranking = await getRankingTop10(); // Returns array of { username: 'name', score: 123 }

        if (ranking.length === 0) {
          this.add.text(centerX, centerY, 'No scores yet.\nBe the first!', { // Added newline for better display
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#fff',
            align: 'center'
          }).setOrigin(0.5);
        } else {
          ranking.forEach((entry, index) => {
            const position = `${index + 1}.`.padEnd(3);
            // Shorten name if too long, though DB schema doesn't enforce length
            const name = entry.username.substring(0, 10).padEnd(10);
            const score = `${String(entry.score).padStart(6, ' ')} pts`; // Pad score for alignment
            const rowText = `${position} ${name}  ${score}`;

            let textColor = '#ffffff'; // Default color
            if (loggedInUser && entry.username === loggedInUser.username) {
              textColor = '#FFD700'; // Highlight logged-in user (Gold color)
            }

            this.add.text(centerX, 150 + index * 35, rowText, {
              fontFamily: '"Press Start 2P"',
              fontSize: '14px',
              fill: textColor,
              align: 'left' // Align text rows to the left under center
            }).setOrigin(0.5, 0.5); // Center each text line
          });
        }

        // Botão de voltar
        const backBtn = this.add.text(centerX, this.scale.height - 80, '[ BACK TO MENU ]', {
          fontFamily: '"Press Start 2P"',
          fontSize: '16px',
          fill: '#00ffff',
          backgroundColor: '#00000099',
          padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
          SoundManager.play(this, 'click');
          this.scene.start('MenuScene');
        });
        backBtn.on('pointerover', () => backBtn.setStyle({ fill: '#ffffff' }));
        backBtn.on('pointerout', () => backBtn.setStyle({ fill: '#00ffff' }));
      }
    });
  }
}
