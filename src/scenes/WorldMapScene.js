import { Stages } from '../config/Stages.js';
import api from '../api.js';

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMapScene');
  }

  create() {
    // 1. Background
    this.add
      .image(this.scale.width / 2, this.scale.height / 2, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(480, 800);

    // 2. Header
    this.add
      .text(this.scale.width / 2, 50, 'WORLD MAP', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // 3. Get Hero & Progress
    const selectedHero = this.registry.get('selectedHero');
    if (!selectedHero) {
      console.error('No hero selected! returning to menu.');
      this.scene.start('MenuScene');
      return;
    }

    // Fetch max_stage from API/State (Mock for now, but good practice)
    // Since we are in the scene, we can use the async API but for now let's trust the hero object
    // if it was updated. If not, we might need to fetch fresh data.
    // Let's re-fetch the hero data to be safe, or just use what's in registry if updated.
    // Actually, let's use the API to get the specific hero's progress to be sure.
    // Since api.getHeroes() returns all, we find ours.
    // optimizing: just use the hero object passed, assuming MenuScene refreshes it.
    // But wait, if we win a game, we come back here? Or to Menu?
    // If we come back here, we need fresh data.

    // Let's assume for now we use the registry hero, and if it's stale, we might need a refresh logic.
    // Better: Fetch fresh hero data on create.
    this.loadHeroData(selectedHero.id);
  }

  async loadHeroData(heroId) {
    // Show loading?
    const response = await api.getHeroes();
    if (response.success) {
      const hero = response.heroes.find((h) => h.id === heroId);
      if (hero) {
        this.currentHero = hero;
        this.renderMap();
      } else {
        this.scene.start('MenuScene');
      }
    }
  }

  renderMap() {
    const maxStage = this.currentHero.max_stage || 1;

    // Draw Connections first (so they are behind nodes)
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0xffffff, 0.5);

    Stages.forEach((stage) => {
      if (stage.req_stage > 0) {
        const prevStage = Stages.find((s) => s.id === stage.req_stage);
        if (prevStage) {
          graphics.beginPath();
          graphics.moveTo(prevStage.x, prevStage.y);
          graphics.lineTo(stage.x, stage.y);
          graphics.strokePath();
        }
      }
    });

    // Draw Nodes
    Stages.forEach((stage) => {
      const isUnlocked = stage.id <= maxStage;
      const isNext = stage.id === maxStage;

      const node = this.add
        .image(stage.x, stage.y, 'btn_menu')
        .setOrigin(0.5)
        .setScale(isUnlocked ? 0.6 : 0.5); // Smaller if locked

      // Tint logic
      if (!isUnlocked) {
        node.setTint(0x555555); // Grey out
      } else if (isNext) {
        node.setTint(0xffff00); // Highlight current frontier
        // Pulse animation for the next stage
        this.tweens.add({
          targets: node,
          scale: 0.65,
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      } else {
        node.setTint(0x00ff00); // Completed (Green-ish)
      }

      // Text Label
      this.add
        .text(stage.x, stage.y, stage.id.toString(), {
          fontFamily: '"Press Start 2P"',
          fontSize: '16px',
          color: isUnlocked ? '#ffffff' : '#aaaaaa',
        })
        .setOrigin(0.5);

      // Name Label (below)
      this.add
        .text(stage.x, stage.y + 35, stage.name, {
          fontFamily: '"Press Start 2P"',
          fontSize: '10px',
          color: isUnlocked ? '#ffffff' : '#888888',
          align: 'center',
        })
        .setOrigin(0.5);

      // Interaction
      if (isUnlocked) {
        node
          .setInteractive({ useHandCursor: true })
          .on('pointerup', () => this.selectStage(stage));

        // Hover effect
        node.on('pointerover', () => node.setScale(0.7));
        node.on('pointerout', () => node.setScale(0.6));
      }
    });

    // Back Button
    const backBtn = this.add
      .image(60, 50, 'btn_menu') // Reusing btn_menu or creating a simple text
      .setOrigin(0.5)
      .setScale(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('MenuScene'));

    this.add
      .text(60, 50, 'BACK', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
  }

  selectStage(stageData) {
    console.log(`Selected Stage: ${stageData.name}`);
    // Transition to GameScene with the config
    this.scene.start('GameScene', {
      stageConfig: stageData,
      hero: this.currentHero, // Pass fresh hero data
    });
  }
}
