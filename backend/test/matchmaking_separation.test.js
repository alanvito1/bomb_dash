const assert = require('assert');
const matchmaking = require('../matchmaking');
const db = require('../database');

describe('Matchmaking Separation (Guest vs NFT)', function () {
  before(async function () {
    process.env.NODE_ENV = 'test';
    await db.initDb();
  });

  after(async function () {
    // await db.closeDb();
  });

  // Helper to create a user and hero
  async function createPlayer(heroType) {
    const user = await db.User.create({
      wallet_address: `test_sep_${heroType}_${Date.now()}_${Math.random()}`,
    });
    const hero = await db.Hero.create({
      user_id: user.id,
      hero_type: heroType,
      sprite_name: 'knight',
      rarity: 'Common',
      nft_type: heroType === 'nft' ? 'HERO' : undefined,
      level: 1,
      hp: 100,
      damage: 10,
    });
    return { user, hero };
  }

  it('Mock hero should NOT match with NFT hero', async function () {
    const player1 = await createPlayer('mock');
    const player2 = await createPlayer('nft');

    await matchmaking.joinQueue(player1.user.id, player1.hero.id);
    await matchmaking.joinQueue(player2.user.id, player2.hero.id);

    // Process Queue
    await matchmaking.processQueue();

    // Check status
    const status1 = await matchmaking.getQueueStatus(player1.user.id);
    const status2 = await matchmaking.getQueueStatus(player2.user.id);

    assert.strictEqual(status1.status, 'searching');
    assert.strictEqual(status2.status, 'searching');

    // Clean up
    await matchmaking.leaveQueue(player1.user.id);
    await matchmaking.leaveQueue(player2.user.id);
  });

  it('Mock hero SHOULD match with Mock hero', async function () {
    const player1 = await createPlayer('mock');
    const player2 = await createPlayer('mock');

    await matchmaking.joinQueue(player1.user.id, player1.hero.id);
    await matchmaking.joinQueue(player2.user.id, player2.hero.id);

    await matchmaking.processQueue();

    const status1 = await matchmaking.getQueueStatus(player1.user.id);
    const status2 = await matchmaking.getQueueStatus(player2.user.id);

    assert.strictEqual(status1.status, 'found');
    assert.strictEqual(status2.status, 'found');

    assert.strictEqual(status1.opponent.userId, player2.user.id);
  });

  it('NFT hero SHOULD match with NFT hero', async function () {
    const player1 = await createPlayer('nft');
    const player2 = await createPlayer('nft');

    await matchmaking.joinQueue(player1.user.id, player1.hero.id);
    await matchmaking.joinQueue(player2.user.id, player2.hero.id);

    await matchmaking.processQueue();

    const status1 = await matchmaking.getQueueStatus(player1.user.id);
    const status2 = await matchmaking.getQueueStatus(player2.user.id);

    assert.strictEqual(status1.status, 'found');
    assert.strictEqual(status2.status, 'found');

    assert.strictEqual(status1.opponent.userId, player2.user.id);
  });
});
