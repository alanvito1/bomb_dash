export default class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' });
  }

  preload() {
    // Minimal assets for the home screen can be loaded here if needed.
    // For now, we use text and graphics to keep it instant.
  }

  create() {
    console.log('✅ HomeScene: Create is running!');

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Background - Absolute Black
    this.add.rectangle(centerX, centerY, width, height, 0x050505);

    // Title
    const titleStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '40px',
      fill: '#FF5F1F', // Neon Orange
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    };

    // Check if webfont is loaded (it might not be since LoadingScene loads it), fallback to monospace
    if (!document.fonts || !document.fonts.check('1em "Press Start 2P"')) {
      titleStyle.fontFamily = 'monospace';
    }

    this.add
      .text(centerX, centerY - 100, 'BOMB DASH', titleStyle)
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY - 50, 'LEGACY EDITION', {
        fontFamily: 'monospace',
        fontSize: '16px',
        fill: '#888888',
      })
      .setOrigin(0.5);

    // Play Button Container
    const btnY = centerY + 50;
    const btnWidth = 200;
    const btnHeight = 60;

    const playBtn = this.add.container(centerX, btnY);

    const btnBg = this.add
      .rectangle(0, 0, btnWidth, btnHeight, 0x000000)
      .setStrokeStyle(2, 0xFF5F1F)
      .setInteractive({ useHandCursor: true });

    // Hover effect
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0xFF5F1F);
      btnText.setColor('#000000');
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x000000);
      btnText.setColor('#FF5F1F');
    });

    const btnText = this.add
      .text(0, 0, 'PLAY', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fill: '#FF5F1F',
      })
      .setOrigin(0.5);

    playBtn.add([btnBg, btnText]);

    // Button Action
    btnBg.on('pointerdown', () => {
      console.log('🚀 Starting LoadingScene...');
      this.scene.start('LoadingScene');
    });

    // "Connect Wallet" dummy button
    // The actual connection logic is inside LoadingScene/Auth flow,
    // but this provides the requested UX entry point.
    const connectY = btnY + 80;
    const connectBtn = this.add.container(centerX, connectY);
    const connectBg = this.add
      .rectangle(0, 0, btnWidth, btnHeight, 0x050505)
      .setStrokeStyle(2, 0x00FFFF)
      .setInteractive({ useHandCursor: true });

    connectBg.on('pointerover', () => {
       connectBg.setFillStyle(0x00FFFF);
       connectText.setColor('#000000');
    });
    connectBg.on('pointerout', () => {
       connectBg.setFillStyle(0x050505);
       connectText.setColor('#00FFFF');
    });

    const connectText = this.add
      .text(0, 0, 'CONNECT WALLET', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fill: '#00FFFF',
      })
      .setOrigin(0.5);

    connectBtn.add([connectBg, connectText]);

    connectBg.on('pointerdown', () => {
      console.log('🚀 Connect clicked. Starting LoadingScene...');
      this.scene.start('LoadingScene');
    });

    // Version / ID
    this.add
      .text(width - 10, height - 10, 'v2.0.0', {
        fontFamily: 'monospace',
        fontSize: '10px',
        fill: '#444444',
      })
      .setOrigin(1, 1);
  }
}
