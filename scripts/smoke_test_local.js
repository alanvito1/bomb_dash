const { spawn } = require('child_process');
const http = require('http');
const jwt = require('../backend/node_modules/jsonwebtoken'); // Use backend's jwt
const path = require('path');

const PORT = 3005;
const JWT_SECRET = 'smoke-secret';
const ADMIN_SECRET = 'smoke-admin';
const CRON_SECRET = 'cron-secret';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
            resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('--- Starting Smoke Test ---');

  // Cleanup old db
  try { require('fs').unlinkSync('./smoke.sqlite'); } catch (e) {}

  // Setup Env
  const env = {
    ...process.env,
    PORT: PORT,
    NODE_ENV: 'test',
    DB_PATH: './smoke.sqlite',
    JWT_SECRET: JWT_SECRET,
    ADMIN_SECRET: ADMIN_SECRET,
    START_BLOCK_NUMBER: '1000',
    ALTAR_WALLET_ADDRESS: '0x1234567890123456789012345678901234567890',
    CRON_SECRET: CRON_SECRET,
    // Disable Oracle Init for server start (it will fail on endpoint call, which is fine)
    // Actually server.js tries to init oracle. If it fails, it continues in degraded mode.
    // So we don't need to do anything special.
  };

  // Start Server
  const server = spawn('node', ['backend/server.js'], { env });

  // server.stdout.on('data', (data) => console.log(`[Server]: ${data}`));
  // server.stderr.on('data', (data) => console.error(`[Server ERR]: ${data}`));

  // Wait for start
  console.log('Waiting for server to start...');
  await new Promise(r => setTimeout(r, 5000));

  try {
    // 1. Setup User 1
    console.log('1. Setting up User 1...');
    const user1Addr = '0x1111111111111111111111111111111111111111';
    const user1Res = await request('POST', '/api/debug/setup-test-player',
        { walletAddress: user1Addr },
        { 'x-admin-secret': ADMIN_SECRET }
    );

    if (!user1Res.body.success) throw new Error('User 1 setup failed: ' + JSON.stringify(user1Res.body));

    const userId1 = user1Res.body.player.id;
    const heroes1 = user1Res.body.player.heroes;
    // Find a hero that is NOT staked
    const hero1 = heroes1.find(h => h.status === 'in_wallet');
    if (!hero1) throw new Error('User 1 has no available heroes');

    const token1 = jwt.sign({ userId: userId1, address: user1Addr }, JWT_SECRET);

    // 2. Setup User 2
    console.log('2. Setting up User 2...');
    const user2Addr = '0x2222222222222222222222222222222222222222';
    const user2Res = await request('POST', '/api/debug/setup-test-player',
        { walletAddress: user2Addr },
        { 'x-admin-secret': ADMIN_SECRET }
    );

    if (!user2Res.body.success) throw new Error('User 2 setup failed');

    const userId2 = user2Res.body.player.id;
    const heroes2 = user2Res.body.player.heroes;
    const hero2 = heroes2.find(h => h.status === 'in_wallet');
    if (!hero2) throw new Error('User 2 has no available heroes');

    const token2 = jwt.sign({ userId: userId2, address: user2Addr }, JWT_SECRET);

    // 3. Set XP
    console.log('3. Setting XP...');
    await request('POST', '/api/debug/set-hero-xp', { heroId: hero1.id, xp: 100 }, { 'x-admin-secret': ADMIN_SECRET });
    await request('POST', '/api/debug/set-hero-xp', { heroId: hero2.id, xp: 100 }, { 'x-admin-secret': ADMIN_SECRET });

    // 4. Test Matchmaking
    console.log('4. Entering Queue (User 1)...');
    const queue1 = await request('POST', '/api/pvp/wager/enter',
        { heroId: hero1.id, tierId: 1 },
        { 'Authorization': `Bearer ${token1}` }
    );
    console.log('User 1 Status:', queue1.body.status);
    if (queue1.body.status !== 'QUEUED') throw new Error('User 1 should be QUEUED');

    console.log('5. Entering Queue (User 2)...');
    const queue2 = await request('POST', '/api/pvp/wager/enter',
        { heroId: hero2.id, tierId: 1 },
        { 'Authorization': `Bearer ${token2}` }
    );
    console.log('User 2 Status:', queue2.body.status);
    if (queue2.body.status !== 'MATCH_FOUND') {
        console.error('Match Response:', queue2.body);
        throw new Error('User 2 should have MATCH_FOUND');
    }
    console.log('MATCH FOUND:', queue2.body.matchId);

    // 5. Test Altar Donation (Expect Fail)
    console.log('6. Testing Altar Donation (Mock)...');
    const altarRes = await request('POST', '/api/game/altar/donate',
        { txHash: '0x123', amount: '10' },
        { 'Authorization': `Bearer ${token1}` }
    );
    if (altarRes.body.success === false && (altarRes.body.message.includes('failed') || altarRes.body.message.includes('provider'))) {
        console.log('Altar check passed (failed as expected due to mock env).');
    } else {
        console.warn('Altar check unexpected response:', altarRes.body);
    }

    // 6. Test Cron Sync Staking (Expect Fail/Message)
    console.log('7. Testing Cron Sync Staking...');
    const syncRes = await request('GET', '/api/cron/sync-staking', null, { 'Authorization': `Bearer ${CRON_SECRET}` });
    console.log('Sync Response:', syncRes.body);

    console.log('--- SMOKE TEST PASSED ---');

  } catch (e) {
    console.error('--- SMOKE TEST FAILED ---');
    console.error(e);
    process.exit(1);
  } finally {
    server.kill();
    process.exit(0);
  }
}

run();
