// A simple singleton event emitter for the entire game.
// This allows decoupled modules to communicate with each other.
class EventEmitter extends Phaser.Events.EventEmitter {}

const GameEventEmitter = new EventEmitter();

export default GameEventEmitter;