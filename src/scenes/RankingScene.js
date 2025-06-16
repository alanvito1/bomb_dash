// src/scenes/RankingScene.js
// import { initDB, getRankingTop10 } from '../database/database.js'; // REMOVIDO
import { getRanking } from '../api.js'; // ADICIONADO
import SoundManager from '../utils/sound.js';

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('RankingScene');
  }

  preload() {
    SoundManager.loadAll(this);
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
    // Carregar assets se necessário, ex: this.load.image('background_ranking', 'src/assets/ranking_bg.png');
  }

  async create() { // Marcado como async para o await getRanking()
    // await initDB(); // REMOVIDO
    this.cameras.main.setBackgroundColor('#000022'); // Um fundo simples
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Título
     this.add.text(centerX, centerY - 250, 'TOP 10 RANKING', {
        fontFamily: '"Press Start 2P"',
        fontSize: '28px',
        fill: '#FFD700',
        align: 'center'
    }).setOrigin(0.5);

    // Botão Voltar
    const backButton = this.add.text(centerX, this.scale.height - 50, '[ BACK TO MENU ]', {
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

    // Carregar e exibir ranking
    const loadingText = this.add.text(centerX, centerY, 'Loading ranking...', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#cccccc',
        align: 'center'
    }).setOrigin(0.5);

    try {
        // const rankingData = await getRankingTop10(); // ANTIGO
        const rankingData = await getRanking(); // NOVO - Espera que retorne um array diretamente
        loadingText.destroy(); // Remove "Loading..."

        if (rankingData && rankingData.length > 0) {
            let yPos = centerY - 180; // Posição inicial para a lista de ranking
            rankingData.forEach((player, index) => {
                const rankText = `${index + 1}. ${player.username} - ${player.score}`;
                this.add.text(centerX, yPos, rankText, {
                    fontFamily: '"Press Start 2P"',
                    fontSize: '14px',
                    fill: '#ffffff',
                    align: 'center'
                }).setOrigin(0.5);
                yPos += 30; // Espaçamento entre entradas
            });
        } else if (rankingData && rankingData.length === 0) {
            this.add.text(centerX, centerY, 'Ranking is empty or could not be loaded.', {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: '#ffdddd',
                align: 'center'
            }).setOrigin(0.5);
        } else {
             // Se rankingData for null ou undefined (getRanking pode retornar [] em caso de erro de fetch)
             this.add.text(centerX, centerY, 'Failed to load ranking data.', {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: '#ffdddd',
                align: 'center'
            }).setOrigin(0.5);
        }
    } catch (error) {
        loadingText.destroy();
        console.error("Error fetching ranking for scene:", error);
        this.add.text(centerX, centerY, 'Error displaying ranking. Check console.', {
            fontFamily: '"Press Start 2P"',
            fontSize: '12px',
            fill: '#ff0000',
            align: 'center'
        }).setOrigin(0.5);
    }
  }
}
