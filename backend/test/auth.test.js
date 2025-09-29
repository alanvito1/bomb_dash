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

    it('should require NFT selection if a new user has NFTs', async () => {
        // Arrange: Stub getNftsForPlayer to return mock NFTs
        const mockNfts = [{ id: 1, bombPower: 5, speed: 220 }];
        sinon.stub(nftService, 'getNftsForPlayer').resolves(mockNfts);
        const nonce = await getNonce();
        const { message, signature } = await signMessage(nonce);

        // Act
        const response = await request(app)
            .post('/api/auth/verify')
            .send({ message, signature });

        // Assert
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.selectionRequired).to.be.true;
        expect(response.body.nfts).to.deep.equal(mockNfts);
        expect(response.body.token).to.be.undefined;
    });

    it('should finalize setup and issue a JWT when an NFT is selected', async () => {
        // Arrange: First, simulate the initial login that requires selection
        const mockNfts = [{ id: 777, bombPower: 8, speed: 250 }];
        const nftStub = sinon.stub(nftService, 'getNftsForPlayer').resolves(mockNfts);

        let nonce = await getNonce();
        let { message, signature } = await signMessage(nonce);

        await request(app)
            .post('/api/auth/verify')
            .send({ message, signature });

        // Prepare for the select-nft call
        nonce = await getNonce();
        ({ message, signature } = await signMessage(nonce));

        // Act: Call the select-nft endpoint
        const response = await request(app)
            .post('/api/user/select-nft')
            .send({ message, signature, nftId: 777 });

        // Assert
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.token).to.exist;

        const user = await db.findUserByAddress(wallet.address);
        const stats = await db.getPlayerStats(user.id);
        expect(stats.damage).to.equal(8);
        expect(stats.speed).to.equal(250);
    });
});