/**
 * PauseManager.js
 *
 * A centralized utility for managing the pause and resume state of the GameScene.
 * This ensures all relevant game components (physics, timers, scenes) are handled
 * correctly to prevent desynchronization bugs like the soft-lock.
 */
export default class PauseManager {
    /**
     * @param {Phaser.Scene} scene The GameScene instance.
     */
    constructor(scene) {
        this.scene = scene;
        this.isPaused = false;
    }

    /**
     * Pauses the game.
     * This method is the single entry point for pausing.
     */
    pause() {
        if (this.isPaused || this.scene.transitioning || !this.scene.player.active) {
            return;
        }

        console.log('[PauseManager] Pausing game...');
        this.isPaused = true;

        // 1. Set the player state to prevent actions.
        this.scene.setPlayerState('CANNOT_SHOOT', 'Game paused');

        // 2. Pause all relevant timers to prevent them from running in the background.
        this.scene.bombTimer?.remove(); // Remove and recreate on resume to reset it
        if (this.scene.enemySpawner?.timer) {
             this.scene.enemySpawner.timer.paused = true;
        }

        // 3. Pause the physics engine.
        this.scene.physics.pause();

        // 4. Launch the Pause UI and pause the current scene.
        this.scene.scene.launch('PauseScene');
        this.scene.scene.pause();
    }

    /**
     * Resumes the game.
     * This method is the single entry point for resuming.
     */
    resume() {
        if (!this.isPaused) {
            return;
        }

        console.log('[PauseManager] Resuming game...');
        this.isPaused = false;

        // 1. Stop the Pause UI Scene.
        this.scene.scene.stop('PauseScene');

        // 2. Resume the physics engine.
        this.scene.physics.resume();

        // 3. Un-pause timers.
        if (this.scene.enemySpawner?.timer) {
            this.scene.enemySpawner.timer.paused = false;
        }
        // Re-create the bomb timer
        this.scene.bombTimer = this.scene.time.addEvent({
            delay: this.scene.playerStats.fireRate,
            loop: true,
            callback: () => {
                if (this.scene.player?.active && this.scene.playerState === 'CAN_SHOOT') {
                    this.scene.firePlayerBomb(true);
                }
            },
        });

        // 4. Restore the player state.
        this.scene.setPlayerState('CAN_SHOOT', 'Game resumed');
    }
}