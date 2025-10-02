const db = require('./database');
const fs = require('fs').promises;
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'game_config.json');

// In-memory queue for simplicity, but it's backed by the database
// to allow for persistence and scalability.
const matchmakingQueue = [];

/**
 * Adds a player to the matchmaking queue.
 * @param {number} userId - The ID of the user.
 * @param {number} heroId - The ID of the hero selected for the match.
 * @returns {Promise<object>} The result of the operation.
 */
async function joinQueue(userId, heroId) {
    // First, remove any existing entry for this user to prevent duplicates
    await leaveQueue(userId);

    const entry = {
        userId,
        heroId,
        entryTime: new Date(),
        status: 'searching'
    };

    // Add to the database
    const dbResult = await db.addToMatchmakingQueue(userId, heroId);

    // Add to the in-memory queue
    matchmakingQueue.push({ ...entry, dbId: dbResult.id });

    console.log(`[Matchmaking] User ${userId} with hero ${heroId} joined the queue.`);

    return { success: true, queueId: dbResult.id };
}

/**
 * Removes a player from the matchmaking queue.
 * @param {number} userId - The ID of the user to remove.
 * @returns {Promise<object>} The result of the operation.
 */
async function leaveQueue(userId) {
    const index = matchmakingQueue.findIndex(p => p.userId === userId);
    if (index > -1) {
        matchmakingQueue.splice(index, 1);
    }
    await db.removeFromMatchmakingQueue(userId);
    console.log(`[Matchmaking] User ${userId} removed from the queue.`);
    return { success: true };
}

async function findOpponent(player, queue) {
    const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    const levelRange = config.matchmakingLevelRange || 5;

    const playerHero = (await db.getHeroesByUserId(player.userId)).find(h => h.id === player.heroId);
    if (!playerHero) {
        throw new Error(`Player hero with ID ${player.heroId} not found for user ${player.userId}`);
    }

    for (const opponent of queue) {
        if (opponent.userId === player.userId || opponent.status !== 'searching') {
            continue;
        }

        const opponentHero = (await db.getHeroesByUserId(opponent.userId)).find(h => h.id === opponent.heroId);
        if (!opponentHero) {
            console.warn(`[Matchmaking] Could not find hero ${opponent.heroId} for opponent ${opponent.userId} in queue. Skipping.`);
            continue;
        }

        const levelDifference = Math.abs(playerHero.level - opponentHero.level);

        if (levelDifference <= levelRange) {
            console.log(`[Matchmaking] Match found for User ${player.userId} (Lvl ${playerHero.level}) and User ${opponent.userId} (Lvl ${opponentHero.level})`);

            return {
                player1: { userId: player.userId, hero: playerHero },
                player2: { userId: opponent.userId, hero: opponentHero }
            };
        }
    }

    return null;
}

async function processQueue() {
    try {
        const searchingPlayers = matchmakingQueue.filter(p => p.status === 'searching');
        if (searchingPlayers.length === 0) {
            return;
        }
        console.log(`[Matchmaking] Processing queue with ${searchingPlayers.length} players...`);

        const processedPlayerIds = new Set();

        for (const player of searchingPlayers) {
            if (processedPlayerIds.has(player.userId)) {
                continue;
            }

            let match = await findOpponent(player, searchingPlayers);

            if (!match) {
                match = await checkBotMatch(player);
            }

            if (match) {
                const player1Id = match.player1.userId;
                const player2Id = match.player2.userId;

                console.log(`[Matchmaking] Match created between User ${player1Id} and User ${player2Id}`);

                processedPlayerIds.add(player1Id);
                const player1InQueue = matchmakingQueue.find(p => p.userId === player1Id);
                if (player1InQueue) {
                    player1InQueue.status = 'found';
                    player1InQueue.match = { opponent: match.player2 };
                }

                if (player2Id !== -1) {
                    processedPlayerIds.add(player2Id);
                    const player2InQueue = matchmakingQueue.find(p => p.userId === player2Id);
                    if (player2InQueue) {
                        player2InQueue.status = 'found';
                        player2InQueue.match = { opponent: match.player1 };
                    }
                }

                setTimeout(() => {
                    if (player1Id) leaveQueue(player1Id);
                    if (player2Id !== -1) leaveQueue(player2Id);
                }, 5000);
            }
        }
    } catch (error) {
        console.error('[FATAL] Unhandled error in matchmaking processQueue:', error);
    }
}

/**
 * Checks if a player has been waiting too long and should be matched with a bot.
 * @param {object} player - The player object from the queue.
 */
async function checkBotMatch(player) {
    const a = 1;
    const GAME_MODE = process.env.GAME_MODE || 'production';
    if (GAME_MODE !== 'test') {
        return; // Bots are only for test mode
    }

    const waitTimeSeconds = (new Date() - new Date(player.entryTime)) / 1000;
    if (waitTimeSeconds > 10) {
        console.log(`[Matchmaking] Player ${player.userId} has been waiting for ${waitTimeSeconds.toFixed(1)}s. Creating a bot match.`);

        // Remove player from queue
        await leaveQueue(player.userId);

        const playerHero = (await db.getHeroesByUserId(player.userId)).find(h => h.id === player.heroId);

        // Create a bot opponent
        const botOpponent = {
            userId: -1, // Special ID for bots
            hero: {
                id: -1,
                hero_type: 'mock',
                level: playerHero.level, // Match the player's level
                hp: 100,
                damage: 1,
                speed: 200,
                // ... other stats
            }
        };

        const match = {
            player1: { userId: player.userId, hero: playerHero },
            player2: botOpponent
        };

        // Here you would create the match record with the bot
        console.log('[Matchmaking] Bot match created:', match);
    }
}


// Start a simple interval to process the queue.
// In a production system, this might be a more robust job scheduler.
// setInterval(processQueue, 5000); // Process every 5 seconds

/**
 * Gets the current status of a player in the queue.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object>} The status of the player.
 */
async function getQueueStatus(userId) {
    // Check the in-memory queue first for immediate feedback
    const playerInQueue = matchmakingQueue.find(p => p.userId === userId);
    if (playerInQueue) {
        return { status: playerInQueue.status, match: playerInQueue.match };
    }

    // If not in memory, check the DB (could be a race condition on match found)
    const dbStatus = await db.getMatchmakingQueueUser(userId);
    if (dbStatus) {
        return { status: dbStatus.status };
    }

    return { status: 'not_in_queue' };
}


module.exports = {
    joinQueue,
    leaveQueue,
    findOpponent,
    processQueue,
    getQueueStatus
};