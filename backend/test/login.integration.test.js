// Use an in-memory database for testing
process.env.DB_PATH = ':memory:';

const request = require('supertest');
const { SiweMessage } = require('siwe');
const { Wallet } = require('ethers');
const app = require('../server.js');
const db = require('../database.js');
const nftService = require('../nft.js');

// Mock the database to control test data
jest.mock('../database.js');
// Mock the nft service as it's not relevant to this test
jest.mock('../nft.js');

describe('Auth Flow - BigInt Serialization', () => {
    let wallet;
    let token;
    const BIG_INT_VALUE = BigInt(9007199254740991);

    // Helper function to create a signed SIWE message
    const signMessage = async (nonce) => {
        const message = new SiweMessage({
            domain: 'localhost',
            address: wallet.address,
            statement: 'Sign in with Ethereum to the app.',
            uri: 'http://localhost/login',
            version: '1',
            chainId: 1,
            nonce: nonce,
        });
        const preparedMessage = message.prepareMessage();
        const signature = await wallet.signMessage(preparedMessage);
        return { message: preparedMessage, signature };
    };

    // Before each test, perform a login to get a valid token
    beforeEach(async () => {
        wallet = Wallet.createRandom();
        jest.clearAllMocks();

        // Mock the login flow to successfully return a token
        const mockUser = { id: 1, wallet_address: wallet.address };
        db.findUserByAddress.mockResolvedValue(mockUser);

        const nonceRes = await request(app).get('/api/auth/nonce');
        const { message, signature } = await signMessage(nonceRes.body.nonce);

        const loginRes = await request(app)
            .post('/api/auth/verify')
            .send({ message, signature });

        token = loginRes.body.token;
    });

    test('should return user data with BigInt values serialized as strings on /api/auth/me', async () => {
        // Arrange: Mock `getUserByAddress` to return a user with a BigInt.
        const mockUserWithBigInt = {
            id: 1,
            wallet_address: wallet.address,
            level: 1,
            xp: 100,
            coins: BIG_INT_VALUE,
        };
        db.getUserByAddress.mockResolvedValue(mockUserWithBigInt);
        db.getPlayerCheckpoint.mockResolvedValue(0);

        // Act: Attempt to fetch the user profile
        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        // Assert: We expect a 200 OK status and the 'coins' value to be a string
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user.coins).toBe(BIG_INT_VALUE.toString());
    });
});