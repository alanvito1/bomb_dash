import UIModal from './UIModal.js';
import SoundManager from '../utils/sound.js';
import bcoinService from '../web3/bcoin-service.js';

export default class WalletModal extends UIModal {
  constructor(scene) {
    super(scene, 360, 450, 'WALLET');
    this.populate();
  }

  populate() {
    // --- Address Section ---
    const addrY = -this.modalHeight / 2 + 100;
    const address =
      this.scene.registry.get('loggedInUser')?.walletAddress ||
      '0x0000000000000000000000000000000000000000';
    const shortAddr =
      address.length > 10
        ? `${address.substring(0, 8)}...${address.substring(
            address.length - 6
          )}`
        : address;

    const addrBg = this.scene.add.graphics();
    addrBg.fillStyle(0x111111, 1);
    addrBg.fillRoundedRect(-140, addrY - 20, 280, 40, 8);
    addrBg.lineStyle(1, 0x333333);
    addrBg.strokeRoundedRect(-140, addrY - 20, 280, 40, 8);

    const addrText = this.scene.add
      .text(-40, addrY, shortAddr, {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#888888',
      })
      .setOrigin(0.5);

    // Copy Button (Text based)
    const copyText = this.scene.add
      .text(120, addrY, '[COPY]', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        fill: '#00ffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    copyText.on('pointerdown', () => {
      SoundManager.playClick(this.scene);
      navigator.clipboard.writeText(address);
      copyText.setText('COPIED!');
      copyText.setColor('#00ff00');
      this.scene.time.delayedCall(1000, () => {
        copyText.setText('[COPY]');
        copyText.setColor('#00ffff');
      });
    });

    this.windowContainer.add([addrBg, addrText, copyText]);

    // --- Balance Section ---
    const balY = addrY + 80;
    // Icon
    let bcoinIcon;
    if (this.scene.textures.exists('icon_bcoin')) {
      bcoinIcon = this.scene.add.image(0, balY - 30, 'icon_bcoin').setScale(2);
    } else {
      bcoinIcon = this.scene.add.circle(0, balY - 30, 20, 0xffff00); // Fallback
    }

    this.balanceText = this.scene.add
      .text(0, balY + 10, 'Loading...', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        fill: '#FFD700',
      })
      .setOrigin(0.5);

    this.usdText = this.scene.add
      .text(0, balY + 40, '...', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#888888',
      })
      .setOrigin(0.5);

    this.windowContainer.add([bcoinIcon, this.balanceText, this.usdText]);

    // --- Disconnect Button ---
    const discY = this.modalHeight / 2 - 60;
    const discBtn = this.createDisconnectButton(0, discY);
    this.windowContainer.add(discBtn);
  }

  createDisconnectButton(x, y) {
    const container = this.scene.add.container(x, y);
    const w = 220;
    const h = 40;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x880000, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(2, 0xff0000);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    const text = this.scene.add
      .text(0, 0, 'DISCONNECT', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#ffffff',
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      container.setScale(0.95);
    });

    container.on('pointerup', () => {
      container.setScale(1);
      SoundManager.playClick(this.scene);
      if (window.confirm('Disconnect wallet?')) {
        localStorage.clear();
        window.location.reload();
      }
    });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xaa0000, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      bg.lineStyle(2, 0xff0000);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
      text.setScale(1.05);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x880000, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      bg.lineStyle(2, 0xff0000);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
      text.setScale(1);
    });

    return container;
  }

  open() {
    super.open();
    this.updateBalance();
  }

  async updateBalance() {
    const { balance } = await bcoinService.getBalance(true); // Force update to be fresh
    const val = parseFloat(balance);
    if (!isNaN(val)) {
        this.balanceText.setText(val.toFixed(2));
        const usd = (val * 0.25).toFixed(2);
        this.usdText.setText(`≈ $${usd} USD`);
    } else {
        this.balanceText.setText("Error");
        this.usdText.setText("-");
    }
  }
}
