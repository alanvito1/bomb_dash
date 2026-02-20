import LanguageManager from '../utils/LanguageManager.js';
import { getExperienceForLevel } from '../utils/rpg.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

export default class HUDScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HUDScene', active: false });

    // UI Elements
    this.healthText = null;
    this.healthBar = null;
    this.xpText = null;
    this.xpBar = null;
    this.levelText = null;
    this.waveText = null;
    this.bcoinText = null;
    this.buffText = null;
  }

  create() {
    this.createHUD();
    this.setupEventListeners();
  }

  createHUD() {
    // Expose HUD to GameScene for direct calls from logic modules
    const gameScene = this.scene.get('GameScene');
    if (gameScene) gameScene.hud = this;

    const margin = 15;
    const textStyle = { fontFamily: '"Press Start 2P"', fontSize: '14px' };
    const valueStyle = { ...textStyle, fontSize: '12px', fill: '#ffffff' };

    // --- Left Side (Player Stats) ---
    // Health Bar (Cyan Neon)
    this.createHealthBar(margin, margin);

    // XP Bar
    this.levelText = this.add.text(margin, margin + 35, `Lvl: 1`, {
      ...textStyle,
      fill: '#00ff00',
      fontSize: '10px',
    });
    this.xpBar = this.add.graphics();
    this.xpText = this.add.text(margin + 40, margin + 50, '', {
      ...valueStyle,
      fontSize: '10px',
    });

    // --- Right Side (Currency & Buffs) ---
    this.bcoinText = this.add
      .text(this.scale.width - margin, margin, '', {
        ...textStyle,
        fill: '#ffd700',
        align: 'right',
      })
      .setOrigin(1, 0);

    // Buff Icons Container
    this.buffContainer = this.add.container(
      this.scale.width - margin,
      margin + 30
    );

    // --- Center (Wave Info & Timer) ---
    this.waveText = this.add
      .text(this.scale.width / 2, margin, '', {
        ...textStyle,
        fill: '#ffffff',
        align: 'center',
        fontSize: '12px',
        stroke: '#FF5F1F',
        strokeThickness: 4
      })
      .setOrigin(0.5, 0);

    this.timerText = this.add
      .text(this.scale.width / 2, margin + 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#ffffff',
        align: 'center',
        stroke: '#FF5F1F',
        strokeThickness: 4
      })
      .setOrigin(0.5, 0);

    // Boss Health Bar (Hidden by default)
    this.createBossHealthBar();

    // Initial population
    this.updateHealth({ health: 0, maxHealth: 0 });
    this.updateXP({ accountLevel: 1, accountXP: 0 });
  }

  setupEventListeners() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.on('update-health', this.updateHealth, this);
      gameScene.events.on('update-xp', this.updateXP, this);
      gameScene.events.on('update-wave', this.updateWave, this);
      gameScene.events.on('update-timer', this.updateTimer, this);
      gameScene.events.on('update-bcoin', this.handleBalanceUpdate, this);

      // Boss Events
      gameScene.events.on('show-boss-health', this.showBossHealth, this);
      gameScene.events.on('update-boss-health', this.updateBossHealth, this);
      gameScene.events.on('hide-boss-health', this.hideBossHealth, this);
    }
    GameEventEmitter.on('bcoin-balance-update', this.handleBalanceUpdate, this);
  }

  updateTimer({ time }) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);

    if (time <= 10) {
      this.timerText.setColor('#ff0000');
      // Simple pulse effect via font size or scale
      this.timerText.setScale(time % 2 === 0 ? 1.2 : 1.0);
    } else {
      this.timerText.setColor('#ffffff');
      this.timerText.setScale(1);
    }
  }

  showPowerup(id, duration) {
    // Add icon to container if not exists
    let icon = this.buffContainer.getByName(id);
    if (!icon) {
      // Use the texture id directly
      if (this.textures.exists(id)) {
        icon = this.add.image(0, 0, id).setDisplaySize(16, 16).setName(id);
        this.buffContainer.add(icon);
        this.layoutBuffs();
      } else {
        // Fallback text
        icon = this.add
          .text(0, 0, id[0].toUpperCase(), {
            fontSize: '10px',
            color: '#00ffff',
          })
          .setName(id);
        this.buffContainer.add(icon);
        this.layoutBuffs();
      }
    }
  }

  removePowerup(id) {
    const icon = this.buffContainer.getByName(id);
    if (icon) {
      icon.destroy();
      this.layoutBuffs();
    }
  }

  layoutBuffs() {
    let x = 0;
    this.buffContainer.each((child) => {
      child.x = x;
      x -= 20; // Stack to the left
    });
  }

  createHealthBar(x, y) {
      // Container
      this.healthBarContainer = this.add.container(x, y);

      // Label
      const label = this.add.text(0, 8, 'HP', {
          fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#00FFFF'
      }).setOrigin(0, 0.5);

      // Bar Background (Black with Border)
      const barX = 30;
      const barW = 150;
      const barH = 16;

      this.healthBarBg = this.add.nineslice(barX + barW/2, 8, 'ui_panel', 0, barW, barH, 5, 5, 5, 5);
      this.healthBarBg.setTint(0x00FFFF); // Cyan Border

      // Bar Fill (Graphics)
      this.healthBarFill = this.add.graphics();

      // Text Value
      this.healthValueText = this.add.text(barX + barW/2, 8, '', {
           fontFamily: '"Press Start 2P"', fontSize: '8px', fill: '#ffffff'
      }).setOrigin(0.5);

      this.healthBarContainer.add([label, this.healthBarBg, this.healthBarFill, this.healthValueText]);

      // Store dimensions for update
      this.healthBarDims = { x: barX, y: 0, w: barW, h: barH };
  }

  updateHealth({ health, maxHealth }) {
    if (!this.healthBarFill) return;

    const pct = maxHealth > 0 ? Phaser.Math.Clamp(health / maxHealth, 0, 1) : 0;
    const { x, y, w, h } = this.healthBarDims;

    this.healthBarFill.clear();
    // Fill
    this.healthBarFill.fillStyle(0x00FFFF, 1);
    this.healthBarFill.fillRect(x + 2, y + 2, (w - 4) * pct, h - 4);

    this.healthValueText.setText(`${Math.max(0, health)}/${maxHealth}`);
  }

  createBossHealthBar() {
      const w = 300;
      const h = 24;
      const x = this.scale.width / 2;
      const y = 80; // Below HUD

      this.bossHealthContainer = this.add.container(x, y);
      this.bossHealthContainer.setVisible(false);

      // Label
      const label = this.add.text(0, -20, 'BOSS', {
          fontFamily: '"Press Start 2P"', fontSize: '12px', fill: '#FF5F1F', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5);

      // Bg
      const bg = this.add.nineslice(0, 0, 'ui_panel', 0, w, h, 8, 8, 8, 8);
      bg.setTint(0xFF5F1F); // Orange Border

      // Fill
      this.bossHealthFill = this.add.graphics();

      // Text
      this.bossHealthText = this.add.text(0, 0, '', {
          fontFamily: '"Press Start 2P"', fontSize: '10px', fill: '#ffffff'
      }).setOrigin(0.5);

      this.bossHealthContainer.add([label, bg, this.bossHealthFill, this.bossHealthText]);
      this.bossHealthDims = { w, h };
  }

  showBossHealth({ name, maxHealth }) {
      if (this.bossHealthContainer) {
          this.bossHealthContainer.setVisible(true);
          this.bossHealthText.setText(`${maxHealth}/${maxHealth}`);
          this.updateBossHealth({ health: maxHealth, maxHealth });

          // Animate in?
          this.bossHealthContainer.setAlpha(0);
          this.tweens.add({
              targets: this.bossHealthContainer,
              alpha: 1,
              duration: 500
          });
      }
  }

  updateBossHealth({ health, maxHealth }) {
      if (!this.bossHealthContainer || !this.bossHealthContainer.visible) return;

      const pct = Phaser.Math.Clamp(health / maxHealth, 0, 1);
      const { w, h } = this.bossHealthDims;

      this.bossHealthFill.clear();
      this.bossHealthFill.fillStyle(0xFF5F1F, 1);
      // Centered fill requires offset logic or just fillRect relative to center
      // Bg is centered at 0,0. Left is -w/2.
      this.bossHealthFill.fillRect(-w/2 + 4, -h/2 + 4, (w - 8) * pct, h - 8);

      this.bossHealthText.setText(`${Math.max(0, Math.ceil(health))}/${maxHealth}`);
  }

  hideBossHealth() {
      if (this.bossHealthContainer) {
          this.tweens.add({
              targets: this.bossHealthContainer,
              alpha: 0,
              duration: 500,
              onComplete: () => this.bossHealthContainer.setVisible(false)
          });
      }
  }

  updateXP({ accountLevel, accountXP }) {
    const barWidth = 180;
    const barHeight = 16;
    const barX = 100;
    const barY = 60;

    this.levelText.setText(`Lvl: ${accountLevel}`);

    const xpForCurrentLevel = getExperienceForLevel(accountLevel);
    const xpForNextLevel = getExperienceForLevel(accountLevel + 1);
    const xpEarnedInLevel = accountXP - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

    this.xpText.setText(`${xpEarnedInLevel} / ${xpNeededForLevel}`);

    const xpPercentage =
      xpNeededForLevel > 0
        ? Phaser.Math.Clamp(xpEarnedInLevel / xpNeededForLevel, 0, 1)
        : 0;
    this.xpBar.clear();
    this.xpBar.fillStyle(0x000000, 0.5);
    this.xpBar.fillRect(barX, barY, barWidth, barHeight);
    this.xpBar.fillStyle(0x00ff00);
    this.xpBar.fillRect(barX, barY, barWidth * xpPercentage, barHeight);
  }

  updateWave({ world, phase, isBoss }) {
    const waveCounter = isBoss ? 'BOSS' : `${phase}/7`;
    this.waveText.setText(`World ${world} | Wave ${waveCounter}`);
  }

  handleBalanceUpdate({ balance, error }) {
    if (!this.scene || !this.sys || !this.active) return;
    if (!this.bcoinText || !this.bcoinText.active) return;

    if (error) {
      this.bcoinText.setText(LanguageManager.get('hud_bcoin_error'));
    } else {
      const formattedBalance = parseFloat(balance).toFixed(2);
      this.bcoinText.setText(`$BCOIN: ${formattedBalance}`);
    }
  }

  shutdown() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.off('update-health', this.updateHealth, this);
      gameScene.events.off('update-xp', this.updateXP, this);
      gameScene.events.off('update-wave', this.updateWave, this);
      gameScene.events.off('update-timer', this.updateTimer, this);
      gameScene.events.off('update-bcoin', this.handleBalanceUpdate, this);
      gameScene.events.off('show-boss-health', this.showBossHealth, this);
      gameScene.events.off('update-boss-health', this.updateBossHealth, this);
      gameScene.events.off('hide-boss-health', this.hideBossHealth, this);
    }
    GameEventEmitter.off(
      'bcoin-balance-update',
      this.handleBalanceUpdate,
      this
    );
  }
}
