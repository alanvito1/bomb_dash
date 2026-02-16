const db = require('./database');
const fs = require('fs').promises;
const path = require('path');
const { Op: _Op } = require('sequelize');

const CONFIG_PATH = path.join(__dirname, 'game_config.json');

/**
 * Adds a player to the matchmaking queue.
 * @param {number} userId - The ID of the user.
 * @param {number} heroId - The ID of the hero selected for the match.
 * @returns {Promise<object>} The result of the operation.
 */
async function joinQueue(userId, heroId, tier = 'default') {
  // Add to the database
  const dbResult = await db.addToMatchmakingQueue(userId, heroId, tier);

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
  await db.removeFromMatchmakingQueue(userId);
  console.log(`[Matchmaking] User ${userId} removed from the queue.`);
  return { success: true };
}

async function processQueue() {
  try {
    // 1. Fetch all searching players from DB
    const searchingPlayers = await db.MatchmakingQueue.findAll({
      where: { status: 'searching' },
      order: [['entry_time', 'ASC']], // Process oldest first
    });

    if (searchingPlayers.length === 0) {
      return;
    }

    console.log(
      `[Matchmaking] Processing queue with ${searchingPlayers.length} players...`
    );

    const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    const levelRange = config.matchmakingLevelRange || 5;
    const botTimeout = config.matchmakingBotTimeout || 30;

    const processedPlayerIds = new Set();

    for (const player of searchingPlayers) {
      if (processedPlayerIds.has(player.user_id)) {
        continue;
      }

      // 2. Try to find a human opponent
      let match = await findHumanOpponent(
        player,
        searchingPlayers,
        processedPlayerIds,
        levelRange
      );

      // 3. If no human, check for bot match
      if (!match) {
        match = await checkBotMatch(player, botTimeout);
      }

      if (match) {
        const player1Id = match.player1.userId;
        const player2Id = match.player2.userId; // -1 for bot

        console.log(
          `[Matchmaking] Match created for User ${player1Id} against ${
            player2Id === -1 ? 'Test Bot' : 'User ' + player2Id
          }`
        );

        processedPlayerIds.add(player1Id);

        // Update Player 1
        await db.updateMatchmakingQueueStatus(player1Id, 'found', {
          opponent: match.player2,
          tier: player.tier,
        });

        // Update Player 2 (if human)
        if (player2Id !== -1) {
          processedPlayerIds.add(player2Id);
          await db.updateMatchmakingQueueStatus(player2Id, 'found', {
            opponent: match.player1,
            tier: player.tier,
          });
        }
      }
    }
  } catch (error) {
    console.error(
      '[FATAL] Unhandled error in matchmaking processQueue:',
      error
    );
  }
}

async function findHumanOpponent(player, allPlayers, processedIds, levelRange) {
  const playerHero = (await db.getHeroesByUserId(player.user_id)).find(
    (h) => h.id === player.hero_id
  );

  if (!playerHero) return null;

  for (const opponent of allPlayers) {
    if (opponent.user_id === player.user_id) continue;
    if (processedIds.has(opponent.user_id)) continue;
    if (opponent.tier !== player.tier) continue;

    const opponentHero = (await db.getHeroesByUserId(opponent.user_id)).find(
      (h) => h.id === opponent.hero_id
    );

    if (!opponentHero) continue;

    const levelDifference = Math.abs(playerHero.level - opponentHero.level);

    if (levelDifference <= levelRange) {
      return {
        player1: { userId: player.user_id, hero: playerHero },
        player2: { userId: opponent.user_id, hero: opponentHero },
      };
    }
  }
  return null;
}

async function checkBotMatch(player, botTimeout) {
  const waitTimeSeconds = (new Date() - new Date(player.entry_time)) / 1000;

  if (waitTimeSeconds > botTimeout) {
    const playerHero = (await db.getHeroesByUserId(player.user_id)).find(
      (h) => h.id === player.hero_id
    );
    if (!playerHero) return null;

    const botOpponent = {
      userId: -1,
      hero: {
        id: -1,
        hero_type: 'bot',
        sprite_name: 'witch_bot',
        level: playerHero.level,
        hp: 80 + playerHero.level * 10,
        maxHp: 80 + playerHero.level * 10,
        damage: 1 + Math.floor(playerHero.level / 5),
        speed: 180 + Math.floor(playerHero.level / 2),
        name: 'Test Bot',
      },
    };

    return {
      player1: { userId: player.user_id, hero: playerHero },
      player2: botOpponent,
    };
  }
  return null;
}

/**
 * Gets the current status of a player in the queue.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object>} The status of the player.
 */
async function getQueueStatus(userId) {
  const dbStatus = await db.getMatchmakingQueueUser(userId);
  if (dbStatus) {
    let matchData = null;
    if (dbStatus.match_data) {
      try {
        matchData = JSON.parse(dbStatus.match_data);
        return { status: dbStatus.status, match: matchData };
      } catch (e) {
        console.error('Error parsing match data', e);
      }
    }
    return { status: dbStatus.status };
  }

  return { status: 'not_in_queue' };
}

module.exports = {
  joinQueue,
  leaveQueue,
  processQueue,
  getQueueStatus,
};
