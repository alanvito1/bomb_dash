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

    // Background - Dark Burgundy/Black
    this.add.rectangle(centerX, centerY, width, height, 0x110011);

    // Title
    const titleStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '40px',
      fill: '#DC143C', // Crimson
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
      .rectangle(0, 0, btnWidth, btnHeight, 0xdc143c)
      .setInteractive({ useHandCursor: true });

    // Hover effect
    btnBg.on('pointerover', () => btnBg.setFillStyle(0xff0000));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0xdc143c));

    const btnText = this.add
      .text(0, 0, 'PLAY', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fill: '#FFFFFF',
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
      .rectangle(0, 0, btnWidth, btnHeight, 0x333333)
      .setInteractive({ useHandCursor: true });

    connectBg.on('pointerover', () => connectBg.setFillStyle(0x444444));
    connectBg.on('pointerout', () => connectBg.setFillStyle(0x333333));

    const connectText = this.add
      .text(0, 0, 'CONNECT WALLET', {
        fontFamily: 'monospace',
        fontSize: '14px',
        fill: '#AAAAAA',
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
