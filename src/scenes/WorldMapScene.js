import { Stages } from '../config/Stages.js';
import api from '../api.js';

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMapScene');
  }

  create() {
    // 1. Background (Fixed to Camera or Scrolled?)
    // If we want it to scroll with the map, just add it.
    // If fixed, use scrollFactor(0).
    // Given the vertical nature, repeating/tiled background is best, or a very tall one.
    // For now, let's make it fixed so it doesn't look weird if it's small.
    // But the prompt says "menu_bg_vertical" which implies it might be tall?
    // Let's stick to fixed for safety, or tile it.
    this.add
      .tileSprite(240, 400, 480, 800, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setScrollFactor(0); // Fixed background

    // 2. Header (Fixed UI)
    this.add
      .text(240, 50, 'WORLD MAP', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);

    // 3. Setup Camera & Bounds
    // Map goes from Y=100 (Stage 30) to Y=3000 (Stage 1).
    // We add some padding.
    const mapHeight = 3200;
    this.cameras.main.setBounds(0, 0, 480, mapHeight);

    // Enable Mouse Drag
    this.input.on('pointermove', (pointer) => {
        if (!pointer.isDown) return;

        // Calculate delta
        const dy = (pointer.y - pointer.prevPosition.y);

        // Scroll camera (inverted)
        this.cameras.main.scrollY -= dy;
    });

    // 4. Get Hero & Progress
    const selectedHero = this.registry.get('selectedHero');

    // Fallback if accessed directly (though unlikely in prod flow)
    if (!selectedHero) {
      // Try to load from API or return to menu
      console.warn('No hero selected in registry, returning to menu.');
      this.scene.start('MenuScene');
      return;
    }

    this.currentHero = selectedHero;
    // We can fetch fresh data asynchronously but render what we have first
    this.renderMap();

    // Center camera on the furthest unlocked stage
    this.focusOnProgress();
  }

  focusOnProgress() {
      if (!this.currentHero) return;
      const maxStageId = this.currentHero.max_stage || 1;
      const targetStage = Stages.find(s => s.id === maxStageId);

      if (targetStage) {
          // Center the camera on the node
          this.cameras.main.centerOn(240, targetStage.y);
      } else {
          // Default to bottom (Stage 1)
          this.cameras.main.scrollY = 2400;
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

      // Use 'btn_menu' or a circle if missing
      const nodeKey = this.textures.exists('btn_menu') ? 'btn_menu' : null;

      let node;
      if (nodeKey) {
          node = this.add.image(stage.x, stage.y, nodeKey).setOrigin(0.5);
      } else {
          node = this.add.circle(stage.x, stage.y, 20, 0xffffff);
      }

      node.setScale(isUnlocked ? 0.6 : 0.5); // Smaller if locked

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
        node.setInteractive({ useHandCursor: true });

        // Prevent click if we were dragging
        let isDragging = false;

        node.on('pointerdown', () => { isDragging = false; });
        node.on('pointermove', () => {
            if (this.input.activePointer.isDown) isDragging = true;
        });

        node.on('pointerup', () => {
            if (!isDragging) {
                this.selectStage(stage);
            }
        });

        // Hover effect
        node.on('pointerover', () => node.setScale(0.7));
        node.on('pointerout', () => node.setScale(0.6));
      }
    });

    // Back Button (Fixed)
    const backBtn = this.add
      .image(60, 50, 'btn_menu') // Reusing btn_menu or creating a simple text
      .setOrigin(0.5)
      .setScale(0.5)
      .setScrollFactor(0) // Fixed to camera
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.scene.start('MenuScene'));

    this.add
      .text(60, 50, 'BACK', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100);
  }

  selectStage(stageData) {
    console.log(`Selected Stage: ${stageData.name}`);
    // Transition to GameScene with the config
    this.scene.start('GameScene', {
      stageConfig: stageData,
      gameMode: 'solo', // Task Force: Unify Payload
      hero: this.currentHero, // Pass fresh hero data
    });
  }
}
