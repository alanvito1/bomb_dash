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

// Only load .env if not in production/Vercel (where env vars are injected)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
}

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

        🌹 LEGACY EDITION (Serverless) 🌹
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
  const requiredEnvVars = ['PRIVATE_KEY', 'JWT_SECRET', 'ADMIN_SECRET'];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );
  if (missingVars.length > 0) {
    AVRE.warn(
      `Missing critical environment variables: ${missingVars.join(', ')}.`
    );
  }
}

validateEnvVariables();

const db = require('./database.js');
const oracle = require('./oracle.js');
const tournamentService = require('./tournament_service.js');
const gameState = require('./game_state.js');
const matchmaking = require('./matchmaking.js');

const authRoutes = require('./routes/auth.js');
const heroRoutes = require('./routes/heroes.js');
const pvpRoutes = require('./routes/pvp.js');
const tournamentRoutes = require('./routes/tournaments.js');
const gameRoutes = require('./routes/game.js');
const debugRoutes = require('./routes/debug.js');
const cronRoutes = require('./routes/cron.js');
const testnetRoutes = require('./routes/testnet.js');

const app = express();
// CRITICAL FIX: Fallback to 8080 strictly for Cloud Run
const PORT = process.env.PORT || 8080;

let isReady = false;
let initPromise = null;

app.set('json replacer', (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
);

app.use(cors());
app.use(express.json());

// Async Initialization Logic
async function performInitialization() {
  if (isReady) return;

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

      const contractAddressesPath = path.join(
        __dirname,
        'contracts',
        'contract-addresses.json'
      );
      let heroTokenAddress;

      try {
        const addressesFile = await fs.readFile(contractAddressesPath, 'utf8');
        const addresses = JSON.parse(addressesFile);
        if (addresses.mockHeroNFTAddress) {
          heroTokenAddress = addresses.mockHeroNFTAddress;
          AVRE.success(
            `Successfully loaded MockHeroNFT address: ${heroTokenAddress}`
          );
        }
      } catch (error) {
        AVRE.warn(
          `Could not load contract addresses file: ${error.message}. Checking ENV vars.`
        );
        if (process.env.MOCK_HERO_NFT_ADDRESS) {
          heroTokenAddress = process.env.MOCK_HERO_NFT_ADDRESS;
          AVRE.success(
            `Loaded MockHeroNFT address from ENV: ${heroTokenAddress}`
          );
        }
      }

      if (heroTokenAddress) {
        nftService.initNftService(provider, heroTokenAddress);
      } else {
        AVRE.warn(
          'Hero Token Address not found. NFT services partially disabled.'
        );
      }

      const tournamentControllerContract =
        oracle.getTournamentControllerContract();
      if (tournamentControllerContract) {
        tournamentService.initTournamentService(tournamentControllerContract);
        AVRE.success('Tournament service initialized.');
      }
    } else {
      AVRE.warn(
        'Oracle not initialized. Skipping blockchain-dependent services (NFT, Staking, Tournaments).'
      );
    }

    await gameState.startPvpCycleCron();
    AVRE.success('PvP State initialized.');

    isReady = true;
    AVRE.success(
      'All services initialized. Server is ready to process requests.'
    );

    // If local, start intervals after successful initialization
    // Exclude 'test' environment to prevent open handles during testing
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test'
    ) {
      console.log('Running in LOCAL mode: Starting background intervals.');
      setInterval(matchmaking.processQueue, 5000);
    }
  } catch (error) {
    AVRE.error('Server initialization failed', error);
    // Do not exit process, let health check fail or retry logic handle it
  }
}

// Health Check Endpoint - Returns 200 if ready, 503 if initializing
app.get('/health', (req, res) => {
  if (isReady) {
    return res.status(200).send('OK');
  } else {
    // If init failed or is still running
    return res.status(503).send('Initializing');
  }
});

// Middleware to ensure initialization for all other routes
app.use(async (req, res, next) => {
  if (!isReady) {
    // Trigger init if not already triggered (failsafe)
    if (!initPromise) {
      initPromise = performInitialization();
    }
    return res.status(503).json({
      success: false,
      message: 'Server is initializing. Please try again shortly.',
    });
  }
  next();
});

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
app.use('/api/cron', cronRoutes);
app.use('/api/testnet', testnetRoutes);

// Local Server Start (Cloud Run executes this directly)
if (require.main === module) {
  // CRITICAL FIX: Immediate Listen Pattern
  // Start the HTTP server immediately, then initialize the DB in background.
  app.listen(PORT, () => {
    console.log(
      `${colors.red}=============================================${colors.reset}`
    );
    AVRE.success(`HTTP server started on port ${PORT}.`);
    console.log(
      `${colors.red}=============================================${colors.reset}`
    );

    // Start initialization in background
    initPromise = performInitialization();
  });
}

module.exports = app;
