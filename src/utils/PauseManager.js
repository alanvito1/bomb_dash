/**
 * @class PauseManager
 * @description A centralized utility for managing the pause and resume state of a Phaser scene.
 * It provides a robust way to pause and resume game logic, physics, timers, and associated UI scenes,
 * preventing common issues like animation desynchronization or input lock-ups.
 */
export default class PauseManager {
  /**
   * @constructor
   * @param {Phaser.Scene} scene - The primary game scene this manager will control (e.g., GameScene).
   */
  constructor(scene) {
    /**
     * The Phaser scene instance that this manager controls.
     * @type {Phaser.Scene}
     */
    this.scene = scene;
    /**
     * Tracks the current pause state.
     * @type {boolean}
     */
    this.isPaused = false;
  }

  /**
   * Pauses the game if it is not already paused.
   * This is the single, safe entry point for pausing the game. It handles:
   * - Setting a player state to prevent actions.
   * - Launching a dedicated pause UI scene.
   * - Correctly pausing the main game scene, which stops the update loop, physics, and all timers.
   * @param {string} source - The source of the pause request (e.g., 'User', 'Blur', 'System').
   */
  pause(source = 'Unknown') {
    if (
      this.isPaused ||
      this.scene.transitioning ||
      !this.scene.player.active
    ) {
      return;
    }

    console.log(`[PauseManager] Pausing game... (Source: ${source})`);
    this.isPaused = true;

    this.scene.setPlayerState('CANNOT_SHOOT', `Game paused by ${source}`);

    this.scene.scene.launch('PauseScene');
    this.scene.scene.pause();
  }

  /**
   * Resumes the game if it is currently paused.
   * This is the single, safe entry point for resuming. It handles:
   * - Stopping the pause UI scene.
   * - Correctly resuming the main game scene.
   * - Restoring the player's state to allow actions.
   */
  resume() {
    if (!this.isPaused) {
      return;
    }

    console.log('[PauseManager] Resuming game...');
    this.isPaused = false;

    this.scene.scene.stop('PauseScene');

    this.scene.scene.resume();

    this.scene.setPlayerState('CAN_SHOOT', 'Game resumed');
  }
}
