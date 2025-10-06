// test/setup.js
import sinon from 'sinon';

// This file is run by Vitest before any tests.
// It sets up a global mock for the Phaser object, which is loaded from a CDN
// in the browser and is expected to exist on the global `window` or `global` scope.
global.Phaser = {
    Scene: class Scene {
        constructor(config) {
            // Provide a basic mock of the properties and methods that scenes might use in their constructors.
            this.sys = { events: { on: sinon.spy(), emit: sinon.spy() } };
            this.scene = { launch: sinon.spy(), stop: sinon.spy(), start: sinon.spy() };
            this.add = { image: () => ({ setOrigin: () => ({ setDisplaySize: sinon.spy() }) }) };
            this.time = { delayedCall: sinon.spy() };
            this.registry = { get: sinon.spy(), remove: sinon.spy() };
            this.scale = { width: 800, height: 600 };
            this.input = { keyboard: { on: sinon.spy() } };
            this.physics = { pause: sinon.spy() };
        }
    },
    // Mock the Events module needed by GameEventEmitter and other services
    Events: {
        EventEmitter: class EventEmitter {
            constructor() {
                this.on = sinon.spy();
                this.emit = sinon.spy();
                this.once = sinon.spy();
                this.off = sinon.spy();
            }
        }
    },
    // Mock the Math module needed by PowerupLogic
    Math: {
        Between: sinon.stub().returns(0)
    }
};