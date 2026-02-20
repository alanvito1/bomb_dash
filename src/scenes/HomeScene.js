export default class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' });
  }

  create() {
    // If launched via window.launchGame(), we want to skip this screen
    // and let LoadingScene handle the logic.
    console.log('[HomeScene] Auto-forwarding to LoadingScene...');
    this.scene.start('LoadingScene');
  }
}
