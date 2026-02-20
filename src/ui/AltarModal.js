import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';

export default class AltarModal extends UIModal {
  constructor(scene) {
    super(
      scene,
      400,
      500,
      LanguageManager.get('altar_title', {}, 'ALTAR OF POWER')
    );
    this.populate();
  }

  populate() {
    const cx = 0;
    const startY = -this.modalHeight / 2 + 80;

    // 1. Altar Image / Icon
    if (this.scene.textures.exists('icon_altar')) {
      const icon = this.scene.add
        .image(cx, startY + 40, 'icon_altar')
        .setScale(2);
      this.windowContainer.add(icon);
    } else {
      // Placeholder Graphic
      const gfx = this.scene.add.graphics();
      gfx.fillStyle(0xffd700, 0.5);
      gfx.fillCircle(cx, startY + 40, 40);
      this.windowContainer.add(gfx);
      const text = this.scene.add
        .text(cx, startY + 40, 'ALTAR', { fontSize: '12px', fill: '#000' })
        .setOrigin(0.5);
      this.windowContainer.add(text);
    }

    // 2. Global Goal Progress
    const progressY = startY + 120;
    const barW = 300;
    const barH = 20;

    // Label
    const progressLabel = this.scene.add
      .text(cx, progressY - 20, 'GLOBAL GOAL: 50,000 BCOIN', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.windowContainer.add(progressLabel);

    // Bar Bg
    const barBg = this.scene.add
      .rectangle(cx, progressY, barW, barH, 0x333333)
      .setOrigin(0.5);
    // Bar Fill (Mock 60%)
    const fillW = barW * 0.6;
    const barFill = this.scene.add
      .rectangle(cx - barW / 2 + fillW / 2, progressY, fillW, barH, 0xffd700)
      .setOrigin(0.5);

    this.windowContainer.add([barBg, barFill]);

    // 3. Current Buff
    const buffY = progressY + 60;
    const buffText = this.scene.add
      .text(cx, buffY, 'CURRENT BUFF:\n+10% XP (Ends in 2h)', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#00ff00',
        align: 'center',
      })
      .setOrigin(0.5);
    this.windowContainer.add(buffText);

    // 4. Donate Button
    const btnY = buffY + 80;
    const btn = this.scene.add.container(cx, btnY);
    const btnW = 200;
    const btnH = 50;

    const btnGfx = this.scene.add.graphics();
    btnGfx.fillStyle(0xffaa00, 1);
    btnGfx.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);

    // Pulse Effect on Button
    this.scene.tweens.add({
      targets: btn,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    const btnLabel = this.scene.add
      .text(0, 0, 'DONATE 100 BCOIN', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#000000',
      })
      .setOrigin(0.5);

    btn.add([btnGfx, btnLabel]);
    btn.setSize(btnW, btnH);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      SoundManager.play(this.scene, 'cash');
      this.handleDonate(btn);
    });

    this.windowContainer.add(btn);
  }

  async handleDonate(btn) {
    // Mock Donation Logic
    // In real web3, we would call a contract here.
    // For Phase 1, we simulate the API call or interaction.
    console.log('Donating to Altar...');

    // Visual Feedback
    this.scene.tweens.add({
      targets: btn,
      scale: 0.9,
      duration: 50,
      yoyo: true,
    });

    // Simulate success
    const successText = this.scene.add
      .text(0, 150, 'DONATION SENT!', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#00ff00',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.windowContainer.add(successText);

    this.scene.tweens.add({
      targets: successText,
      y: 120,
      alpha: 0,
      duration: 1000,
      delay: 500,
      onComplete: () => successText.destroy(),
    });
  }
}
