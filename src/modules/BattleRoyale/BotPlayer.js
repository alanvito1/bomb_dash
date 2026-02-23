import BattleRoyalePlayer from './BattleRoyalePlayer.js';

export default class BotPlayer extends BattleRoyalePlayer {
    constructor(scene, x, y, texture, stats, matchStats) {
        super(scene, x, y, texture, stats, matchStats);
        this.nextActionTime = 0;
        this.moveDirection = new Phaser.Math.Vector2(0, 0);
        this.fleeing = false;

        // Randomize texture slightly
        this.setTint(Phaser.Math.Between(0xaaaaaa, 0xffffff));
    }

    update(time, delta) {
        if (!this.active || !this.isAlive) return;

        // Execute Move
        this.setVelocity(this.moveDirection.x * this.stats.speed, this.moveDirection.y * this.stats.speed);

        // AI Logic Tick
        if (time > this.nextActionTime) {
            this.decideAction();
            // Randomize tick to distribute CPU load
            this.nextActionTime = time + Phaser.Math.Between(200, 800);
        }

        // Handle Animation (Manual bob since we bypass parent cursor logic)
        if (this.moveDirection.length() > 0) {
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
    }

    decideAction() {
        const tileSize = 48;
        const gridX = Math.floor(this.x / tileSize);
        const gridY = Math.floor(this.y / tileSize);

        // 1. Check for Danger (Bombs) - Simplified: If bomb is on my tile, RUN!
        // (Handled by Flee logic below if we just placed one)

        // 2. Scan Neighbors for Soft Blocks
        const directions = [
            { x: 0, y: -1 }, // Up
            { x: 0, y: 1 },  // Down
            { x: -1, y: 0 }, // Left
            { x: 1, y: 0 }   // Right
        ];

        let foundBlock = false;

        // Only bomb if we have ammo
        if (this.activeBombs < this.stats.bombCount) {
            for (let dir of directions) {
                const targetX = gridX + dir.x;
                const targetY = gridY + dir.y;

                // Ask Scene what is at target
                if (this.scene.isSoftBlock(targetX, targetY)) {
                    // Found block! Place bomb.
                    this.placeBomb();
                    foundBlock = true;

                    // Flee in opposite direction
                    this.moveDirection.set(-dir.x, -dir.y);
                    this.fleeing = true;
                    this.nextActionTime = this.scene.time.now + 2000; // Run for 2s
                    return;
                }
            }
        }

        // 3. If fleeing, check if safe or continue
        if (this.fleeing) {
            // Stop fleeing after a while
            this.fleeing = false;
            // Continue to random move
        }

        // 4. Random Move
        // Pick a random valid direction
        const validDirs = directions.filter(dir => {
            const targetX = gridX + dir.x;
            const targetY = gridY + dir.y;
            return !this.scene.isBlocked(targetX, targetY);
        });

        if (validDirs.length > 0) {
            const pick = Phaser.Utils.Array.GetRandom(validDirs);
            this.moveDirection.set(pick.x, pick.y);
        } else {
            // Stuck? Stay still.
            this.moveDirection.set(0, 0);
        }

        // Seek Item (Simplified: if close to coin, move to it)
        // Access scene.items group? Maybe too expensive for 15 bots.
        // Let's stick to random + block destroy.
    }
}
