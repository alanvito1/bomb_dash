const matchmaking = require('./matchmaking');
const db = require('./database');

async function run() {
  console.log("Initializing DB...");
  // Use in-memory DB for this test script to avoid polluting local file
  process.env.NODE_ENV = 'test';
  await db.initDb();

  console.log("Creating user...");
  // Create a mock user and hero
  const user = await db.User.create({ wallet_address: 'test_user_' + Date.now() });
  const hero = await db.Hero.create({
    user_id: user.id,
    hero_type: 'mock',
    sprite_name: 'knight',
    name: 'Sir Test',
    rarity: 'Common',
    nft_type: 'HERO',
    level: 5,
    hp: 100,
    damage: 10
  });

  console.log("Creating opponent...");
  // Create a mock opponent
  const opponentUser = await db.User.create({ wallet_address: 'opponent_' + Date.now() });
  const opponentHero = await db.Hero.create({
    user_id: opponentUser.id,
    hero_type: 'mock',
    sprite_name: 'wizard',
    name: 'Merlin',
    rarity: 'Common',
    nft_type: 'HERO',
    level: 5,
    hp: 90,
    damage: 12
  });

  // Simulate a match found state in the DB
  const matchData = {
    opponent: {
      userId: opponentUser.id,
      hero: opponentHero.toJSON()
    },
    tier: 'default'
  };

  console.log("Setting up matchmaking queue...");
  await db.MatchmakingQueue.create({
    user_id: user.id,
    hero_id: hero.id,
    status: 'found',
    match_data: JSON.stringify(matchData)
  });

  // Call getQueueStatus
  console.log("Calling getQueueStatus...");
  const status = await matchmaking.getQueueStatus(user.id);

  console.log('getQueueStatus response:', JSON.stringify(status, null, 2));

  if (status.opponent) {
      console.log('SUCCESS: status.opponent is defined');
      console.log('Opponent name:', status.opponent.hero.name);
  } else {
      console.log('FAILURE: status.opponent is undefined');
      console.log('Current structure:', Object.keys(status));
  }

  await db.closeDb();
}

run().catch(err => console.error(err));
