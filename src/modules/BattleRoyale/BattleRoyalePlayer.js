export default class BattleRoyalePlayer extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, stats, matchStats) {
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        // Hitbox tuning for top-down grid movement
        // Assuming 48x48 tiles, 32x32 body allows maneuvering
        this.body.setSize(24, 24);
        this.body.setOffset(12, 20); // Center bottom-ish

        this.stats = stats || { speed: 160, bombRange: 2, bombCount: 1 };
        this.matchStats = matchStats || {};

        this.activeBombs = 0;
        this.collectedBcoins = 0;
        this.isAlive = true;
        this.canMove = true;

        // Input references
        this.cursors = null;
        this.spaceKey = null;

        // Visuals
        // Add shadow if available
        if (scene.textures.exists('shadow')) {
            this.shadow = scene.add.image(x, y + 15, 'shadow').setAlpha(0.5).setDepth(this.depth - 1);
        }
    }

    setupInput(cursors, spaceKey) {
        this.cursors = cursors;
        this.spaceKey = spaceKey;
    }

    update(time, delta) {
        if (!this.active) return;

        if (this.shadow) {
            this.shadow.setPosition(this.x, this.y + 15);
        }

        if (!this.isAlive || !this.canMove) {
            this.setVelocity(0);
            return;
        }

        // Handle Movement
        if (this.cursors) {
            const speed = this.stats.speed;
            let vx = 0;
            let vy = 0;

            if (this.cursors.left.isDown) {
                vx = -speed;
                this.setFlipX(true);
            } else if (this.cursors.right.isDown) {
                vx = speed;
                this.setFlipX(false);
            } else if (this.cursors.up.isDown) {
                vy = -speed;
            } else if (this.cursors.down.isDown) {
                vy = speed;
            }

            // Normalize diagonal speed? Classic bomberman usually doesn't, but Phaser Arcade does automatically handle collisions.
            // We'll keep it simple: no normalization for "retro" feel or standard vector normalization.
            // Let's normalize to ensure consistent speed.
            if (vx !== 0 && vy !== 0) {
                const factor = 0.707; // 1/sqrt(2)
                vx *= factor;
                vy *= factor;
            }

            this.setVelocity(vx, vy);

            // Animation
            if (vx !== 0 || vy !== 0) {
                // Bobbing animation or walking
                // Assuming single sprite for now, maybe add tween bob
                if (!this.scene.tweens.isTweening(this)) {
                    this.scene.tweens.add({
                        targets: this,
                        scaleY: { from: 1, to: 0.9 },
                        duration: 150,
                        yoyo: true,
                        repeat: -1
                    });
                }
            } else {
                this.scene.tweens.killTweensOf(this);
                this.setScale(1);
            }

            // Bomb Placement
            if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
                this.placeBomb();
            }
        }
    }

    placeBomb() {
        if (this.activeBombs < this.stats.bombCount) {
            // Snap to grid
            const tileSize = 48;
            const gridX = Math.floor((this.x) / tileSize);
            const gridY = Math.floor((this.y) / tileSize);
            const centerX = gridX * tileSize + tileSize / 2;
            const centerY = gridY * tileSize + tileSize / 2;

            if (this.scene.tryPlaceBomb(centerX, centerY, this.stats.bombRange, this)) {
                this.activeBombs++;
            }
        }
    }

    die() {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.setTint(0x555555);
        this.setVelocity(0);
        this.body.enable = false; // Disable physics

        if (this.shadow) this.shadow.destroy();

        // Death animation if available
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 0.1,
            duration: 500,
            onComplete: () => {
                this.destroy(); // Remove from scene
            }
        });
    }
}
