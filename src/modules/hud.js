export default class HUD {
  constructor(scene) {
    this.scene = scene;
    this.powerupIcons = {};
    this.powerupText = {};
  }

  create(playerStats) {
    const addText = (y, label, value, color = '#ffffff') => {
      return this.scene.add.text(10, y, `${label}: ${value}`, {
        fontSize: '16px',
        fill: color,
        fontFamily: 'monospace'
      });
    };

    this.stageText = this.scene.add.text(10, 0, '🗺️ STAGE 1-1', {
      fontSize: '16px',
      fill: '#FFD700',
      fontFamily: 'monospace'
    });

    this.scoreText = addText(20, '🏆 Score', 0, '#ffffff');
    this.waveText = addText(40, '🌊 Wave', 1, '#00ffff');

    // Coin total + ganhos da rodada com emojis
    this.coinTotalText = addText(60, '💰 Coins', playerStats?.coins ?? 0, '#ffff00');
    this.coinEarnedText = addText(80, '🪙 This Run', 0, '#00ff00');

    this.lifeText = addText(100, '❤️ Lives', playerStats?.extraLives ?? 1, '#ff9999');
    this.damageText = addText(120, '💥 Damage', playerStats?.damage ?? 1, '#ffaaff');
    this.enemiesLeftText = addText(140, '👾 Enemies', '??', '#ffcc66');
  }

  update(stats = {}) {
    const s = {
      score: stats.score ?? this.scene.score ?? 0,
      level: stats.level ?? this.scene.level ?? 1,
      coins: stats.coins ?? this.scene.playerStats?.coins ?? 0,
      earned: this.scene.coinsEarned ?? 0,
      extraLives: stats.extraLives ?? this.scene.playerStats?.extraLives ?? 1,
      damage: stats.damage ?? this.scene.playerStats?.damage ?? 1
    };

    this.scoreText.setText(`🏆 Score: ${s.score}`);
    this.waveText.setText(`🌊 Wave: ${s.level}`);
    this.coinTotalText.setText(`💰 Coins: ${s.coins}`);
    this.coinEarnedText.setText(`🪙 This Run: ${s.earned}`);
    this.lifeText.setText(`❤️ Lives: ${s.extraLives}`);
    this.damageText.setText(`💥 Damage: ${s.damage}`);

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
