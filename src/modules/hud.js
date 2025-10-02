export default class HUD {
  constructor(scene) {
    this.scene = scene;
    this.powerupIcons = {};
    this.powerupText = {};
  }

  create(playerStats) {
    const addText = (x, y, label, value, color = '#ffffff', size = '16px') => {
      return this.scene.add.text(x, y, `${label}: ${value}`, {
        fontSize: size,
        fill: color,
        fontFamily: 'monospace'
      });
    };

    // --- Linha Superior: Level, XP, Moedas ---
    this.levelText = addText(10, 10, 'LV', playerStats?.level ?? 1, '#FFD700', '20px');

    // Barra de XP
    this.xpBarBg = this.scene.add.graphics();
    this.xpBarBg.fillStyle(0x333333, 1);
    this.xpBarBg.fillRect(55, 12, 150, 18);
    this.xpBar = this.scene.add.graphics();
    this.xpText = this.scene.add.text(130, 13, 'XP', { fontSize: '14px', fill: '#ffffff' }).setOrigin(0.5, 0);

    this.coinTotalText = addText(220, 10, '💰', playerStats?.coins ?? 0, '#ffff00', '20px');

    // --- Informações de Jogo (canto esquerdo) ---
    this.stageText = addText(10, 40, '🗺️ STAGE', '1-1', '#FFD700');
    this.scoreText = addText(10, 60, '🏆 Score', 0);
    this.enemiesLeftText = addText(10, 80, '👾 Enemies', '??', '#ffcc66');
    this.lifeText = addText(10, 100, '❤️ Lives', playerStats?.extraLives ?? 1, '#ff9999');
  }

  update(stats = {}) {
    const s = {
      score: stats.score ?? this.scene.score ?? 0,
      level: stats.level ?? this.scene.playerStats?.level ?? 1,
      xp: stats.xp ?? this.scene.playerStats?.xp ?? 0,
      coins: stats.coins ?? this.scene.playerStats?.coins ?? 0,
      extraLives: stats.extraLives ?? this.scene.playerStats?.extraLives ?? 1,
    };

    // Atualiza Level e XP
    this.levelText.setText(`LV: ${s.level}`);
    const xpForNextLevel = s.level * 100; // Formula de XP
    const xpProgress = Math.min(s.xp / xpForNextLevel, 1);

    this.xpBar.clear();
    this.xpBar.fillStyle(0x00ff00, 1);
    this.xpBar.fillRect(56, 13, 148 * xpProgress, 16);
    this.xpText.setText(`${s.xp} / ${xpForNextLevel}`);

    // Atualiza outros textos
    this.coinTotalText.setText(`💰 ${Math.floor(s.coins)}`);
    this.scoreText.setText(`🏆 Score: ${s.score}`);
    this.lifeText.setText(`❤️ Lives: ${s.extraLives}`);

    const count = this.scene.enemies?.countActive(true) ?? '...';
    this.enemiesLeftText.setText(`👾 Enemies: ${count}`);

    const stageCode = this.scene.stageCode ?? `1-1`;
    this.stageText.setText(`🗺️ STAGE ${stageCode}`);
  }

  updateHUD() {
    this.update();
  }

  showPowerup(id, seconds) {
    const keys = Object.keys(this.powerupIcons);
    const index = keys.indexOf(id) !== -1 ? keys.indexOf(id) : keys.length;
    const baseX = 10 + index * 40;
    const baseY = 180;

    if (!this.powerupIcons[id]) {
      this.powerupIcons[id] = this.scene.add.image(baseX, baseY, id)
        .setDisplaySize(24, 24)
        .setOrigin(0);
    }

    if (!this.powerupText[id]) {
      this.powerupText[id] = this.scene.add.text(baseX + 2, baseY + 26, `${seconds}s`, {
        fontSize: '12px',
        fill: '#ffff00',
        fontFamily: 'monospace'
      }).setOrigin(0);
    }

    this.powerupText[id].setText(`${seconds}s`);
  }

  removePowerup(id) {
    this.powerupIcons[id]?.destroy();
    delete this.powerupIcons[id];

    this.powerupText[id]?.destroy();
    delete this.powerupText[id];
  }

  showTemporaryMessage(message, duration = 3000, color = '#ff0000') {
    if (this.temporaryMessage) {
      this.temporaryMessage.destroy();
    }

    const centerX = this.scene.cameras.main.centerX;
    const y = this.scene.cameras.main.centerY * 0.5; // Display somewhat above center

    this.temporaryMessage = this.scene.add.text(centerX, y, message, {
      fontSize: '24px', // Larger font for visibility
      fill: color,
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    this.scene.time.delayedCall(duration, () => {
      if (this.temporaryMessage) {
        this.temporaryMessage.destroy();
        this.temporaryMessage = null;
      }
    });
  }
}
