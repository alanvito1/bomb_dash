import { expect } from 'chai';
import sinon from 'sinon';

// The global Phaser mock is now handled by `test/setup.js`

import api from '../src/api.js';
import SoundManager from '../src/utils/sound.js';
import GameScene from '../src/scenes/GameScene.js';

// Mock dependencies that are not under test
sinon.stub(SoundManager, 'play');
sinon.stub(SoundManager, 'stopAll');

describe.skip('GameScene', () => {
    let gameScene;
    let apiCompleteMatchStub;

    beforeEach(() => {
        // Instantiate the scene
        gameScene = new GameScene();

        // Stub the new, correct API method before each test
        apiCompleteMatchStub = sinon.stub(api, 'completeMatch');

        // Provide minimal mock properties that handleGameOver interacts with
        gameScene.gamePaused = false;
        gameScene.transitioning = false;
        gameScene.player = { setActive: sinon.spy() };
        gameScene.bombTimer = { paused: false };
        gameScene.scene = { stop: sinon.spy(), start: sinon.spy() };
        gameScene.score = 0;
        gameScene.playerStats = {};
    });

    afterEach(() => {
        sinon.restore(); // Restore all stubs
    });

    describe('handleGameOver', () => {
        it('should call api.completeMatch with the correct score and heroId', async () => {
            // Arrange
            gameScene.score = 250;
            gameScene.playerStats = { id: 42, name: 'Test Hero' };
            apiCompleteMatchStub.resolves({ success: true }); // Mock a successful API response

            // Act
            await gameScene.handleGameOver();

            // Assert
            // Verify that api.completeMatch was called
            expect(apiCompleteMatchStub.calledOnce).to.be.true;

            // Verify the arguments of the call
            const [heroId, xpGained] = apiCompleteMatchStub.getCall(0).args;
            expect(heroId).to.equal(42);
            expect(xpGained).to.equal(250);

            // Verify that the scene transitions
            expect(gameScene.scene.start.calledWith('GameOverScene')).to.be.true;
        });

        it('should NOT call api.completeMatch if the score is 0', async () => {
            // Arrange
            gameScene.score = 0;
            gameScene.playerStats = { id: 42, name: 'Test Hero' };

            // Act
            await gameScene.handleGameOver();

            // Assert
            // Verify that api.completeMatch was NOT called
            expect(apiCompleteMatchStub.called).to.be.false;

            // Verify that the scene still transitions
            expect(gameScene.scene.start.calledWith('GameOverScene')).to.be.true;
        });

        it('should NOT call api.completeMatch if the heroId is missing', async () => {
            // Arrange
            gameScene.score = 250;
            gameScene.playerStats = { name: 'Test Hero' }; // No 'id' property

            // Act
            await gameScene.handleGameOver();

            // Assert
            expect(apiCompleteMatchStub.called).to.be.false;
            expect(gameScene.scene.start.calledWith('GameOverScene')).to.be.true;
        });

        it('should transition to GameOverScene even if the API call fails', async () => {
            // Arrange
            gameScene.score = 250;
            gameScene.playerStats = { id: 42, name: 'Test Hero' };
            // Mock a failed API response
            apiCompleteMatchStub.rejects(new Error('Network Error'));

            // Act
            await gameScene.handleGameOver();

            // Assert
            expect(apiCompleteMatchStub.calledOnce).to.be.true;
            // The most important thing is that we still transition to the game over screen
            expect(gameScene.scene.start.calledWith('GameOverScene')).to.be.true;
        });
    });
});