import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import { ethers } from 'ethers';
import { getExperienceForLevel } from '../utils/rpg.js';

const BCOIN_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const SPENDER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const BCOIN_ABI = ["function approve(address spender, uint256 amount) public returns (bool)"];

export default class ProfileScene extends Phaser.Scene {
  constructor() {
    super('ProfileScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // --- Visual Polish: Background and Data Window ---
    this.add.image(centerX, centerY, 'menu_bg_vertical').setOrigin(0.5).setDisplaySize(this.scale.width, this.scale.height);
    this.add.graphics().fillStyle(0x000000, 0.8).fillRect(20, 20, this.scale.width - 40, this.scale.height - 40);

    // --- Visual Polish: Standard Font Styles ---
    const titleStyle = { fontSize: '24px', fill: '#FFD700', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 };
    const textStyle = { fontSize: '14px', fill: '#ffffff', fontFamily: '"Press Start 2P"', align: 'left', wordWrap: { width: this.scale.width - 200 } };
    const buttonStyle = { fontSize: '16px', fill: '#00ffff', fontFamily: '"Press Start 2P"', backgroundColor: '#00000099', padding: { x: 10, y: 5 } };

    // --- UI Elements ---
    this.add.text(centerX, 70, LanguageManager.get('profile_title'), titleStyle).setOrigin(0.5);
    this.displayHeroCard(centerX, centerY - 50, textStyle);
    this.createLevelUpButton(centerX, this.scale.height - 150, buttonStyle);
    this.createBackButton(centerX, this.scale.height - 80, buttonStyle);

    this.refreshStats();
  }

  displayHeroCard(x, y, style) {
    const cardWidth = 340;
    const cardHeight = 220;

    const background = this.add.graphics();
    background.fillStyle(0x000000, 0.7);
    background.fillRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, 10);
    background.lineStyle(2, 0x00ffff, 0.5);
    background.strokeRoundedRect(x - cardWidth / 2, y - cardHeight / 2, cardWidth, cardHeight, 10);

    const heroImage = this.add.sprite(x - cardWidth / 2 + 80, y, 'ninja_frame_0').setScale(3);

    const statX = x + 20;
    const statStartY = y - cardHeight / 2 + 40;
    const statSpacing = 30;

    this.levelText = this.add.text(statX, statStartY, '', style);
    this.hpText = this.add.text(statX, statStartY + statSpacing, '', style);
    this.damageText = this.add.text(statX, statStartY + statSpacing * 2, '', style);
    this.speedText = this.add.text(statX, statStartY + statSpacing * 3, '', style);
    this.fireRateText = this.add.text(statX, statStartY + statSpacing * 4, '', style);
  }

  async refreshStats() {
    try {
        const response = await api.getCurrentUser();
        if (response.success && response.user) {
            this.registry.set('loggedInUser', response.user);
            this.updateStatDisplays(response.user);
        } else {
            const user = this.registry.get('loggedInUser');
            if (user) this.updateStatDisplays(user);
        }
    } catch (e) {
        console.error("Failed to refresh stats from server:", e);
        const user = this.registry.get('loggedInUser');
        if (user) this.updateStatDisplays(user);
    }
  }

  updateStatDisplays(stats) {
      const { level = 1, hp = 100, maxHp = 100, damage = 1, speed = 200, fireRate = 600, xp = 0 } = stats;
      this.levelText.setText(LanguageManager.get('profile_stat_level', { level }));
      this.hpText.setText(LanguageManager.get('profile_stat_hp', { hp, maxHp }));
      this.damageText.setText(LanguageManager.get('profile_stat_damage', { damage }));
      this.speedText.setText(LanguageManager.get('profile_stat_speed', { speed }));
      this.fireRateText.setText(LanguageManager.get('profile_stat_fire_rate', { fireRate }));

      if (this.levelUpButton) {
        const xpForNextLevel = getExperienceForLevel(level + 1);
        if (xp >= xpForNextLevel) {
            this.levelUpButton.setInteractive({ useHandCursor: true }).setStyle({ fill: '#00ff00' });
        } else {
            this.levelUpButton.disableInteractive().setStyle({ fill: '#888888' });
        }
      }
  }

  createLevelUpButton(x, y, style) {
    this.levelUpButton = this.add.text(x, y, LanguageManager.get('profile_level_up_button', { cost: 1 }), { ...style, fill: '#888888' })
        .setOrigin(0.5)
        .disableInteractive();

    this.messageText = this.add.text(x, y + 45, '', { ...style, fontSize: '12px', fill: '#ff0000' })
        .setOrigin(0.5);

    this.levelUpButton.on('pointerdown', async () => {
        if (!this.levelUpButton.input.enabled) return;

        try {
            SoundManager.play(this, 'click');
            this.messageText.setText(LanguageManager.get('profile_wallet_connecting')).setStyle({ fill: '#ffff00' });

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);

            this.messageText.setText(LanguageManager.get('profile_wallet_approve_fee', { cost: 1 }));
            const feeInWei = ethers.parseUnits('1', 18);
            const tx = await bcoinContract.approve(SPENDER_ADDRESS, feeInWei);

            this.levelUpButton.disableInteractive().setText(LanguageManager.get('profile_level_up_confirming'));
            await tx.wait();

            this.messageText.setText(LanguageManager.get('profile_level_up_processing'));
            const result = await api.levelUp();

            if (result.success) {
                this.messageText.setStyle({ fill: '#00ff00' }).setText(result.message);
                await this.refreshStats();
            } else {
                throw new Error(result.message || LanguageManager.get('profile_level_up_error_server'));
            }
        } catch (error) {
            this.messageText.setStyle({ fill: '#ff0000' }).setText(error.message.substring(0, 50));
            console.error('Level up failed:', error);
            this.time.delayedCall(3000, () => this.refreshStats());
        }
    });

    // Hover effect for enabled state
    this.levelUpButton.on('pointerover', () => {
        if (this.levelUpButton.input.enabled) this.levelUpButton.setStyle({ fill: '#ffffff' });
    });
    this.levelUpButton.on('pointerout', () => {
        if (this.levelUpButton.input.enabled) this.levelUpButton.setStyle({ fill: '#00ff00' });
    });
  }

  createBackButton(x, y, style) {
    const backBtn = this.add.text(x, y, LanguageManager.get('back_to_menu'), style)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
        SoundManager.play(this, 'click');
        this.scene.start('MenuScene');
    });

    backBtn.on('pointerover', () => backBtn.setStyle({ fill: '#ffffff' }));
    backBtn.on('pointerout', () => backBtn.setStyle({ fill: '#00ffff' }));
  }
}