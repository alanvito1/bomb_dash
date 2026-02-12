// Set the database to in-memory BEFORE any other modules are imported
process.env.DB_PATH = ':memory:';

const { expect } = require('chai');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server.js');
const gameRoutes = require('../routes/game.js');
const db = require('../database.js');

const { Wallet } = require('ethers');

app.use('/api/game', gameRoutes);

describe('Game Flow API', () => {
  let testUser;
  let testHero;
  let authToken;
  let wallet;

  // Create a user and a hero before each test
  beforeEach(async () => {
    await db.initDb(); // Reset the in-memory database
    wallet = Wallet.createRandom(); // Use a new random wallet for each test to ensure isolation

    // 1. Create a user
    await db.createUserByAddress(wallet.address);
    testUser = await db.getUserByAddress(wallet.address);

    // 2. Create a hero for the user
    const heroData = {
      hero_type: 'mock',
      sprite_name: 'ninja',
      level: 1,
      xp: 0, // Start with 0 XP
    };
    await db.createHeroForUser(testUser.id, heroData);
    const heroes = await db.getHeroesByUserId(testUser.id);
    testHero = heroes[0];

    // 3. Generate a JWT for the user
    const tokenPayload = {
      userId: testUser.id,
      address: testUser.wallet_address,
    };
    authToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
  });

  describe('POST /api/game/matches/complete', () => {
    it('should award XP to the hero and the user account upon match completion', async () => {
      // Arrange
      const xpToGain = 150;
      expect(testHero.xp).to.equal(0);
      expect(testUser.account_xp).to.equal(0);

      // Act
      const response = await request(app)
        .post('/api/game/matches/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          heroId: testHero.id,
          xpGained: xpToGain,
        });

      // Assert (API Response)
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.message).to.include(
        `Successfully awarded ${xpToGain} XP`
      );
      // LP-04: With the new XP capping logic, the hero's XP should be capped at 99 (max for level 1)
      expect(response.body.hero.xp).to.equal(99);

      // Assert (Database Verification)
      const updatedHeroes = await db.getHeroesByUserId(testUser.id);
      const updatedHero = updatedHeroes.find((h) => h.id === testHero.id);
      // Use getUserByAddress to fetch the full user object for assertion.
      const updatedUser = await db.getUserByAddress(testUser.wallet_address);

      expect(updatedHero.xp).to.equal(99);
      // Account XP should still get the full amount, only hero XP is capped.
      expect(updatedUser.account_xp).to.equal(xpToGain);
    });

    it('should return 403 if the hero does not belong to the authenticated user', async () => {
      // Arrange: Create a second user and try to update their hero with the first user's token
      const otherUserResult = await db.createUserByAddress('0xOtherAddress456');
      const otherUser = await db.findUserByAddress('0xOtherAddress456');
      const otherHeroResult = await db.createHeroForUser(otherUser.id, {
        hero_type: 'mock',
        sprite_name: 'witch',
      });
      const otherHeroes = await db.getHeroesByUserId(otherUser.id);
      const otherHero = otherHeroes[0];

      // Act
      const response = await request(app)
        .post('/api/game/matches/complete')
        .set('Authorization', `Bearer ${authToken}`) // Use first user's token
        .send({
          heroId: otherHero.id, // But try to update second user's hero
          xpGained: 100,
        });

      // Assert
      expect(response.status).to.equal(403);
      expect(response.body.success).to.be.false;
    });

    it('should return 400 if xpGained is missing or invalid', async () => {
      // Act
      const response = await request(app)
        .post('/api/game/matches/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ heroId: testHero.id }); // xpGained is missing

      // Assert
      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
    });

    it('should cap hero XP at the maximum for the current level', async () => {
      // Arrange: Set up a hero close to leveling up
      // Max XP for level 1 is getExperienceForLevel(2) - 1 = 100 - 1 = 99.
      await db.updateHeroStats(testHero.id, { xp: 90 });
      const xpToGain = 20; // This would push XP to 110 if not capped

      // Act
      const response = await request(app)
        .post('/api/game/matches/complete')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          heroId: testHero.id,
          xpGained: xpToGain,
        });

      // Assert (API Response)
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      // The XP should be capped at 99
      expect(response.body.hero.xp).to.equal(99);

      // Assert (Database Verification)
      const updatedHeroes = await db.getHeroesByUserId(testUser.id);
      const updatedHero = updatedHeroes.find((h) => h.id === testHero.id);
      expect(updatedHero.xp).to.equal(99);
    });
  });
});
