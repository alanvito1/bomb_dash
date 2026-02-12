const chai = require('chai');
const request = require('supertest');
const sinon = require('sinon');
const { expect } = chai;

// Temporarily unset environment variables to simulate a non-blockchain environment
const originalOracleKey = process.env.ORACLE_PRIVATE_KEY;
delete process.env.ORACLE_PRIVATE_KEY;

const server = require('../server');
const oracle = require('../oracle');

// Restore environment variables after modules have been loaded
process.env.ORACLE_PRIVATE_KEY = originalOracleKey;

describe('Server Initialization', () => {
  let oracleStub;

  before(() => {
    // We need to re-stub the oracle's init function for this specific test suite
    oracleStub = sinon.stub(oracle, 'initOracle').resolves(false);
  });

  after(() => {
    oracleStub.restore();
  });

  it('should start successfully without crashing when oracle fails to initialize', async () => {
    // The server should already be starting up or started from the require statement.
    // We just need to check if it's responsive using supertest.
    const response = await request(server).get('/api/contracts');

    // A 503 is expected if the server is still initializing, which is acceptable.
    // A successful 200 is also fine. The key is no internal server error (500).
    expect(response.status).to.not.equal(500);
  }).timeout(5000); // Give the server a moment to start
});
