const db = require('./database');
const oracle = require('./oracle');

// This will be initialized to 10 minutes before the first cron run.
let lastCycleStartTime;

/**
 * The main function for the reward cycle cron job.
 * This should be called every 10 minutes.
 */
async function processRewardCycle() {
    // This function is wrapped in a try/catch in the setInterval call,
    // so we can let errors bubble up to be logged there.
    console.log('[SOLO REWARDS] Starting new reward cycle processing...');

    // 1. Tell the contract to start a new cycle.
    // This action uses the game count from the *previous* cycle (which we reported 10 mins ago)
    // to calculate the reward amount for the cycle that is *now beginning*.
    await oracle.startNewRewardCycle();

    // 2. Count all games played in the cycle that just ended.
    const gamesInLastCycle = await db.countGamesInCycle(lastCycleStartTime);
    console.log(`[SOLO REWARDS] Found ${gamesInLastCycle} solo games in the last cycle (since ${lastCycleStartTime.toISOString()}).`);

    // 3. Report this number to the contract. This count will be stored on-chain
    // and used for the reward calculation in the *next* cycle (in 10 minutes).
    await oracle.reportSoloGames(gamesInLastCycle);

    // 4. Update the start time for the next run.
    lastCycleStartTime = new Date();
    console.log('[SOLO REWARDS] Reward cycle processing complete.');
}

/**
 * Starts the cron job for processing reward cycles.
 */
function startSoloRewardCycleCron() {
    const cycleInterval = 10 * 60 * 1000; // 10 minutes

    // Run once on startup after a short delay to ensure other services are initialized.
    setTimeout(async () => {
        try {
            console.log("[SOLO REWARDS] Performing initial reward cycle run on startup...");
            // Set the start time to exactly 10 minutes ago to capture any games
            // played while the server was restarting.
            lastCycleStartTime = new Date(Date.now() - cycleInterval);
            await processRewardCycle();
        } catch (e) {
            console.error("[SOLO REWARDS] Error on initial cron run:", e.message);
        }
    }, 30 * 1000); // 30-second delay

    // Then, start the regular interval.
    setInterval(async () => {
        try {
            await processRewardCycle();
        } catch (error) {
            // The contract prevents starting a cycle too early. This is a safe-guard log.
            if (error.message && error.message.includes("A new cycle can only be started every 10 minutes")) {
                 console.warn(`[SOLO REWARDS] Attempted to start a new cycle too early. Will try again in 10 minutes.`);
            } else {
                 console.error('[CRON-FATAL] Unhandled exception in solo reward cycle cron job:', error);
            }
        }
    }, cycleInterval);

    console.log('[OK] Cron job for Solo Rewards scheduled (runs every 10 minutes).');
}

function getLastCycleStartTime() {
    return lastCycleStartTime;
}

module.exports = {
    startSoloRewardCycleCron,
    getLastCycleStartTime
};