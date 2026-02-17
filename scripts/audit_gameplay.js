require('dotenv').config(); // Load environment variables first

const axios = require('axios');
const { ethers } = require('ethers');
const { SiweMessage } = require('siwe');
const fs = require('fs');

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';
const LOG_FILE = 'AUDIT_REPORT.md';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || 97);
const DOMAIN = process.env.FRONTEND_DOMAIN || 'localhost:5173';

// Ensure we wipe previous log
fs.writeFileSync(LOG_FILE, '# AUDIT REPORT: Gameplay Verification\n\n');

function log(message) {
  console.log(message);
  fs.appendFileSync(LOG_FILE, `${message}\n\n`);
}

async function createPlayer(name) {
  const wallet = ethers.Wallet.createRandom();
  log(`### Creating Player: ${name} (${wallet.address})`);

  try {
    // 1. Get Nonce
    const nonceRes = await axios.get(`${API_URL}/auth/nonce`);
    const nonce = nonceRes.data.nonce;

    // 2. Sign SIWE
    const siweMessage = new SiweMessage({
      domain: DOMAIN,
      address: wallet.address,
      statement: 'Sign in to Bomb Dash Web3 to continue.',
      uri: `http://${DOMAIN}`, // Mock URI
      version: '1',
      chainId: CHAIN_ID,
      nonce: nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    const message = siweMessage.prepareMessage();
    const signature = await wallet.signMessage(message);

    // 3. Login
    const loginRes = await axios.post(`${API_URL}/auth/verify`, {
      message,
      signature,
    });
    const token = loginRes.data.token;

    // Get User ID
    const meRes = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Create axios instance for this user
    const userAxios = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: () => true, // Don't throw on error status so we can check it manually
    });

    return {
      name,
      wallet,
      token,
      userId: meRes.data.user.id,
      axios: userAxios,
      heroId: null,
    };
  } catch (e) {
    log(
      `!! Create Player Failed for ${name}: ${
        e.response ? JSON.stringify(e.response.data) : e.message
      }`
    );
    throw e;
  }
}

