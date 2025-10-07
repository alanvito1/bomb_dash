const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');

const {
    sequelize,
    initDb,
    closeDb,
    User,
    Hero,
    processHeroWagerResult
} = require('../database');
const { getExperienceForLevel } = require('../rpg');

describe('Integration Test: High-Stakes Wager Player Journey', () => {
    // Before running tests, connect to the test database
    before(async () => {
        await initDb();
    });

    // NOTE: We do not close the DB connection here in an `after` hook
    // because it would close the shared connection for all other test files,
    // causing them to fail. The connection will be closed when the test process exits.

    // Before each test, clean up the database
    beforeEach(async () => {
        await User.destroy({ truncate: true, cascade: true });
        await Hero.destroy({ truncate: true, cascade: true });
    });

    it('should de-level a hero and reset their XP to the max of the new level after a wager loss', async () => {
        // 1. Setup: Create users and heroes
        const winnerUser = await User.create({ wallet_address: 'winner_address' });
        const loserUser = await User.create({ wallet_address: 'loser_address' });

        const winnerHero = await Hero.create({
            user_id: winnerUser.id,
            hero_type: 'mock',
            level: 1,
            xp: 50,
            status: 'staked'
        });

        // Per directive: hero is Level 5 with XP just above the threshold.
        // getExperienceForLevel(5) = 1000.
        // We set the initial XP to 1050.
        const loserHero = await Hero.create({
            user_id: loserUser.id,
            hero_type: 'mock',
            level: 5,
            xp: 1050,
            status: 'staked'
        });

        // Per directive: Wager amount is greater than the hero's "surplus" XP.
        // Surplus XP = 1050 - 1000 = 50. We'll use a wager of 500 XP.
        const xpWager = 500;

        // 2. Action: Simulate the wager loss
        await processHeroWagerResult(winnerHero.id, loserHero.id, xpWager);

        // 3. Verification: Fetch the updated hero and assert the new state
        const updatedLoserHero = await Hero.findByPk(loserHero.id);

        // The hero started with 1050 XP and lost 500, resulting in 550 XP.
        // getExperienceForLevel(4) = 450.
        // getExperienceForLevel(5) = 1000.
        // Since 450 <= 550 < 1000, the new level should be 4.
        const expectedNewLevel = 4;

        // Per the new logic, the XP should be reset to the max for the new level.
        // Max XP for Level 4 is getExperienceForLevel(5) - 1.
        const expectedXpForNewLevel = getExperienceForLevel(expectedNewLevel + 1) - 1; // 1000 - 1 = 999

        // Verification Critical: Assert the de-level occurred.
        expect(updatedLoserHero.level).to.equal(expectedNewLevel, 'Hero did not de-level correctly to Level 4.');

        // Verification Critical: Assert the XP was reset correctly for the new level.
        expect(updatedLoserHero.xp).to.equal(expectedXpForNewLevel, 'Hero XP was not correctly adjusted to the maximum for the new level.');
    });
});