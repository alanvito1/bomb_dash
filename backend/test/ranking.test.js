const request = require('supertest');
const { expect } = require('chai');
const server = require('../server');
const db = require('../database');

describe('Ranking API', () => {
  before(async () => {
    // Ensure the database is initialized before running tests
    await db.initDb();
  });

  // No afterEach to close the DB, as it interferes with other tests in the suite.
  // The test runner will handle the process exit.

  it('should return a list of players with a 200 status code', async () => {
    const res = await request(server).get('/api/ranking');
    expect(res.statusCode).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.ranking).to.be.an('array');
  });
});
