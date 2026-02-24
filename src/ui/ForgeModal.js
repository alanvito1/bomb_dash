import UIModal from './UIModal.js';
import UIHelper from '../utils/UIHelper.js';
import playerStateService from '../services/PlayerStateService.js';
import SoundManager from '../utils/sound.js';

export default class ForgeModal extends UIModal {
  constructor(scene) {
    super(scene, 600, 600, 'ETERNAL FORGE');
    this.selectedHero = null;
    this.populate();
  }

  populate() {
    // Get selected hero from registry or service
    const savedHero = this.scene.registry.get('selectedHero');
    if (savedHero) {
      // Find the up-to-date hero object from service to ensure we have latest stats
      const heroes = playerStateService.getHeroes();
      this.selectedHero =
        heroes.find((h) => h.id === savedHero.id) || savedHero;
    } else {
      // Fallback
      this.selectedHero = playerStateService.getHeroes()[0];
    }

    this.refreshUI();
  }

  refreshUI() {
    this.windowContainer.removeAll(true);

    if (!this.selectedHero) {
      this.addText(0, 0, 'No Hero Selected', '#888');
      return;
    }

    // 1. Resources Header (Fragments)
    this.createResourcesHeader();

    // 2. Hero Showcase (Sprite + Stats)
    this.createHeroShowcase();

    // 3. Level Up Section
    this.createLevelUpSection();
  }

  createResourcesHeader() {
    const y = -this.modalHeight / 2 + 60;

    // Background Panel for Resources (9-Slice)
    // Center x=0. createPanel creates at 0,0. We need to center it?
    // nineslice origin is 0.5 by default in Phaser 3? No, usually 0.5.
    // My UIHelper creates nineslice. By default origin is 0.5.
    const panel = UIHelper.createPanel(this.scene, 400, 40, 0x00ffff);
    panel.y = y;
    this.windowContainer.add(panel);

    // Common Fragments
    const commonCount = playerStateService.getFragmentCount('Common');
    const cIcon = this.scene.add.circle(-100, y, 8, 0xaaaaaa); // Grey dot
    const cText = this.scene.add
      .text(-80, y, `COMMON: ${commonCount}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#AAAAAA',
      })
      .setOrigin(0, 0.5);

    // BCOIN Balance (Mocked check from service)
    const user = playerStateService.getUser();
    const bcoinText = this.scene.add
      .text(50, y, `BCOIN: ${user.bcoin}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#FFD700',
      })
      .setOrigin(0, 0.5);

    this.windowContainer.add([cIcon, cText, bcoinText]);
  }

  createHeroShowcase() {
    const y = -80;

    // Hero Sprite
    const spriteKey = this.selectedHero.sprite_name || 'ninja_hero';
    if (this.scene.textures.exists(spriteKey)) {
      const sprite = this.scene.add.image(0, y, spriteKey).setScale(3);
      // Floating animation
      this.scene.tweens.add({
        targets: sprite,
        y: y - 10,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.windowContainer.add(sprite);
    }

    // Hero Name
    this.addText(
      0,
      y + 80,
      this.selectedHero.name || 'Unknown Hero',
      '#FFFFFF',
      '16px'
    );

    // Current Level Display
    const currentLevel = this.selectedHero.level || 1;
    this.addText(0, y + 110, `LEVEL ${currentLevel}`, '#00FFFF', '20px');

    // Task Force: Summoner's Journey Bonus
    const accountLevel = playerStateService.getAccountLevel();
    if (accountLevel > 0) {
      this.addText(
        0,
        y + 135,
        `SUMMONER BUFF: +${accountLevel}% STATS`,
        '#00FF00',
        '10px'
      );
    }
  }

  createLevelUpSection() {
    const y = 80;

    // Panel (9-Slice) - Larger for grid
    const panel = UIHelper.createPanel(this.scene, 520, 240, 0x444444);
    panel.y = y + 100;
    this.windowContainer.add(panel);

    const stats = playerStateService.getHeroStats(this.selectedHero.id);
    const levels = stats ? stats.levels : { speed: 0, power: 0, range: 0, fireRate: 0 };

    this.addText(0, y + 5, 'TRAINING GROUND (0.01% BONUS)', '#00FFFF', '12px');

    const btnW = 200;
    const btnH = 50;
    const gapX = 220;
    const gapY = 70;
    const startX = -110;
    const startY = y + 50;

    // Skill Config
    const skills = [
        { key: 'power', label: 'POWER', val: levels.power },
        { key: 'speed', label: 'SPEED', val: levels.speed },
        { key: 'range', label: 'RANGE', val: levels.range },
        { key: 'fireRate', label: 'FIRE RT', val: levels.fireRate }
    ];

    skills.forEach((s, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);

        const bx = startX + (col * gapX);
        const by = startY + (row * gapY);

        const btn = UIHelper.createNeonButton(
            this.scene,
            bx,
            by,
            `${s.label} L${s.val.toFixed(0)}\n1 BC (+0.01%)`,
            btnW,
            btnH,
            () => this.handleSkillUp(s.key),
            0x00ff00
        );
        this.windowContainer.add(btn);
    });
  }

  async handleSkillUp(skillType) {
    const res = await playerStateService.upgradeHeroSkill(this.selectedHero.id, skillType);

    if (res.success) {
      SoundManager.play(this.scene, 'level_up');
      this.showFloatingText(0, 0, `${skillType.toUpperCase()} UP!`, '#00FF00');

      // Update local hero reference
      this.selectedHero = res.hero;
      // Sync registry
      this.scene.registry.set('selectedHero', this.selectedHero);

      this.refreshUI();
    } else {
      SoundManager.play(this.scene, 'error');
      // Show error text instead of alert for better UX?
      this.showFloatingText(0, 0, res.message || 'FAILED', '#FF0000');
    }
  }

  showFloatingText(x, y, message, color) {
    const text = this.scene.add
      .text(x, y, message, {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        fill: color,
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.windowContainer.add(text);

    this.scene.tweens.add({
      targets: text,
      y: y - 100,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }

  addText(x, y, text, color, size = '12px') {
    const t = this.scene.add
      .text(x, y, text, {
        fontFamily: '"Press Start 2P"',
        fontSize: size,
        fill: color,
        align: 'center',
      })
      .setOrigin(0.5);
    this.windowContainer.add(t);
  }
}
