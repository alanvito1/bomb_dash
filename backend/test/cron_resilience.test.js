const request = require('supertest');
const express = require('express');
const sinon = require('sinon');
const { expect } = require('chai');
const matchmaking = require('../matchmaking');
const db = require('../database');
const oracle = require('../oracle');
const cronRouter = require('../routes/cron');

describe('Cron Resilience Tests', () => {
  let app;
  let oracleInitStub;

  before(() => {
    app = express();
    app.use(express.json());
    app.use('/api/cron', cronRouter);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('GET /api/cron/matchmaking', () => {
    it('should return timeout response if processing takes > 9s', async function () {
      this.timeout(12000); // Allow test to run longer

      // Stub processQueue to hang for 10s
      sinon.stub(matchmaking, 'processQueue').callsFake(() => {
        return new Promise((resolve) => setTimeout(resolve, 10000));
      });

      const res = await request(app)
        .get('/api/cron/matchmaking')
        .set('x-vercel-cron', '1');

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.status).to.equal('timeout');
      expect(res.body.message).to.include('Matchmaking timed out');
    });

    it('should return success immediately if processing is fast', async () => {
      sinon.stub(matchmaking, 'processQueue').resolves();

      const res = await request(app)
        .get('/api/cron/matchmaking')
        .set('x-vercel-cron', '1');

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal('Matchmaking processed');
    });
  });

  describe('GET /api/cron/distribute-rewards', () => {
    it('should skip if rewards were distributed recently (Idempotency)', async () => {
      // Stub last processed time to 5 minutes ago
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      sinon.stub(db, 'getGameSetting').resolves(fiveMinsAgo);

      // Stub oracle to ensure it's NOT called if we skip
      oracleInitStub = sinon
        .stub(oracle, 'initOracle')
        .throws(new Error('Should not be called'));

      const res = await request(app)
        .get('/api/cron/distribute-rewards')
        .set('x-vercel-cron', '1');

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal('Already processed recently');
    });

    it('should proceed if rewards were distributed long ago', async () => {
      // Stub last processed time to 2 hours ago
      const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
      sinon.stub(db, 'getGameSetting').resolves(twoHoursAgo);

      // Mock DB calls
      sinon.stub(db, 'updateGameSetting').resolves();
      sinon.stub(db, 'countGamesInCycle').resolves(10);

      // Mock Oracle calls
      oracleInitStub = sinon.stub(oracle, 'initOracle').resolves(true);
      sinon.stub(oracle, 'getProvider').returns({
        getTransactionReceipt: () => {}, // mock
        getBlockNumber: () => {},
      });

      // We need to mock ethers.Contract constructor or stub the method inside the route
      // This is tricky because `new ethers.Contract` is called inside the route.
      // We might fail on `new ethers.Contract` if we don't mock it or providing a real provider.
      // Given the complexity of mocking ethers inside a route without dependency injection,
      // we might hit an error here.
      // However, the test goal is to verify it *passed* the idempotency check.
      // If it fails with "Oracle initialization failed" or similar later, it means it PASSED the check.

      // Let's just mock oracle.initOracle to return false, so it exits early with "Oracle not ready".
      // This confirms it passed the first check.
      oracleInitStub.restore();
      sinon.stub(oracle, 'initOracle').resolves(false);

      const res = await request(app)
        .get('/api/cron/distribute-rewards')
        .set('x-vercel-cron', '1');

      // It should return "Oracle not ready" instead of "Already processed recently"
      expect(res.status).to.equal(200);
      expect(res.body.message).to.equal('Oracle not ready');
    });
  });
});
