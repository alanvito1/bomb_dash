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
    // Health (Hearts)
    this.add.text(margin, margin, 'HP', {
      ...textStyle,
      fill: '#ff4d4d',
    });

    // Pixel Art Hearts Group
    this.heartsGroup = this.add.group();
    // Create 5 hearts placeholders
    for (let i = 0; i < 5; i++) {
      this.heartsGroup.create(margin + 40 + i * 18, margin + 8, 'heart_empty');
    }

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
      })
      .setOrigin(0.5, 0);

    this.timerText = this.add
      .text(this.scale.width / 2, margin + 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5, 0);

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

  updateHealth({ health, maxHealth }) {
    if (!this.heartsGroup) return;

    // Logic: 5 Hearts total.
    const healthPercentage =
      maxHealth > 0 ? Phaser.Math.Clamp(health / maxHealth, 0, 1) : 0;
    const heartsToFill = Math.ceil(healthPercentage * 5);

    const hearts = this.heartsGroup.getChildren();
    hearts.forEach((heart, index) => {
      if (index < heartsToFill) {
        heart.setTexture('heart_full');
        heart.setVisible(true);
      } else {
        heart.setTexture('heart_empty');
        heart.setVisible(true);
      }
    });
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
    }
    GameEventEmitter.off(
      'bcoin-balance-update',
      this.handleBalanceUpdate,
      this
    );
  }
}
