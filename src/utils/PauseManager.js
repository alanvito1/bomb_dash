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

        // 2. Pause the entire scene. This is the correct, robust way to handle it.
        // It pauses the physics, the update loop, AND all scene-specific timers
        // (including delayedCalls used by the EnemySpawner).
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

        // 2. Resume the entire scene. This correctly resumes physics, timers, and the update loop.
        // This was the missing piece that caused the soft-lock.
        this.scene.scene.resume();

        // 3. Restore the player state.
        this.scene.setPlayerState('CAN_SHOOT', 'Game resumed');
    }
}