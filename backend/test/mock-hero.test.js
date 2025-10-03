const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const { SiweMessage } = require('siwe');
const app = require('../server.js');
const db = require('../database.js');
const nft = require('../nft.js');

// Use an in-memory SQLite database for testing
process.env.DB_PATH = ':memory:';

describe('Mock Hero Assignment System', () => {

    let wallet;
    let signature;
    let message;

    before(async () => {
        // Initialize the in-memory database before any tests run
        await db.initDb();
        // Create a new random wallet for each test run
        wallet = ethers.Wallet.createRandom();
    });

    after(async () => {
        // Close the database connection after all tests
        db.closeDb();
    });

    // Helper function to get a valid SIWE message and signature
    async function getSignedMessage(nonce) {
        const msg = {
            domain: 'localhost',
            address: wallet.address,
            statement: 'Sign in with Ethereum to the app.',
            uri: 'http://localhost/login',
            version: '1',
            chainId: 1,
            nonce: nonce,
        };
        const siweMessage = new SiweMessage(msg);
        const messageToSign = siweMessage.prepareMessage();
        const sig = await wallet.signMessage(messageToSign);
        return { message: siweMessage, signature: sig };
    }

    // Stub the blockchain call to simulate a user with no NFTs
    beforeEach(() => {
        sinon.stub(nft, 'getNftsForPlayer').resolves([]);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('[S-1] should assign mock heroes to a new user on first successful login', async () => {
        // 1. Get a valid nonce
        const nonceRes = await request(app).get('/api/auth/nonce');
        expect(nonceRes.statusCode).to.equal(200);
        const { nonce } = nonceRes.body;

        // 2. Create and sign the SIWE message
        const { message, signature } = await getSignedMessage(nonce);

        // 3. Verify the signature (this is the first login)
        const verifyRes = await request(app)
            .post('/api/auth/verify')
            .send({ message: message, signature: signature });

        expect(verifyRes.statusCode).to.equal(200);
        expect(verifyRes.body.success).to.be.true;
        expect(verifyRes.body.token).to.exist;

        const { token } = verifyRes.body;

        // 4. Verify the user now has mock heroes by calling /api/auth/me
        const meRes = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(meRes.statusCode).to.equal(200);
        expect(meRes.body.success).to.be.true;
        const { user } = meRes.body;
        expect(user.address).to.equal(wallet.address);
        expect(user.heroes).to.be.an('array').with.lengthOf(2); // Assuming 2 mock heroes (Ninja, Witch)

        // 5. Check the properties of the assigned heroes
        const ninja = user.heroes.find(h => h.asset_key === 'ninja_hero');
        const witch = user.heroes.find(h => h.asset_key === 'witch_hero');
        expect(ninja).to.exist;
        expect(witch).to.exist;
        expect(ninja.hero_type).to.equal('mock');
        expect(witch.damage).to.equal(6); // Verify a specific stat from the config
    });

    it('[S-2] should be idempotent and NOT assign duplicate heroes on subsequent logins', async () => {
        // 1. Get a new nonce for the second login
        const nonceRes = await request(app).get('/api/auth/nonce');
        const { nonce } = nonceRes.body;

        // 2. Sign and verify again for the same user
        const { message, signature } = await getSignedMessage(nonce);
        const verifyRes = await request(app)
            .post('/api/auth/verify')
            .send({ message, signature });

        expect(verifyRes.statusCode).to.equal(200);
        const { token } = verifyRes.body;

        // 3. Verify the user STILL has exactly 2 heroes
        const meRes = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(meRes.statusCode).to.equal(200);
        const { user } = meRes.body;
        expect(user.heroes).to.be.an('array').with.lengthOf(2);
    });

    describe('Debug Endpoint', () => {
        let debugWallet;

        before(() => {
            debugWallet = ethers.Wallet.createRandom();
        });

        it('[S-3] POST /api/debug/assign-mock-hero should assign mock heroes to a new wallet address', async () => {
            const res = await request(app)
                .post('/api/debug/assign-mock-hero')
                .set('x-admin-secret', 'supersecret') // Use the default admin secret for tests
                .send({ walletAddress: debugWallet.address });

            expect(res.statusCode).to.equal(200);
            expect(res.body.success).to.be.true;
            expect(res.body.message).to.include('Heróis mock atribuídos com sucesso');

            // Verify by directly checking the database
            const user = await db.findUserByAddress(debugWallet.address);
            expect(user).to.exist;
            const heroes = await db.getHeroesByUserId(user.id);
            expect(heroes).to.be.an('array').with.lengthOf(2);
            expect(heroes[0].hero_type).to.equal('mock');
        });

        it('[S-4] POST /api/debug/assign-mock-hero should assign mock heroes to an existing user without heroes', async () => {
            // Create a user but don't give them heroes
            const existingWallet = ethers.Wallet.createRandom();
            await db.createUserByAddress(existingWallet.address);

            const res = await request(app)
                .post('/api/debug/assign-mock-hero')
                .set('x-admin-secret', 'supersecret')
                .send({ walletAddress: existingWallet.address });

            expect(res.statusCode).to.equal(200);

            const user = await db.findUserByAddress(existingWallet.address);
            const heroes = await db.getHeroesByUserId(user.id);
            expect(heroes).to.be.an('array').with.lengthOf(2);
        });
    });
});