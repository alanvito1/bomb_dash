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
async function joinQueue(userId, heroId, tier = 'default') {
  // First, remove any existing entry for this user to prevent duplicates
  await leaveQueue(userId);

  const entry = {
    userId,
    heroId,
    tier,
    entryTime: new Date(),
    status: 'searching',
  };

  // Add to the database
  const dbResult = await db.addToMatchmakingQueue(userId, heroId, tier);

  // Add to the in-memory queue
  matchmakingQueue.push({ ...entry, dbId: dbResult.id });

  console.log(
    `[Matchmaking] User ${userId} with hero ${heroId} joined the queue for tier ${tier}.`
  );

  return { success: true, queueId: dbResult.id };
}

/**
 * Removes a player from the matchmaking queue.
 * @param {number} userId - The ID of the user to remove.
 * @returns {Promise<object>} The result of the operation.
 */
async function leaveQueue(userId) {
  const index = matchmakingQueue.findIndex((p) => p.userId === userId);
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

  const playerHero = (await db.getHeroesByUserId(player.userId)).find(
    (h) => h.id === player.heroId
  );
  if (!playerHero) {
    throw new Error(
      `Player hero with ID ${player.heroId} not found for user ${player.userId}`
    );
  }

  // Filter queue for opponents in the same tier
  const potentialOpponents = queue.filter(
    (o) =>
      o.tier === player.tier &&
      o.userId !== player.userId &&
      o.status === 'searching'
  );

  for (const opponent of potentialOpponents) {
    const opponentHero = (await db.getHeroesByUserId(opponent.userId)).find(
      (h) => h.id === opponent.heroId
    );
    if (!opponentHero) {
      console.warn(
        `[Matchmaking] Could not find hero ${opponent.heroId} for opponent ${opponent.userId} in queue. Skipping.`
      );
      continue;
    }

    const levelDifference = Math.abs(playerHero.level - opponentHero.level);

    if (levelDifference <= levelRange) {
      console.log(
        `[Matchmaking] Match found for User ${player.userId} (Lvl ${playerHero.level}) and User ${opponent.userId} (Lvl ${opponentHero.level}) in tier ${player.tier}`
      );

      return {
        player1: { userId: player.userId, hero: playerHero },
        player2: { userId: opponent.userId, hero: opponentHero },
      };
    }
  }

  return null;
}

async function processQueue() {
  try {
    const searchingPlayers = matchmakingQueue.filter(
      (p) => p.status === 'searching'
    );
    if (searchingPlayers.length === 0) {
      return;
    }
    console.log(
      `[Matchmaking] Processing queue with ${searchingPlayers.length} players...`
    );

    const processedPlayerIds = new Set();

    for (const player of searchingPlayers) {
      if (processedPlayerIds.has(player.userId)) {
        continue;
      }

      let match = await findOpponent(player, searchingPlayers);

      if (!match) {
        // If no human opponent was found
        match = await checkBotMatch(player); // Check if it's time for a bot match
      }

      if (match) {
        const player1Id = match.player1.userId;
        const player2Id = match.player2.userId; // This will be -1 for a bot

        console.log(
          `[Matchmaking] Match created for User ${player1Id} against ${
            player2Id === -1 ? 'Test Bot' : 'User ' + player2Id
          }`
        );

        // Mark the human player(s) as 'found' and store the opponent info
        processedPlayerIds.add(player1Id);
        const player1InQueue = matchmakingQueue.find(
          (p) => p.userId === player1Id
        );
        if (player1InQueue) {
          player1InQueue.status = 'found';
          player1InQueue.match = {
            opponent: match.player2,
            tier: player1InQueue.tier,
          };
        }

        // If it's a human-vs-human match, update the second player as well
        if (player2Id !== -1) {
          processedPlayerIds.add(player2Id);
          const player2InQueue = matchmakingQueue.find(
            (p) => p.userId === player2Id
          );
          if (player2InQueue) {
            player2InQueue.status = 'found';
            player2InQueue.match = {
              opponent: match.player1,
              tier: player2InQueue.tier,
            };
          }
        }

        // Clean up the queue after a short delay to allow clients to fetch the status
        setTimeout(() => {
          if (player1Id) leaveQueue(player1Id);
          if (player2Id !== -1) leaveQueue(player2Id); // Don't try to remove the bot from the queue
        }, 5000);
      }
    }
  } catch (error) {
    console.error(
      '[FATAL] Unhandled error in matchmaking processQueue:',
      error
    );
  }
}

/**
 * Checks if a player has been waiting too long and should be matched with a bot.
 * @param {object} player - The player object from the queue.
 */
async function checkBotMatch(player) {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
  const botTimeout = config.matchmakingBotTimeout || 30; // 30 seconds default

  const waitTimeSeconds = (new Date() - new Date(player.entryTime)) / 1000;

  if (waitTimeSeconds > botTimeout) {
    console.log(
      `[Matchmaking] Player ${player.userId} in tier ${
        player.tier
      } has waited ${waitTimeSeconds.toFixed(1)}s. Creating a bot match.`
    );

    const playerHero = (await db.getHeroesByUserId(player.userId)).find(
      (h) => h.id === player.heroId
    );
    if (!playerHero) {
      // This should not happen if the player is in the queue, but as a safeguard:
      console.error(
        `[Matchmaking] CRITICAL: Could not find hero ${player.heroId} for player ${player.userId} for bot match.`
      );
      await leaveQueue(player.userId); // Clean up queue
      return null;
    }

    // Create a bot opponent with stats appropriate for the player's level
    const botOpponent = {
      userId: -1, // Special ID for bots
      hero: {
        id: -1,
        hero_type: 'bot',
        sprite_name: 'witch_bot', // A unique sprite name for the bot
        level: playerHero.level, // Match the player's level
        hp: 80 + playerHero.level * 10, // Scale HP with level
        maxHp: 80 + playerHero.level * 10,
        damage: 1 + Math.floor(playerHero.level / 5), // Scale damage
        speed: 180 + Math.floor(playerHero.level / 2), // Scale speed
        name: 'Test Bot',
      },
    };

    // The match object is structured the same way as a human match
    const match = {
      player1: { userId: player.userId, hero: playerHero },
      player2: botOpponent,
    };

    console.log('[Matchmaking] Bot match created:', match);
    return match;
  }

  return null;
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
  const playerInQueue = matchmakingQueue.find((p) => p.userId === userId);
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
  getQueueStatus,
};
