// A minimal scene for absolute baseline testing.
export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        console.log('✅ BootScene: Create is running!');
        // Add a bright, obvious shape to confirm the renderer is working.
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, 200, 200, 0xff00ff);
        console.log('✅ A simple rectangle was added to the scene.');
    }
}