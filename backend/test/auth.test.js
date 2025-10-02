// Set the database to in-memory BEFORE any other modules are imported
process.env.DB_PATH = ':memory:';

const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const { SiweMessage } = require('siwe');
const { Wallet } = require('ethers');
const app = require('../server.js');
const nftService = require('../nft.js');
const db = require('../database.js');

describe('Auth and NFT Selection Flow', () => {
    let wallet;
    let getNonce = async () => {
        const response = await request(app).get('/api/auth/nonce');
        return response.body.nonce;
    };

    let signMessage = async (nonce) => {
        const message = new SiweMessage({
            domain: 'localhost',
            address: wallet.address,
            statement: 'Sign in with Ethereum to the app.',
            uri: 'http://localhost/login',
            version: '1',
            chainId: 1, // This can be any chainId
            nonce: nonce,
        });
        const preparedMessage = message.prepareMessage();
        const signature = await wallet.signMessage(preparedMessage);
        return { message: preparedMessage, signature };
    };

    beforeEach(async () => {
        // Create a new random wallet for each test to ensure isolation
        wallet = Wallet.createRandom();
        // Reset the database before each test
        await db.initDb();
    });

    afterEach(() => {
        // Restore all stubs
        sinon.restore();
    });

    it('should create a user and assign two mock heroes if no NFTs are found', async () => {
        // Arrange: Stub getNftsForPlayer to return an empty array
        sinon.stub(nftService, 'getNftsForPlayer').resolves([]);
        const nonce = await getNonce();
        const { message, signature } = await signMessage(nonce);

        // Act: Call the verify endpoint
        const response = await request(app)
            .post('/api/auth/verify')
            .send({ message, signature });

        // Assert
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.token).to.exist;

        const user = await db.findUserByAddress(wallet.address);
        expect(user).to.exist;
        const heroes = await db.getHeroesByUserId(user.id);
        expect(heroes).to.have.lengthOf(2);
        expect(heroes[0].hero_type).to.equal('mock');
        expect(heroes[1].damage).to.be.a('number'); // Basic check for mock hero stats
    });

    it('should create a user and a hero record for each found NFT', async () => {
        // Arrange: Stub getNftsForPlayer to return mock NFTs.
        const mockNfts = [
            { id: 1, bombPower: 5, speed: 220, rarity: 1, level: 1 },
            { id: 2, bombPower: 8, speed: 250, rarity: 2, level: 2 }
        ];
        sinon.stub(nftService, 'getNftsForPlayer').resolves(mockNfts);
        const nonce = await getNonce();
        const { message, signature } = await signMessage(nonce);

        // Act
        const response = await request(app)
            .post('/api/auth/verify')
            .send({ message, signature });

        // Assert: Check for immediate success and token issuance
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.token).to.exist;

        // Assert: Check that the user and two hero records were created
        const user = await db.findUserByAddress(wallet.address);
        expect(user).to.exist;
        const heroes = await db.getHeroesByUserId(user.id);
        expect(heroes).to.have.lengthOf(2);

        const hero1 = heroes.find(h => h.nft_id === 1);
        const hero2 = heroes.find(h => h.nft_id === 2);

        expect(hero1).to.exist;
        expect(hero2).to.exist;
        expect(hero1.damage).to.equal(5);
        expect(hero2.damage).to.equal(8);
        expect(hero1.hero_type).to.equal('nft');
    });
});