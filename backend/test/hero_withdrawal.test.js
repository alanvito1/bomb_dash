const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const app = require('../server');
const db = require('../database');
const oracle = require('../oracle');
const jwt = require('jsonwebtoken');
const heroRoutes = require('../routes/heroes');
const authRoutes = require('../routes/auth');

app.use('/api/heroes', authRoutes.verifyToken, heroRoutes);

describe('Hero Withdrawal API Endpoint', () => {
    let userId;
    let heroId;
    let token;

    before(async () => {
        // Initialize the database for testing
        await db.initDb();
        // Create a user and a hero for testing
        const userResult = await db.createUserByAddress('0xTestUserWithdrawal');
        userId = userResult.userId;

        const heroResult = await db.createHeroForUser(userId, {
            hero_type: 'nft',
            nft_id: 999,
            level: 5,
            xp: 550,
            status: 'staked'
        });
        const heroes = await db.getHeroesByUserId(userId);
        heroId = heroes[0].id;


        // Generate a JWT for the user
        token = jwt.sign({ userId: userId, address: '0xTestUserWithdrawal' }, process.env.JWT_SECRET);
    });

    afterEach(() => {
        // Restore any stubs after each test
        sinon.restore();
    });

    after(async () => {
        // The DB connection is managed globally for the test suite, so we don't close it here.
    });

    it('should initiate withdrawal for a valid, staked hero', async () => {
        // Stub the oracle signing function
        const fakeSignature = '0x123456789';
        sinon.stub(oracle, 'signHeroWithdrawal').resolves(fakeSignature);

        const res = await request(app)
            .post(`/api/heroes/${heroId}/initiate-withdrawal`)
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(res.body.success).to.be.true;
        expect(res.body.message).to.equal('Withdrawal signature generated successfully.');
        expect(res.body.tokenId).to.equal(999);
        expect(res.body.level).to.equal(5);
        expect(res.body.xp).to.equal(550);
        expect(res.body.signature).to.equal(fakeSignature);
    });

    it('should return 404 if the hero does not exist', async () => {
        const nonExistentHeroId = 12345;
        const res = await request(app)
            .post(`/api/heroes/${nonExistentHeroId}/initiate-withdrawal`)
            .set('Authorization', `Bearer ${token}`)
            .expect(404);

        expect(res.body.success).to.be.false;
        expect(res.body.message).to.equal("Hero not found or you don't own it.");
    });

    it('should return 400 if the hero is not staked', async () => {
        // Create a hero that is not staked
        await db.createHeroForUser(userId, {
            hero_type: 'nft',
            nft_id: 998,
            status: 'in_wallet'
        });
        const heroes = await db.getHeroesByUserId(userId);
        const unstakedHero = heroes.find(h => h.nft_id === 998);


        const res = await request(app)
            .post(`/api/heroes/${unstakedHero.id}/initiate-withdrawal`)
            .set('Authorization', `Bearer ${token}`)
            .expect(400);

        expect(res.body.success).to.be.false;
        expect(res.body.message).to.equal("This hero cannot be withdrawn. It must be a staked NFT.");
    });

    it('should return 500 if the oracle signing fails', async () => {
        // Stub the oracle to throw an error
        sinon.stub(oracle, 'signHeroWithdrawal').rejects(new Error('Oracle signing failed'));

        const res = await request(app)
            .post(`/api/heroes/${heroId}/initiate-withdrawal`)
            .set('Authorization', `Bearer ${token}`)
            .expect(500);

        expect(res.body.success).to.be.false;
        expect(res.body.message).to.equal('Internal server error during withdrawal initiation.');
    });
});
