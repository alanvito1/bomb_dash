/**
 * @class EventEmitter
 * @extends Phaser.Events.EventEmitter
 * @description A simple extension of Phaser's native EventEmitter.
 * This is used to create a singleton instance for global event handling.
 */
class EventEmitter extends Phaser.Events.EventEmitter {}

/**
 * @const GameEventEmitter
 * @description A singleton instance of EventEmitter used for global communication
 * between different, decoupled parts of the game. For example, a UI scene can
 * listen for events emitted from a core game service without having a direct
 reference to it.
 *
 * @example
 * // In one file (e.g., a service)
 * import GameEventEmitter from './utils/GameEventEmitter';
 * GameEventEmitter.emit('player_level_up', { newLevel: 5 });
 *
 * // In another file (e.g., a UI scene)
 * import GameEventEmitter from './utils/GameEventEmitter';
 * GameEventEmitter.on('player_level_up', (data) => {
 *   console.log(`Player reached level ${data.newLevel}!`);
 * });
 */
const GameEventEmitter = new EventEmitter();

export default GameEventEmitter;
