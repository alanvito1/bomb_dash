import api from '../api.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class CharacterSelectionScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelectionScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Adiciona um fundo
    this.add.image(centerX, centerY, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);

    // Título da cena
    this.add.text(centerX, 50, 'Selecione seu Herói', {
      fontSize: '28px',
      fill: '#FFD700',
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Texto de carregamento
    const loadingText = this.add.text(centerX, centerY, 'Carregando heróis...', {
      fontSize: '20px',
      fill: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Botão de voltar
    this.createBackButton(centerX, this.scale.height - 50);

    this.fetchAndDisplayNfts(loadingText);
  }

  async fetchAndDisplayNfts(loadingText) {
    try {
      const response = await api.getOwnedNfts();
      if (response.success && response.nfts.length > 0) {
        loadingText.destroy();
        this.displayNfts(response.nfts);
      } else if (response.success && response.nfts.length === 0) {
        loadingText.setText('Nenhum herói encontrado.\nJogue para conseguir um!');
      } else {
        loadingText.setText(`Erro: ${response.message}`);
      }
    } catch (error) {
      console.error('Falha ao buscar NFTs:', error);
      loadingText.setText('Erro ao conectar ao servidor.');
    }
  }

  displayNfts(nfts) {
    const centerX = this.cameras.main.centerX;
    const startY = 120;
    const cardSpacingY = 110;
    const cardWidth = 300;
    const cardHeight = 100;

    nfts.forEach((nft, index) => {
      const cardY = startY + (index * cardSpacingY);

      // Cria um container para o card do herói
      const card = this.add.container(centerX, cardY);

      // Fundo do card
      const background = this.add.graphics();
      background.fillStyle(0x000000, 0.7);
      background.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
      background.lineStyle(2, 0x00ffff, 1);
      background.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
      card.add(background);

      // Adiciona o nome/ID do herói
      const heroIdText = this.add.text(-cardWidth / 2 + 15, -cardHeight / 2 + 15, `Herói ID: ${nft.id}`, {
        fontSize: '16px',
        fill: '#FFD700',
        fontFamily: 'monospace'
      });
      card.add(heroIdText);

      // Adiciona as estatísticas
      const statsText = `Poder: ${nft.bombPower} | Velocidade: ${nft.speed} | Raridade: ${nft.rarity}`;
      const heroStatsText = this.add.text(-cardWidth / 2 + 15, -cardHeight / 2 + 45, statsText, {
        fontSize: '14px',
        fill: '#ffffff',
        fontFamily: 'monospace'
      });
      card.add(heroStatsText);

      // Torna o card interativo
      card.setSize(cardWidth, cardHeight);
      card.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          SoundManager.play(this, 'click');
          this.selectCharacter(nft);
        })
        .on('pointerover', () => background.lineStyle(3, 0xFFD700, 1).strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10))
        .on('pointerout', () => background.lineStyle(2, 0x00ffff, 1).strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10));
    });
  }

  selectCharacter(nft) {
    console.log('Personagem selecionado:', nft);

    // Mapeia os stats do NFT para os stats do jogador no jogo
    const playerStats = {
        damage: nft.bombPower,
        speed: nft.speed * 10, // Ajuste de escala, se necessário
        // Outros stats podem ser definidos aqui com base na raridade, etc.
    };

    // Armazena os stats do personagem selecionado no registro para a GameScene usar
    this.registry.set('selectedCharacterStats', playerStats);

    // Inicia a GameScene
    this.scene.start('GameScene');
  }

  createBackButton(centerX, y) {
    const backBtn = this.add.text(centerX, y, '< Voltar', {
      fontSize: '20px',
      fill: '#00ffff',
      fontFamily: 'monospace'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      SoundManager.play(this, 'click');
      this.scene.start('MenuScene');
    });
  }
}