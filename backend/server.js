/*
 * 🌹 AVRE SOUL ENGINE
 * Architect: Alan Victor Rocha Evangelista
 * ---------------------------------------
 * The beating heart of the Bomb Dash universe.
 * Driven by passion. Powered by code.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 🌹 AVRE LOGGING SYSTEM
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
};

const AVRE = {
  logo: () => {
    console.log(`${colors.red}${colors.bright}
    ___    _    __ ____  ______
   /   |  | |  / // __ \\/ ____/
  / /| |  | | / // /_/ / __/
 / ___ |  | |/ // _, _/ /___
/_/  |_|  |___//_/ |_/_____/

        🌹 LEGACY EDITION 🌹
${colors.reset}`);
  },
  info: (msg) => console.log(`${colors.white}[AVRE] 🌹 ${msg}${colors.reset}`),
  success: (msg) =>
    console.log(
      `${colors.red}${colors.bright}[AVRE] ❤️  ${msg}${colors.reset}`
    ),
  warn: (msg) =>
    console.log(`${colors.red}${colors.dim}[AVRE] 🥀 ${msg}${colors.reset}`),
  error: (msg, err) => {
    console.log(
      `${colors.bgRed}${colors.white}[AVRE] 🩸 CRITICAL WOUND${colors.reset}`
    );
    if (err) console.error(`${colors.red}${msg}${colors.reset}`, err);
    else console.error(`${colors.red}${msg}${colors.reset}`);
  },
};

function validateEnvVariables() {
  const requiredEnvVars = [
    'PRIVATE_KEY',
    'JWT_SECRET',
    'ADMIN_SECRET',
    'TESTNET_RPC_URL',
    'ORACLE_PRIVATE_KEY',
    'TOURNAMENT_CONTROLLER_ADDRESS',
    'PERPETUAL_REWARD_POOL_ADDRESS',
    'WAGER_ARENA_ADDRESS',
    'CHAIN_ID',
    'FRONTEND_DOMAIN',
  ];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );
  if (missingVars.length > 0) {
    AVRE.error(
      `Missing critical environment variables: ${missingVars.join(', ')}.`
    );
    process.exit(1);
  }
}

validateEnvVariables();

const db = require('./database.js');
const oracle = require('./oracle.js');
const tournamentService = require('./tournament_service.js');
const gameState = require('./game_state.js');
const matchmaking = require('./matchmaking.js');
const soloRewardService = require('./solo_reward_service.js');
const stakingListener = require('./staking_listener.js');

const authRoutes = require('./routes/auth.js');
const heroRoutes = require('./routes/heroes.js');
const pvpRoutes = require('./routes/pvp.js');
const tournamentRoutes = require('./routes/tournaments.js');
const gameRoutes = require('./routes/game.js');
const debugRoutes = require('./routes/debug.js');

const app = express();
let isInitialized = false;

app.set('json replacer', (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
);

const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    if (isInitialized) return next();
    res
      .status(503)
      .json({ success: false, message: 'Server is initializing.' });
  });
}

app.use(express.static(path.join(__dirname, '..')));

app.get('/api/contracts', (req, res) => {
  try {
    const contractAddresses = require('./contracts/contract-addresses.json');
    res.json({ success: true, ...contractAddresses });
  } catch (error) {
    AVRE.warn('Could not read contract addresses file: ' + error.message);
    res.status(500).json({
      success: false,
      message: 'Could not load contract configuration.',
    });
  }
});

// Use modular routers
app.use('/api/auth', authRoutes.router);
app.use('/api/heroes', authRoutes.verifyToken, heroRoutes);
app.use('/api/pvp', authRoutes.verifyToken, pvpRoutes);
app.use('/api/tournaments', authRoutes.verifyToken, tournamentRoutes);
app.use('/api/game', authRoutes.verifyToken, gameRoutes);
app.use('/api/debug', debugRoutes);

async function startServer() {
  AVRE.logo();
  AVRE.info('System active... Initializing Game Server.');

  try {
    await db.initDb();
    AVRE.success('Database connection established.');

    const isOracleReady = await oracle.initOracle();

    if (isOracleReady) {
      const nftService = require('./nft.js');
      const provider = oracle.getProvider();
      if (!provider) {
        throw new Error(
          'Oracle reported ready, but failed to get provider. NFT service cannot be initialized.'
        );
      }

      // Resiliently load contract addresses from the shared volume
      const contractAddressesPath = path.join(
        __dirname,
        'contracts',
        'contract-addresses.json'
      );
      let heroTokenAddress;
      for (let i = 0; i < 15; i++) {
        try {
          const addressesFile = await fs.readFile(
            contractAddressesPath,
            'utf8'
          );
          const addresses = JSON.parse(addressesFile);
          if (addresses.mockHeroNFTAddress) {
            heroTokenAddress = addresses.mockHeroNFTAddress;
            AVRE.success(
              `Successfully loaded MockHeroNFT address: ${heroTokenAddress}`
            );
            break;
          }
        } catch (error) {
          AVRE.warn(
            `Waiting for contract addresses file... Attempt ${i + 1}/15`
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (!heroTokenAddress) {
        throw new Error(
          'FATAL: Could not load hero token address from shared volume after multiple attempts.'
        );
      }

      nftService.initNftService(provider, heroTokenAddress);

      await stakingListener.initStakingListener();
      AVRE.success('Hero staking listener started.');

      const tournamentControllerContract =
        oracle.getTournamentControllerContract();
      tournamentService.initTournamentService(tournamentControllerContract);
      AVRE.success('Tournament service initialized.');
    } else {
      AVRE.warn(
        'Oracle not initialized. Skipping blockchain-dependent services (NFT, Staking, Tournaments).'
      );
    }

    await gameState.startPvpCycleCron();
    AVRE.success('Cron jobs (PvP Cycle, etc.) started.');

    setInterval(matchmaking.processQueue, 5000);
    AVRE.info('Matchmaking queue processor started.');

    // Altar of Buffs cron job placeholder
    // setInterval(checkAltarAndActivateBuff, 60000);

    soloRewardService.startSoloRewardCycleCron();

    isInitialized = true;
    AVRE.success('All services initialized. Server is ready.');

    app.listen(PORT, () => {
      console.log(
        `${colors.red}=============================================${colors.reset}`
      );
      AVRE.success(`HTTP server started on port ${PORT}.`);
      console.log(
        `${colors.red}=============================================${colors.reset}`
      );
    });
  } catch (error) {
    AVRE.error('Server initialization failed', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
