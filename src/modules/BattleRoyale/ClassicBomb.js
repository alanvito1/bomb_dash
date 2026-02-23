export default class ClassicBomb extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, range, owner) {
        super(scene, x, y, 'bomb');
        this.scene = scene;
        this.range = range;
        this.owner = owner;
        this.timerEvent = null;

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this, true); // Static body

        // Pulse animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 300,
            yoyo: true,
            repeat: -1
        });
    }

    startTimer(duration = 3000) {
        this.timerEvent = this.scene.time.delayedCall(duration, () => {
            this.explode();
        });
    }

    explode() {
        if (this.owner && this.owner.activeBombs > 0) {
            this.owner.activeBombs--;
        }
        // Trigger explosion in scene
        // We pass the grid coordinates (assuming x,y are world coords centered on tile)
        if (this.scene.triggerExplosion) {
            this.scene.triggerExplosion(this.x, this.y, this.range, this.owner);
        }
        this.destroy();
    }
}
