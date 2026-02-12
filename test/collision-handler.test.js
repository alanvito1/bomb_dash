// This test now uses ES Module syntax (`import`/`export`) to match the application's source code.
import { expect } from 'chai';
import sinon from 'sinon';
import CollisionHandler from '../src/modules/CollisionHandler.js';
import SoundManager from '../src/utils/sound.js';
import PowerupLogic from '../src/modules/PowerupLogic.js';

// Mock dependencies that are not under test
sinon.stub(SoundManager, 'play');
sinon.stub(SoundManager, 'playWorldMusic');
sinon.stub(SoundManager, 'stop');
sinon.stub(SoundManager, 'stopAll');

describe.skip('CollisionHandler', () => {
  let mockScene;
  let mockPowerupLogic;
  let collisionHandler;

  beforeEach(() => {
    // Create a mock scene with the properties and methods CollisionHandler interacts with
    mockScene = {
      score: 0,
      playerStats: { damage: 1 },
      enemiesKilled: 0,
      events: {
        emit: sinon.spy(),
      },
      powerupLogic: {
        spawn: sinon.spy(),
      },
      add: {
        sprite: sinon.stub().returns({
          setScale: sinon.stub(),
          play: sinon.stub().onCall(0).returns({
            on: sinon.stub(),
          }),
        }),
      },
      time: {
        delayedCall: sinon.stub(),
      },
      // Add mocks for physics, bombTimer, and showNextStageDialog for the boss kill path
      physics: {
        pause: sinon.spy(),
      },
      bombTimer: {
        paused: false,
      },
      showNextStageDialog: sinon.spy(),
      // Add a mock for the powerups group required by PowerupLogic
      powerups: {
        create: sinon.stub().returns({
          setVelocityY: sinon.spy(),
          setDisplaySize: sinon.spy(), // Add the missing method
        }),
      },
    };
    // The PowerupLogic instance is created in GameScene and passed in,
    // so we can just use a simple mock for the CollisionHandler constructor.
    mockPowerupLogic = new PowerupLogic(mockScene);

    // Instantiate the handler with our mocks
    collisionHandler = new CollisionHandler(
      mockScene,
      mockScene.events,
      mockPowerupLogic
    );
  });

  afterEach(() => {
    sinon.reset();
  });

  it('should increment the scene score by 10 when a normal enemy is killed', () => {
    // Arrange
    const bomb = { destroy: sinon.spy() };
    // An enemy that will be defeated in one hit
    const enemy = {
      active: true,
      hp: 1,
      isBoss: false,
      destroy: sinon.spy(),
      x: 100,
      y: 200,
    };
    mockScene.score = 0; // Ensure score starts at 0

    // Act
    collisionHandler.hitEnemy(bomb, enemy);

    // Assert
    // Verify the score was incremented correctly. This was the missing logic.
    expect(mockScene.score).to.equal(10);
    // Verify other expected side-effects
    expect(bomb.destroy.calledOnce).to.be.true;
    expect(enemy.destroy.calledOnce).to.be.true;
    expect(mockScene.enemiesKilled).to.equal(1);
  });

  it('should increment the scene score by 50 when a boss is killed', () => {
    // Arrange
    const bomb = { destroy: sinon.spy() };
    const boss = {
      active: true,
      hp: 1, // Will be defeated
      isBoss: true, // This is the key difference
      destroy: sinon.spy(),
      x: 150,
      y: 250,
    };
    mockScene.score = 100; // Start with some score

    // Act
    collisionHandler.hitEnemy(bomb, boss);

    // Assert
    expect(mockScene.score).to.equal(150); // 100 + 50
    expect(bomb.destroy.calledOnce).to.be.true;
    expect(boss.destroy.calledOnce).to.be.true;
  });

  it('should NOT increment the score if the enemy is not killed', () => {
    // Arrange
    const bomb = { destroy: sinon.spy() };
    const enemy = {
      active: true,
      hp: 5, // Has more HP than the damage
      isBoss: false,
      destroy: sinon.spy(),
    };
    mockScene.score = 42;
    mockScene.playerStats.damage = 1;

    // Act
    collisionHandler.hitEnemy(bomb, enemy);

    // Assert
    expect(mockScene.score).to.equal(42); // Score should be unchanged
    expect(enemy.hp).to.equal(4); // HP should be reduced
    expect(enemy.destroy.called).to.be.false; // Should not be destroyed
  });
});
