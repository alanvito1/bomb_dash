const assert = require('assert');
const matchmaking = require('../matchmaking');
const db = require('../database');

describe('Matchmaking Fix Verification', function () {
  before(async function () {
    // Ensure we use test environment
    process.env.NODE_ENV = 'test';
    await db.initDb();
  });

  after(async function () {
    // await db.closeDb(); // Do not close DB to avoid affecting other tests
  });

  it('getQueueStatus should return opponent object at top level', async function () {
    // 1. Create User and Hero
    const user = await db.User.create({ wallet_address: 'test_user_fix_' + Date.now() });
    const hero = await db.Hero.create({
      user_id: user.id,
      hero_type: 'mock',
      sprite_name: 'knight',
      rarity: 'Common',
      nft_type: 'HERO',
      level: 1,
      hp: 100,
      damage: 10
    });

    // 2. Create Opponent
    const opponentUser = await db.User.create({ wallet_address: 'opponent_fix_' + Date.now() });
    const opponentHero = await db.Hero.create({
      user_id: opponentUser.id,
      hero_type: 'mock',
      sprite_name: 'wizard',
      rarity: 'Common',
      nft_type: 'HERO',
      level: 1,
      hp: 90,
      damage: 12
    });

    // 3. Simulate Match Found
    const matchData = {
      opponent: {
        userId: opponentUser.id,
        hero: opponentHero.toJSON()
      },
      tier: 'default'
    };

    await db.MatchmakingQueue.create({
      user_id: user.id,
      hero_id: hero.id,
      status: 'found',
      match_data: JSON.stringify(matchData)
    });

    // 4. Call getQueueStatus
    const status = await matchmaking.getQueueStatus(user.id);

    // 5. Verify Structure
    assert.strictEqual(status.status, 'found');
    assert.ok(status.opponent, 'Opponent object should exist at top level');
    assert.strictEqual(status.opponent.userId, opponentUser.id);
    assert.strictEqual(status.opponent.hero.sprite_name, 'wizard');
  });
});
