const http = require('http');
const { ethers } = require('../backend/node_modules/ethers');
const { SiweMessage } = require('../backend/node_modules/siwe');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

// Use dummy values for SIWE if not provided by backend env (which we simulate)
const DOMAIN = process.env.FRONTEND_DOMAIN || 'localhost';
const CHAIN_ID = process.env.CHAIN_ID || 1;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(`${BASE_URL}${path}`, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          // If not JSON (e.g. 404 HTML), return raw
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSimulation() {
  console.log('🚀 Starting User Walkthrough Simulation (SIWE Flow)...');

  // 1. Create Wallet
  console.log(`\n1️⃣  Creating Random Wallet...`);
  const wallet = ethers.Wallet.createRandom();
  console.log(`   Address: ${wallet.address}`);

  // 2. Get Nonce
  console.log(`\n2️⃣  Requesting Nonce...`);
  const nonceRes = await request('GET', '/auth/nonce');
  if (!nonceRes.body.success) {
      console.error('❌ Failed to get nonce:', nonceRes.body);
      process.exit(1);
  }
  const nonce = nonceRes.body.nonce;
  console.log(`   Nonce: ${nonce}`);

  // 3. Create SIWE Message & Sign
  console.log(`\n3️⃣  Signing Message...`);
  const message = new SiweMessage({
      domain: DOMAIN,
      address: wallet.address,
      statement: 'Sign in with Ethereum to the app.',
      uri: `http://${DOMAIN}`,
      version: '1',
      chainId: CHAIN_ID,
      nonce: nonce
  });
  const messageString = message.prepareMessage();
  const signature = await wallet.signMessage(messageString);

  // 4. Verify / Login
  console.log(`\n4️⃣  Verifying Signature (Login)...`);
  const loginRes = await request('POST', '/auth/verify', {
      message: messageString,
      signature: signature
  });

  if (!loginRes.body.success) {
      console.error('❌ Login failed:', loginRes.body);
      process.exit(1);
  }
  const token = loginRes.body.token;
  console.log('✅ Logged in. Token received.');

  // 5. Get User Profile (Balance check)
  console.log(`\n5️⃣  Checking Initial Balance (/auth/me)...`);
  const meRes = await request('GET', '/auth/me', null, token);
  if (!meRes.body.success) {
      console.error('❌ Failed to fetch profile:', meRes.body);
      process.exit(1);
  }
  console.log(`   Balance: ${meRes.body.user.coins} BCOIN`);
  console.log(`   XP: ${meRes.body.user.account_xp}`);

  // 6. Get Heroes (Check default Mock Hero)
  console.log(`\n6️⃣  Fetching Heroes (/heroes)...`);
  const heroesRes = await request('GET', '/heroes', null, token);
  const heroes = heroesRes.body;
  if (!Array.isArray(heroes)) {
     // If backend returns object { success: true, heroes: [...] } check that
     if (heroesRes.body.success && Array.isArray(heroesRes.body.heroes)) {
         // It might be wrapped
         const list = heroesRes.body.heroes;
         if (list.length === 0) console.warn('⚠️ No heroes found.');
         else console.log(`✅ Found ${list.length} heroes.`);
     } else {
         console.error('❌ Unexpected heroes response:', heroesRes.body);
         // Don't exit, might be empty
     }
  } else {
     // Direct array
     if (heroes.length === 0) console.warn('⚠️ No heroes found.');
     else console.log(`✅ Found ${heroes.length} heroes.`);
  }

  // Note: Since this is a fresh random wallet, it might NOT have a mock hero unless the backend assigns one on login.
  // backend/routes/auth.js says: "If no NFTs, assign the default mock heroes."
  // So we expect at least one mock hero.

  let mockHeroId = null;
  if (Array.isArray(heroes)) {
      const mock = heroes.find(h => h.hero_type === 'mock');
      if (mock) mockHeroId = mock.id;
  } else if (heroesRes.body.heroes) {
      const mock = heroesRes.body.heroes.find(h => h.hero_type === 'mock');
      if (mock) mockHeroId = mock.id;
  }

  if (mockHeroId) {
      console.log(`   Using Mock Hero ID: ${mockHeroId}`);

      // 7. Simulate Match Win (Add XP)
      console.log(`\n7️⃣  Simulating Match Win (Adding 50 XP)...`);
      const winRes = await request('POST', '/game/matches/complete', {
        heroId: mockHeroId,
        xpGained: 50
      }, token);

      if (!winRes.body.success) {
          console.error('❌ Match completion failed:', winRes.body);
      } else {
          console.log('✅ Match recorded. XP added.');
      }

      // 8. Check updated stats
      console.log(`\n8️⃣  Verifying Updated Stats...`);
      const meRes2 = await request('GET', '/auth/me', null, token);
      console.log(`   New XP: ${meRes2.body.user.account_xp}`);

      if (meRes2.body.user.account_xp > meRes.body.user.account_xp) {
          console.log('✅ XP increased successfully.');
      } else {
          console.error('❌ XP did not increase.');
      }
  } else {
      console.warn('⚠️ Could not find mock hero to simulate match.');
  }

  console.log('\n✨ Simulation Completed Successfully!');
}

// Check if server is up
const checkServer = http.get('http://localhost:3000/api/contracts', (res) => {
    if (res.statusCode === 200) {
        runSimulation();
    } else {
        console.error(`❌ Backend server responded with status ${res.statusCode}.`);
        process.exit(1);
    }
}).on('error', (e) => {
    console.error('❌ Backend server is not running on port 3000. Please start it with `npm run start:backend`.');
    process.exit(1);
});
