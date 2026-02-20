import UIModal from './UIModal.js';
import UIHelper from '../utils/UIHelper.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import TextureGenerator from '../modules/TextureGenerator.js';
import api from '../api.js';
import bcoinService from '../web3/bcoin-service.js';
import { SPELLS, RARITY } from '../config/MockNFTData.js';

const RARITY_COLORS = {
  0: 0x00ff00, // Common (Green)
  1: 0x0000ff, // Rare (Blue)
  2: 0x00ffff, // Super Rare (Cyan)
  3: 0xff0000, // Epic (Red)
  4: 0x800080, // Legend (Purple)
  5: 0xffd700, // SP Legend (Gold)
};

export default class HeroesModal extends UIModal {
  constructor(scene) {
    super(scene, 460, 600, LanguageManager.get('heroes_title', {}, 'HEROES'));
    this.heroes = [];
    this.selectedHero = null;
    this.currentSelectedId = null;
    this.populate();
  }

  async populate() {
    try {
      const [heroesRes, userRes] = await Promise.all([
        api.getHeroes(),
        api.getCurrentUser(),
      ]);

      if (!this.scene || !this.active) return; // Prevent crash if closed

      if (heroesRes.success) {
        this.heroes = heroesRes.heroes;
      }
      if (userRes.success) {
        this.currentSelectedId = userRes.user.selectedHeroId;
      }

      // Fallback selection
      if (!this.currentSelectedId && this.heroes.length > 0) {
        this.currentSelectedId = this.heroes[0].id;
        // Auto-select first if none selected
        api.setSelectedHero(this.currentSelectedId).catch(console.error);
      }

      this.selectedHero =
        this.heroes.find((h) => h.id === this.currentSelectedId) ||
        this.heroes[0];

      // Sync registry for MenuScene showcase
      if (this.selectedHero) {
        this.scene.registry.set('selectedHero', this.selectedHero);
        if (this.scene.updateHeroSprite) {
          this.scene.updateHeroSprite(this.selectedHero.sprite_name);
        }
      }

      this.renderGrid();
      this.renderDetails();
    } catch (e) {
      console.error('Failed to load heroes data', e);
      if (this.scene && this.windowContainer) {
        this.showError('Network Error.');
      }
    }
  }

  renderGrid() {
    // Clear previous grid
    if (this.gridContainer) {
      this.gridContainer.destroy();
    }
    this.gridContainer = this.scene.add.container(0, 0);
    this.windowContainer.add(this.gridContainer);

    // Layout Config (3 Columns)
    const cols = 3;
    const cardW = 120;
    const cardH = 140; // Taller cards
    const gap = 20;

    const totalW = cols * cardW + (cols - 1) * gap;
    const startX = -totalW / 2 + cardW / 2;
    const startY = -this.modalHeight / 2 + 120; // Start below title

    this.heroes.forEach((hero, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      this.createHeroCard(x, y, cardW, cardH, hero);
    });
  }

