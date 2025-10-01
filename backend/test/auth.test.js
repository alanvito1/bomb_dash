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

    it('should create a standard user with default stats if no NFTs are found', async () => {
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
        expect(response.body.selectionRequired).to.be.undefined;
        expect(response.body.token).to.exist;

        const user = await db.findUserByAddress(wallet.address);
        const stats = await db.getPlayerStats(user.id);
        expect(stats.damage).to.equal(1); // Default damage
    });

    it('should create a user with the strongest NFT stats if NFTs are found', async () => {
        // Arrange: Stub getNftsForPlayer to return mock NFTs. The second NFT is stronger.
        const mockNfts = [
            { id: 1, bombPower: 5, speed: 220, rarity: 1 },
            { id: 2, bombPower: 8, speed: 250, rarity: 2 } // Stronger NFT
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
        expect(response.body.selectionRequired).to.be.undefined;

        // Assert: Check that the user was created with the stats of the strongest NFT
        const user = await db.findUserByAddress(wallet.address);
        const stats = await db.getPlayerStats(user.id);
        expect(stats.damage).to.equal(8); // from the stronger NFT
        expect(stats.speed).to.equal(250); // from the stronger NFT
    });
});