async function runAudit() {
  log(
    `Starting Audit... (Target: ${API_URL}, Chain: ${CHAIN_ID}, Domain: ${DOMAIN})`
  );

  try {
    // --- FLOW 1: SINGLE PLAYER ---
    log(`\n## 1. Single Player Flow Audit`);
    const playerA = await createPlayer('Player A');

    // Mint Hero
    log(`* Minting Common Hero for ${playerA.name}...`);
    const mintRes = await playerA.axios.post('/testnet/mint-hero', {
      forcedRarity: 'Common',
    });
    if (mintRes.status !== 200)
      throw new Error(`Mint failed: ${JSON.stringify(mintRes.data)}`);

    const heroId = mintRes.data.hero.id;
    log(`  - Minted Hero ID: ${heroId} (${mintRes.data.hero.rarity})`);

    // Verify XP
    const initialXP = mintRes.data.hero.xp;
    log(`  - Initial XP: ${initialXP}`);

    // Simulate Game Match
    log(`* Simulating Solo Game Match...`);
    const xpGained = 10;
    const gameRes = await playerA.axios.post('/game/matches/complete', {
      heroId,
      xpGained,
    });

    if (gameRes.status !== 200)
      throw new Error(`Game complete failed: ${JSON.stringify(gameRes.data)}`);

    const finalXP = gameRes.data.hero.xp;
    log(`  - Final XP: ${finalXP}`);

    if (finalXP === initialXP + xpGained) {
      log(`  [SUCCESS] XP increased correctly.`);
    } else {
      log(`  [FAILURE] XP mismatch.`);
    }

    // --- FLOW 2: PvP 1v1 ---
    log(`\n## 2. PvP Flow (Serverless Polling)`);
    const playerB = await createPlayer('Player B');
    const playerC = await createPlayer('Player C');

    // Setup for PvP: Mint BCOIN + Hero + XP
    for (const p of [playerB, playerC]) {
      log(`* Setting up ${p.name}...`);

      // Mint BCOIN
      await p.axios.post('/testnet/mint-bcoin');

      // Mint Hero
      const m = await p.axios.post('/testnet/mint-hero', {
        forcedRarity: 'Common',
      });
      p.heroId = m.data.hero.id;

      // Give XP for Wager (Need > 20 XP usually)
      // Simulate playing 5 solo games giving 10 XP each = 50 XP
      await p.axios.post('/game/matches/complete', {
        heroId: p.heroId,
        xpGained: 50,
      });

      log(`  - Added XP and BCOIN. Hero ID: ${p.heroId}`);
    }

    log(`* Both players joining Wager Queue (Tier 1)...`);
    const tierId = 1;

    const joinResB = await playerB.axios.post('/pvp/wager/enter', {
      heroId: playerB.heroId,
      tierId,
    });
    log(
      `  - ${playerB.name} join result: ${joinResB.status} ${joinResB.data.message}`
    );

    const joinResC = await playerC.axios.post('/pvp/wager/enter', {
      heroId: playerC.heroId,
      tierId,
    });
    log(
      `  - ${playerC.name} join result: ${joinResC.status} ${joinResC.data.message}`
    );

    log(`* Polling for Match...`);

    // Poll for Player B
    let matchFound = false;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));

      const statusRes = await playerB.axios.get('/pvp/queue/status');
      const status = statusRes.data.status;
      log(`  - Polling attempt ${i + 1}: Status = ${status}`);

      if (status === 'found' || status === 'MATCH_FOUND') {
        // Backend uses 'found' in DB logic, but sends 'MATCH_FOUND' in direct match?
        matchFound = true;
        const opponent = statusRes.data.match
          ? statusRes.data.match.opponent.hero.name
          : 'Unknown';
        log(`  [SUCCESS] Match Found! Opponent: ${opponent}`);
        break;
      }
    }

    if (!matchFound) {
      log(
        `  [FAILURE] Match not found after polling. (Did matchmaking loop run?)`
      );
    }

    // --- FLOW 3: Rarity Gating ---
    log(`\n## 3. Rarity Gating Test`);
    const playerD = await createPlayer('Player D');
    log(`* Minting LEGENDARY Hero for ${playerD.name}...`);
    const legRes = await playerD.axios.post('/testnet/mint-hero', {
      forcedRarity: 'Legend',
    });
    const legHeroId = legRes.data.hero.id;

    // Grant XP to pass the Wager XP check
    await playerD.axios.post('/game/matches/complete', {
      heroId: legHeroId,
      xpGained: 50,
    });

    log(`* Attempting to join PvP Queue with Legendary Hero...`);
    const failJoinRes = await playerD.axios.post('/pvp/wager/enter', {
      heroId: legHeroId,
      tierId: 1,
    });

    if (
      failJoinRes.status === 500 &&
      failJoinRes.data.message.includes('BETA RESTRICTION')
    ) {
      log(`  [SUCCESS] Blocked as expected: ${failJoinRes.data.message}`);
    } else if (failJoinRes.status === 403) {
      log(`  [SUCCESS] Blocked with 403: ${failJoinRes.data.message}`);
    } else if (failJoinRes.status === 200) {
      log(`  [FAILURE] Allowed to join with Legendary!`);
    } else {
      log(
        `  [WARNING] Unexpected error: ${failJoinRes.status} - ${failJoinRes.data.message}`
      );
      // If the error message contains the restriction text, count as success regardless of status code
      if (
        failJoinRes.data.message &&
        failJoinRes.data.message.includes('BETA RESTRICTION')
      ) {
        log(`  [SUCCESS] Blocked as expected (Message matched).`);
      }
    }

    // --- FLOW 4: House Gating ---
    log(`\n## 4. House Gating Test`);
    log(`* Minting HOUSE NFT for ${playerD.name}...`);
    const houseRes = await playerD.axios.post('/testnet/mint-hero', {
      forcedRarity: 'Common',
      forcedType: 'HOUSE',
    });
    const houseId = houseRes.data.hero.id;

    // Grant XP to pass the Wager XP check
    await playerD.axios.post('/game/matches/complete', {
      heroId: houseId,
      xpGained: 50,
    });

    log(`* Attempting to join PvP Queue with House...`);
    const failHouseRes = await playerD.axios.post('/pvp/wager/enter', {
      heroId: houseId,
      tierId: 1,
    });

    if (
      failHouseRes.data.message &&
      failHouseRes.data.message.includes('BETA RESTRICTION')
    ) {
      log(`  [SUCCESS] Blocked as expected: ${failHouseRes.data.message}`);
    } else if (failHouseRes.status === 200) {
      log(`  [FAILURE] Allowed to join with House!`);
    } else {
      log(`  [WARNING] Unexpected response for House: ${failHouseRes.status}`);
    }

    // --- FLOW 5: Tournament Lobby ---
    log(`\n## 5. Tournament Lobby Flow`);
    const lobbyPlayers = [];
    for (let i = 1; i <= 4; i++) {
      lobbyPlayers.push(await createPlayer(`TourneyPlayer ${i}`));
    }

    log(`* All 4 players joining Tournament Lobby...`);
    for (let i = 0; i < 4; i++) {
      const p = lobbyPlayers[i];
      // Mint Hero
      const m = await p.axios.post('/testnet/mint-hero', {
        forcedRarity: 'Common',
      });
      p.heroId = m.data.hero.id;

      await p.axios.post('/tournaments/register', {
        tournamentId: 'test-lobby-1',
        heroId: p.heroId,
      });
      log(`  - ${p.name} registered.`);

      // Check Status
      const statusRes = await p.axios.get('/tournaments/active');
      const participants = statusRes.data.tournament.participants.length;
      const status = statusRes.data.tournament.status;
      log(`    Lobby Status: ${status} (${participants}/4)`);

      if (i === 3) {
        if (status === 'Ready') {
          log(`  [SUCCESS] Lobby became Ready after 4th player.`);
        } else {
          log(`  [FAILURE] Lobby status is ${status} (Expected: Ready).`);
        }
      }
    }
  } catch (error) {
    log(`\n[CRITICAL FAILURE] Audit aborted: ${error.message}`);
    console.error(error);
  }
}

runAudit();
