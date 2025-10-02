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

    this.fetchAndDisplayHeroes(loadingText);
  }

  async fetchAndDisplayHeroes(loadingText) {
    try {
      const response = await api.getHeroes();
      if (response.success && response.heroes.length > 0) {
        loadingText.destroy();
        this.displayHeroes(response.heroes);
      } else if (response.success && response.heroes.length === 0) {
        // This case should ideally not happen with mock heroes, but good to have
        loadingText.setText('Nenhum herói encontrado.\nContacte o suporte.');
      } else {
        loadingText.setText(`Erro: ${response.message}`);
      }
    } catch (error) {
      console.error('Falha ao buscar heróis:', error);
      loadingText.setText('Erro ao conectar ao servidor.');
    }
  }

  displayHeroes(heroes) {
    const centerX = this.cameras.main.centerX;
    const startY = 120;
    const cardSpacingY = 110;
    const cardWidth = 300;
    const cardHeight = 100;

    heroes.forEach((hero, index) => {
      const cardY = startY + (index * cardSpacingY);
      const card = this.add.container(centerX, cardY);

      const background = this.add.graphics();
      background.fillStyle(0x000000, 0.7);
      background.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
      background.lineStyle(2, 0x00ffff, 1);
      background.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10);
      card.add(background);

      // Display hero type and level
      const heroTypeText = hero.hero_type === 'nft' ? `NFT Herói (Lvl ${hero.level})` : `Mock Herói (Lvl ${hero.level})`;
      const heroIdText = this.add.text(-cardWidth / 2 + 15, -cardHeight / 2 + 15, heroTypeText, {
        fontSize: '16px',
        fill: '#FFD700',
        fontFamily: 'monospace'
      });
      card.add(heroIdText);

      // Display hero stats
      const statsText = `Dano: ${hero.damage} | Vel: ${hero.speed} | HP: ${hero.hp}`;
      const heroStatsText = this.add.text(-cardWidth / 2 + 15, -cardHeight / 2 + 45, statsText, {
        fontSize: '14px',
        fill: '#ffffff',
        fontFamily: 'monospace'
      });
      card.add(heroStatsText);

      card.setSize(cardWidth, cardHeight);
      card.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          SoundManager.play(this, 'click');
          this.selectCharacter(hero);
        })
        .on('pointerover', () => background.lineStyle(3, 0xFFD700, 1).strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10))
        .on('pointerout', () => background.lineStyle(2, 0x00ffff, 1).strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 10));
    });
  }

  selectCharacter(heroData) {
    console.log('Personagem selecionado:', heroData);

    // Armazena todos os dados do herói selecionado no registro para a GameScene usar
    this.registry.set('selectedHero', heroData);

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