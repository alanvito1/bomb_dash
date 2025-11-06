const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function validateEnvVariables() {
    const requiredEnvVars = [
        'PRIVATE_KEY', 'JWT_SECRET', 'ADMIN_SECRET', 'TESTNET_RPC_URL',
        'ORACLE_PRIVATE_KEY', 'TOURNAMENT_CONTROLLER_ADDRESS',
        'PERPETUAL_REWARD_POOL_ADDRESS', 'WAGER_ARENA_ADDRESS'
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.error(`[FATAL] Missing critical environment variables: ${missingVars.join(', ')}.`);
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

const app = express();
let isInitialized = false;

app.set('json replacer', (key, value) => (typeof value === 'bigint' ? value.toString() : value));

const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
        if (isInitialized) return next();
        res.status(503).json({ success: false, message: 'Server is initializing.' });
    });
}

app.use(express.static(path.join(__dirname, '..')));

app.get('/api/contracts', (req, res) => {
    try {
        const contractAddresses = require('./contracts/contract-addresses.json');
        res.json({ success: true, ...contractAddresses });
    } catch (error) {
        console.error("Could not read contract addresses file:", error);
        res.status(500).json({ success: false, message: 'Could not load contract configuration.' });
    }
});

// Use modular routers
app.use('/api/auth', authRoutes.router);
app.use('/api/heroes', authRoutes.verifyToken, heroRoutes);
app.use('/api/pvp', authRoutes.verifyToken, pvpRoutes);
app.use('/api/tournaments', authRoutes.verifyToken, tournamentRoutes);
app.use('/api/game', authRoutes.verifyToken, gameRoutes);

async function startServer() {
    console.log("=============================================");
    console.log("     INITIALIZING GAME SERVER      ");
    console.log("=============================================");

    try {
        await db.initDb();
        console.log("[OK] Database connection established.");

        await oracle.initOracle();

        const nftService = require('./nft.js');
        const provider = oracle.getProvider();
        if (!provider) {
            throw new Error("Failed to get provider from oracle. NFT service cannot be initialized.");
        }

        // Resiliently load contract addresses from the shared volume
        const contractAddressesPath = path.join(__dirname, 'contracts', 'contract-addresses.json');
        let heroTokenAddress;
        for (let i = 0; i < 15; i++) {
            try {
                const addressesFile = await fs.readFile(contractAddressesPath, 'utf8');
                const addresses = JSON.parse(addressesFile);
                if (addresses.mockHeroNFTAddress) {
                    heroTokenAddress = addresses.mockHeroNFTAddress;
                    console.log(`[OK] Successfully loaded MockHeroNFT address: ${heroTokenAddress}`);
                    break;
                }
            } catch (error) {
                console.warn(`[WARN] Waiting for contract addresses file... Attempt ${i + 1}/15`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!heroTokenAddress) {
            throw new Error("FATAL: Could not load hero token address from shared volume after multiple attempts.");
        }

        nftService.initNftService(provider, heroTokenAddress);

        await gameState.startPvpCycleCron();
        console.log("[OK] Cron jobs (PvP Cycle, etc.) started.");

        setInterval(matchmaking.processQueue, 5000);
        console.log("[OK] Matchmaking queue processor started.");

        // Altar of Buffs cron job placeholder
        // setInterval(checkAltarAndActivateBuff, 60000);

        soloRewardService.startSoloRewardCycleCron();

        await stakingListener.initStakingListener();
        console.log("[OK] Hero staking listener started.");

        const tournamentControllerContract = oracle.getTournamentControllerContract();
        tournamentService.initTournamentService(tournamentControllerContract);
        console.log("[OK] Tournament service initialized.");

        isInitialized = true;
        console.log("[OK] All services initialized. Server is ready.");

        app.listen(PORT, () => {
            console.log("---------------------------------------------");
            console.log(`[OK] HTTP server started on port ${PORT}.`);
            console.log("=============================================");
            console.log("      SERVER IS FULLY OPERATIONAL      ");
            console.log("=============================================");
        });

    } catch (error) {
        console.error("[FATAL] Server initialization failed:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;
