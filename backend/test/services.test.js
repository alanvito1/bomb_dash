const assert = require('assert');
const { getMonsterStats } = require('../monster_service');
const db = require('../database');

describe('Backend Services', function() {

    // --- Monster Service Tests ---
    describe('Monster Service', function() {
        it('should correctly scale monster stats based on player level', function() {
            const baseStats = { hp: 100, damage: 10, speed: 50 };
            const playerLevel = 10;
            // Scaling factor = 1 + (10 * 0.07) = 1.7
            const expectedStats = { hp: 170, damage: 17, speed: 85 };

            const scaledStats = getMonsterStats(baseStats, playerLevel);
            assert.deepStrictEqual(scaledStats, expectedStats);
        });

        it('should not scale stats for player level 1', function() {
            const baseStats = { hp: 100, damage: 10 };
            const playerLevel = 1;
            // Scaling factor = 1 + (1 * 0.07) = 1.07
            const expectedStats = { hp: 107, damage: 11 }; // Rounded

            const scaledStats = getMonsterStats(baseStats, playerLevel);
            assert.deepStrictEqual(scaledStats, expectedStats);
        });

        it('should handle non-numeric stats without errors', function() {
            const baseStats = { hp: 100, name: "Goblin", type: "Melee" };
            const playerLevel = 5;
            const scalingFactor = 1 + (5 * 0.07) = 1.35;
            const expectedStats = { hp: 135, name: "Goblin", type: "Melee" };

            const scaledStats = getMonsterStats(baseStats, playerLevel);
            assert.deepStrictEqual(scaledStats, expectedStats);
        });

        it('should throw an error for invalid input', function() {
            assert.throws(() => getMonsterStats(null, 10), Error, "Should throw on null stats");
            assert.throws(() => getMonsterStats({ hp: 100 }, null), Error, "Should throw on null level");
        });
    });

    // --- Checkpoint System Tests ---
    describe('Checkpoint System (Database)', function() {
        let testUserId = -1;

        // Before running tests, initialize an in-memory DB and create a test user
        before(async function() {
            process.env.DB_PATH = ':memory:'; // Use in-memory SQLite database for tests
            await db.initDb();
            const user = await db.createUserByAddress('0xTestUserForCheckpoints');
            testUserId = user.userId;
        });

        // After tests, close the DB connection
        after(function() {
            db.closeDb();
            delete process.env.DB_PATH; // Clean up env var
        });

        it('should return 0 for a player with no checkpoint', async function() {
            const checkpoint = await db.getPlayerCheckpoint(testUserId);
            assert.strictEqual(checkpoint, 0);
        });

        it('should save a new checkpoint correctly', async function() {
            const waveNumber = 10;
            const result = await db.savePlayerCheckpoint(testUserId, waveNumber);
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.updated, true);

            const checkpoint = await db.getPlayerCheckpoint(testUserId);
            assert.strictEqual(checkpoint, waveNumber);
        });

        it('should update a checkpoint only if the new wave is higher', async function() {
            // First, save a lower wave number
            const lowerWave = 5;
            const result1 = await db.savePlayerCheckpoint(testUserId, lowerWave);
            assert.strictEqual(result1.success, true);
            assert.strictEqual(result1.updated, false); // Should not update because 5 < 10

            let checkpoint = await db.getPlayerCheckpoint(testUserId);
            assert.strictEqual(checkpoint, 10); // Should still be 10

            // Now, save a higher wave number
            const higherWave = 15;
            const result2 = await db.savePlayerCheckpoint(testUserId, higherWave);
            assert.strictEqual(result2.success, true);
            assert.strictEqual(result2.updated, true); // Should update because 15 > 10

            checkpoint = await db.getPlayerCheckpoint(testUserId);
            assert.strictEqual(checkpoint, higherWave);
        });
    });
});