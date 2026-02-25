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

    // XP Bar (Green Neon) - Positioned below Health Bar
    this.createXPBar(margin, margin + 30);

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

    // --- Controls ---
    const controlsY = margin + 60;

    // Auto Fire Toggle
    this.autoBtn = this.add.text(this.scale.width - margin, controlsY, 'AUTO: ON', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#00ff00',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.autoBtn.on('pointerdown', () => {
        const gameScene = this.scene.get('GameScene');
        if (gameScene) {
            const newState = gameScene.toggleAutoFire();
            this.autoBtn.setText(`AUTO: ${newState ? 'ON' : 'OFF'}`);
            this.autoBtn.setColor(newState ? '#00ff00' : '#ff0000');
        }
    });

    // Pause Button
    this.pauseBtn = this.add.text(this.scale.width - margin, controlsY + 20, 'PAUSE', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.pauseBtn.on('pointerdown', () => {
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.pauseManager) {
            gameScene.pauseManager.pause();
        }
    });

    // --- Center (Wave Info & Timer) ---
    this.waveText = this.add
      .text(this.scale.width / 2, margin, '', {
        ...textStyle,
        fill: '#ffffff',
        align: 'center',
        fontSize: '12px',
        stroke: '#FF5F1F',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);

    this.timerText = this.add
      .text(this.scale.width / 2, margin + 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#ffffff',
        align: 'center',
        stroke: '#FF5F1F',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0);

    // Boss Health Bar (Hidden by default)
    this.createBossHealthBar();

    // Initial population
    this.updateHealth({ health: 0, maxHealth: 0 });
    this.updateXP({ accountLevel: 1, accountXP: 0 });

    // Handshake: Notify GameScene that HUD is ready
    GameEventEmitter.emit('HUD_READY');
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
    if (!this.timerText) return;

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
    const label = this.add
      .text(0, 8, 'HP', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#00FFFF',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5);

    // Bar Background (Black with Border)
    const barX = 30;
    const barW = 150;
    const barH = 18;

    this.healthBarBg = this.add.nineslice(
      barX + barW / 2,
      8, // Center Y
      'ui_panel',
      0,
      barW,
      barH,
      6, 6, 6, 6
    );
    this.healthBarBg.setTint(0x00ffff); // Cyan Border

    // Bar Fill (Graphics)
    this.healthBarFill = this.add.graphics();

    // Text Value
    this.healthValueText = this.add
      .text(barX + barW / 2, 8, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.healthBarContainer.add([
      label,
      this.healthBarBg,
      this.healthBarFill,
      this.healthValueText,
    ]);

    this.healthBarDims = { x: barX, y: 8 - barH / 2, w: barW, h: barH };
  }

  updateHealth({ health, maxHealth }) {
    if (!this.healthBarFill || !this.healthValueText) return;

    const pct = maxHealth > 0 ? Phaser.Math.Clamp(health / maxHealth, 0, 1) : 0;
    const { x, y, w, h } = this.healthBarDims;

    this.healthBarFill.clear();
    // Background of bar (Darker Cyan)
    this.healthBarFill.fillStyle(0x003333, 1);
    this.healthBarFill.fillRect(x + 4, y + 4, w - 8, h - 8);

    // Fill (Bright Cyan Gradient-ish)
    this.healthBarFill.fillStyle(0x00ffff, 1);
    this.healthBarFill.fillRect(x + 4, y + 4, (w - 8) * pct, h - 8);

    // Shine (Top half)
    this.healthBarFill.fillStyle(0xffffff, 0.3);
    this.healthBarFill.fillRect(x + 4, y + 4, (w - 8) * pct, (h - 8) / 2);

    this.healthValueText.setText(`${Math.max(0, Math.floor(health))}/${maxHealth}`);
  }

  createXPBar(x, y) {
    this.xpBarContainer = this.add.container(x, y);

    // Label "Lvl: X"
    this.levelText = this.add.text(0, 8, 'Lv.1', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      fill: '#00FF00', // Green
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);

    // Bar Config
    const barX = 45; // Start after 'Lv.X'
    const barW = 135; // Slightly narrower than HP
    const barH = 14;  // Thinner than HP

    // Background Panel
    this.xpBarBg = this.add.nineslice(
      barX + barW / 2,
      8,
      'ui_panel',
      0,
      barW,
      barH,
      4, 4, 4, 4
    );
    this.xpBarBg.setTint(0x00ff00); // Green Border

    // Bar Fill
    this.xpBarFill = this.add.graphics();

    // Text Value
    this.xpText = this.add.text(barX + barW / 2, 8, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '8px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
    }).setOrigin(0.5);

    this.xpBarContainer.add([
      this.levelText,
      this.xpBarBg,
      this.xpBarFill,
      this.xpText
    ]);

    this.xpBarDims = { x: barX, y: 8 - barH / 2, w: barW, h: barH };
  }

  updateXP({ accountLevel, accountXP }) {
    if (!this.xpBarFill || !this.levelText || !this.xpText) return;

    // Update Label
    this.levelText.setText(`Lv.${accountLevel}`);

    // Calculation
    const xpForCurrentLevel = getExperienceForLevel(accountLevel);
    const xpForNextLevel = getExperienceForLevel(accountLevel + 1);
    const xpEarnedInLevel = accountXP - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;

    // Update Text
    this.xpText.setText(`${xpEarnedInLevel}/${xpNeededForLevel}`);

    // Update Fill
    const pct = xpNeededForLevel > 0
      ? Phaser.Math.Clamp(xpEarnedInLevel / xpNeededForLevel, 0, 1)
      : 0;

    const { x, y, w, h } = this.xpBarDims;

    this.xpBarFill.clear();
    // Background (Dark Green)
    this.xpBarFill.fillStyle(0x003300, 1);
    this.xpBarFill.fillRect(x + 3, y + 3, w - 6, h - 6);

    // Fill (Bright Green)
    this.xpBarFill.fillStyle(0x00ff00, 1);
    this.xpBarFill.fillRect(x + 3, y + 3, (w - 6) * pct, h - 6);

    // Shine
    this.xpBarFill.fillStyle(0xffffff, 0.3);
    this.xpBarFill.fillRect(x + 3, y + 3, (w - 6) * pct, (h - 6) / 2);
  }

  createBossHealthBar() {
    // TASK FORCE: GIANT HEALTH BAR
    const w = this.scale.width * 0.9; // 90% Width
    const h = 32; // Taller
    const x = this.scale.width / 2;
    const y = 80; // Below main HUD

    this.bossHealthContainer = this.add.container(x, y);
    this.bossHealthContainer.setVisible(false);

    // Bg (Dark Souls style: Dark Red/Black bg)
    const bg = this.add.nineslice(0, 0, 'ui_panel', 0, w, h, 8, 8, 8, 8);
    bg.setOrigin(0.5); // Ensure center origin for correct alignment
    bg.setTint(0x330000); // Dark Red background

    // Fill
    this.bossHealthFill = this.add.graphics();

    // Border Frame (Overlay)
    // We can use another nineslice or just graphics stroke
    const border = this.add.graphics();
    border.lineStyle(4, 0xff5f1f, 1); // Thick Orange Border
    border.strokeRect(-w/2, -h/2, w, h);

    // Label
    const label = this.add
      .text(-w/2 + 10, -h/2 - 15, 'BOSS', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#FF5F1F',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5); // Left Aligned

    // Text
    this.bossHealthText = this.add
      .text(0, 0, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
      })
      .setOrigin(0.5);

    this.bossHealthContainer.add([
      bg,
      this.bossHealthFill,
      border,
      label,
      this.bossHealthText,
    ]);
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
        duration: 500,
      });
    }
  }

  updateBossHealth({ health, maxHealth }) {
    if (!this.bossHealthContainer || !this.bossHealthContainer.visible || !this.bossHealthFill || !this.bossHealthText) return;

    const pct = Phaser.Math.Clamp(health / maxHealth, 0, 1);
    const { w, h } = this.bossHealthDims;

    this.bossHealthFill.clear();
    this.bossHealthFill.fillStyle(0xff5f1f, 1);
    // Centered fill requires offset logic or just fillRect relative to center
    // Bg is centered at 0,0. Left is -w/2.
    this.bossHealthFill.fillRect(-w / 2 + 4, -h / 2 + 4, (w - 8) * pct, h - 8);

    this.bossHealthText.setText(
      `${Math.max(0, Math.ceil(health))}/${maxHealth}`
    );
  }

  hideBossHealth() {
    if (this.bossHealthContainer) {
      this.tweens.add({
        targets: this.bossHealthContainer,
        alpha: 0,
        duration: 500,
        onComplete: () => this.bossHealthContainer.setVisible(false),
      });
    }
  }

  updateWave({ world, phase, isBoss }) {
    if (!this.waveText) return;

    const waveCounter = isBoss ? 'BOSS' : `${phase}`;
    // TASK FORCE: STAGE UI UPDATE
    this.waveText.setText(`STAGE ${waveCounter}`);
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
