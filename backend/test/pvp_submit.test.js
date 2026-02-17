const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const pvpService = require('../pvp_service');
const db = require('../database');
const oracle = require('../oracle');

describe('PvP Service - Submit Result', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should reject submission if user is flagged as cheater', async () => {
    sandbox
      .stub(db.User, 'findByPk')
      .resolves({ id: 1, flagged_cheater: true });

    try {
      await pvpService.submitMatchResult(1, 1, 1, 100, 100, 10, 5);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error.message).to.include('Account flagged');
    }
  });

  it('should flag user as cheater if damage is excessive', async () => {
    const user = {
      id: 1,
      wallet_address: '0xUser',
      flagged_cheater: false,
      save: sandbox.stub(),
    };
    const match = {
      match_id: 1,
      player1_address: '0xUser',
      player2_address: '0xOpponent',
      player1_score: null,
      save: sandbox.stub(),
    };
    const hero = { id: 1, user_id: 1, damage: 10, fireRate: 1000 }; // 1 shot/sec -> 10 DPS

    sandbox.stub(db.User, 'findByPk').resolves(user);
    sandbox.stub(db, 'getWagerMatch').resolves(match);
    sandbox.stub(db.Hero, 'findByPk').resolves(hero);

    // Duration 10s -> Max Dmg = 10 * 10 = 100. Limit = 120.
    // User reports 200 damage.
    try {
      await pvpService.submitMatchResult(1, 1, 1, 100, 200, 10, 5);
      expect.fail('Should have thrown security violation');
    } catch (error) {
      expect(error.message).to.include('Security Violation');
      expect(user.flagged_cheater).to.be.true;
      expect(user.save.called).to.be.true;
    }
  });

  it('should accept valid submission and wait for opponent', async () => {
    const user = {
      id: 1,
      wallet_address: '0xUser',
      flagged_cheater: false,
      max_score: 0,
      save: sandbox.stub(),
    };
    const match = {
      match_id: 1,
      player1_address: '0xUser',
      player2_address: '0xOpponent',
      player1_score: null,
      player2_score: null,
      save: sandbox.stub(),
    };
    const hero = { id: 1, user_id: 1, damage: 10, fireRate: 1000 }; // 10 DPS

    sandbox.stub(db.User, 'findByPk').resolves(user);
    sandbox.stub(db, 'getWagerMatch').resolves(match);
    sandbox.stub(db.Hero, 'findByPk').resolves(hero);

    // Duration 10s -> Max 120. User reports 100.
    const result = await pvpService.submitMatchResult(1, 1, 1, 500, 100, 10, 5);

    expect(result.success).to.be.true;
    expect(result.status).to.equal('waiting_for_opponent');
    expect(match.player1_score).to.equal(500);
    expect(match.player1_hero_id).to.equal(1);
    expect(match.save.called).to.be.true;
  });

  it('should complete match when second player submits', async () => {
    const user = {
      id: 2,
      wallet_address: '0xOpponent',
      flagged_cheater: false,
      max_score: 0,
      save: sandbox.stub(),
    };
    const match = {
      match_id: 1,
      tier_id: 1,
      player1_address: '0xUser',
      player2_address: '0xOpponent',
      player1_score: 500,
      player1_hero_id: 1,
      player2_score: null, // Will be set by this call
      save: sandbox.stub(),
    };
    const hero = { id: 2, user_id: 2, damage: 10, fireRate: 1000 };

    sandbox.stub(db.User, 'findByPk').resolves(user);
    sandbox.stub(db, 'getWagerMatch').resolves(match);
    sandbox.stub(db.Hero, 'findByPk').resolves(hero);
    sandbox.stub(db, 'getWagerTier').resolves({ xp_cost: 100 });
    sandbox.stub(db, 'processHeroWagerResult').resolves({});
    sandbox.stub(oracle, 'reportWagerMatchResult').resolves({});

    // User scores 600 -> Wins against 500
    const result = await pvpService.submitMatchResult(1, 2, 2, 600, 100, 10, 5);

    expect(result.success).to.be.true;
    expect(result.status).to.equal('completed');
    expect(match.player2_score).to.equal(600);
    expect(match.winner_address).to.equal('0xOpponent');
    expect(db.processHeroWagerResult.called).to.be.true;
    expect(oracle.reportWagerMatchResult.called).to.be.true;
  });
});