  createHeroCard(x, y, w, h, hero) {
    const container = this.scene.add.container(x, y);
    const isSelected = hero.id === this.currentSelectedId;
    const rarityColor = RARITY_COLORS[hero.rarity] || 0xffffff;

    // 1. Background (9-Slice)
    const borderColor = isSelected ? 0x00ff00 : rarityColor;
    const panel = UIHelper.createPanel(this.scene, w, h, borderColor);
    container.add(panel);

    // Selection Glow
    if (isSelected) {
      const glow = this.scene.add.graphics();
      glow.lineStyle(6, 0x00ff00, 0.4);
      glow.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
      container.addAt(glow, 0);
    }

    // 2. Avatar
    let avatarKey = hero.sprite_name;
    if (!this.scene.textures.exists(avatarKey)) {
        // Fallback: Generate procedural hero if missing
        // Use a unique key based on ID to avoid conflicts if needed,
        // but 'ninja_hero' etc are standard.
        // If the sprite_name is unknown, force generate it using the generic hero generator.
        console.warn(`Texture ${avatarKey} missing. Generating fallback.`);
        TextureGenerator.createHero(this.scene, avatarKey);
    }

    const avatar = this.scene.add.image(0, -20, avatarKey);
    // Scale to fit width/height safely
    const maxDim = Math.min(w, h) * 0.7;
    const scale = maxDim / Math.max(avatar.width, avatar.height);
    avatar.setScale(scale);
    container.add(avatar);

    // 3. Name Label (Moved down to avoid overlap)
    const nameText = this.scene.add
      .text(0, 35, hero.name.toUpperCase(), {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        color: isSelected ? '#00ff00' : '#ffffff',
        align: 'center',
        wordWrap: { width: w - 10 },
      })
      .setOrigin(0.5, 0);
    container.add(nameText);

    // 4. Level Badge (Top Right)
    const lvlBg = this.scene.add.circle(w / 2 - 15, -h / 2 + 15, 10, 0x000000);
    const lvlText = this.scene.add
      .text(w / 2 - 15, -h / 2 + 15, hero.level.toString(), {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        fill: '#ffffff',
      })
      .setOrigin(0.5);
    container.add([lvlBg, lvlText]);

    // 5. "SELECTED" Label (Bottom)
    if (isSelected) {
      const selBg = this.scene.add.graphics();
      selBg.fillStyle(0x00ff00, 1);
      selBg.fillRoundedRect(-w / 2 + 10, h / 2 - 25, w - 20, 20, 4);

      const selText = this.scene.add
        .text(
          0,
          h / 2 - 15,
          LanguageManager.get('heroes_selected', {}, 'SELECTED'),
          {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            color: '#000000',
          }
        )
        .setOrigin(0.5);

      container.add([selBg, selText]);
    }

    // Interaction
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', async () => {
      SoundManager.playClick(this.scene);
      await this.handleSelectHero(hero);
    });

    this.gridContainer.add(container);
  }

  async handleSelectHero(hero) {
    if (this.currentSelectedId === hero.id) return; // Already selected

    this.currentSelectedId = hero.id;
    this.selectedHero = hero;

    // Visual Feedback (immediate)
    this.renderGrid();
    this.renderDetails();

    // Update Backend/State
    try {
      await api.setSelectedHero(hero.id);
      // Update Menu Showcase
      this.scene.registry.set('selectedHero', hero);
      if (this.scene.updateHeroSprite) {
        this.scene.updateHeroSprite(hero.sprite_name);
      }
    } catch (e) {
      console.error('Failed to select hero', e);
    }
  }

  renderDetails() {
    if (!this.selectedHero) return;

    if (this.detailsContainer) {
      this.detailsContainer.destroy();
    }

    // Panel Position: Bottom area
    const detailsY = 180;
    this.detailsContainer = this.scene.add.container(0, detailsY);

    // Background (9-Slice)
    // Rect: -w/2 + 20, 0, w-40, 180.
    // Center x = 0. Center y = 90.
    // Width = modalWidth - 40. Height = 180.
    const w = this.modalWidth - 40;
    const h = 180;
    const panel = UIHelper.createPanel(this.scene, w, h, 0x444444);
    panel.y = h / 2; // = 90
    this.detailsContainer.add(panel);

    // --- STATS (Horizontal Layout) ---
    const stats = [
      { label: 'POW', val: this.selectedHero.stats.power, icon: '⚔️' },
      { label: 'SPD', val: this.selectedHero.stats.speed, icon: '👟' },
      { label: 'HP', val: this.selectedHero.stats.stamina, icon: '❤️' },
      { label: 'RNG', val: this.selectedHero.stats.range, icon: '🎯' },
    ];

    let statX = -this.modalWidth / 2 + 50;
    const statY = 30;
    const statGap = 90;

    stats.forEach((s) => {
      const txt = this.scene.add
        .text(statX, statY, `${s.label}\n${s.val}`, {
          fontFamily: '"Press Start 2P"',
          fontSize: '10px',
          fill: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5, 0);
      this.detailsContainer.add(txt);
      statX += statGap;
    });

    // --- SPELLS ---
    const spellY = 80;
    const spellTitle = this.scene.add
      .text(0, spellY, 'SPELLS', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#ffff00',
      })
      .setOrigin(0.5);
    this.detailsContainer.add(spellTitle);

    let spellListText = 'None';
    if (this.selectedHero.spells && this.selectedHero.spells.length > 0) {
      spellListText = this.selectedHero.spells
        .map((id) => {
          const spell = SPELLS[id];
          return spell ? spell.name : '?';
        })
        .join(', ');
    }

    const spellsTxt = this.scene.add
      .text(0, spellY + 20, spellListText, {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        fill: '#00ffff',
        align: 'center',
        wordWrap: { width: 300 },
      })
      .setOrigin(0.5);
    this.detailsContainer.add(spellsTxt);

    // --- ACTION BUTTONS (Upgrade / Reroll) ---
    const btnY = 140;

    // Upgrade
    const upgBtn = UIHelper.createNeonButton(
      this.scene,
      -100,
      btnY,
      `UPGRADE\n500 BC`,
      140,
      40,
      () => this.handleUpgradeSimple(),
      0x00ff00
    );

    // Reroll
    const rerollBtn = UIHelper.createNeonButton(
      this.scene,
      100,
      btnY,
      `REROLL\n1000 BC`,
      140,
      40,
      () => this.handleRerollSimple(),
      0xff00ff
    );

    this.detailsContainer.add([upgBtn, rerollBtn]);
    this.windowContainer.add(this.detailsContainer);
  }

  async handleUpgradeSimple() {
    try {
      SoundManager.play(this.scene, 'upgrade');
      const res = await api.upgradeHeroStat(this.selectedHero.id);
      if (!this.scene || !this.active) return;

      if (res.success) {
        this.selectedHero = res.hero;
        const idx = this.heroes.findIndex((h) => h.id === res.hero.id);
        if (idx !== -1) this.heroes[idx] = res.hero;
        this.renderDetails();
        bcoinService.updateBalance();
      } else {
        SoundManager.play(this.scene, 'error');
        this.showError('Upgrade Failed');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async handleRerollSimple() {
    try {
      SoundManager.play(this.scene, 'upgrade');
      const res = await api.rerollHeroSpells(this.selectedHero.id);
      if (!this.scene || !this.active) return;

      if (res.success) {
        this.selectedHero = res.hero;
        const idx = this.heroes.findIndex((h) => h.id === res.hero.id);
        if (idx !== -1) this.heroes[idx] = res.hero;
        this.renderDetails();
        bcoinService.updateBalance();
      } else {
        SoundManager.play(this.scene, 'error');
        this.showError('Reroll Failed');
      }
    } catch (e) {
      console.error(e);
    }
  }

  showError(msg) {
    console.warn(msg);
  }
}
