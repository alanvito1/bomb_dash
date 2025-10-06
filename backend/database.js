const { Sequelize, DataTypes, Op } = require('sequelize');
const { getExperienceForLevel, getLevelFromExperience } = require('./rpg');

// Use in-memory SQLite database for tests, otherwise use the file specified.
const isTestEnv = process.env.NODE_ENV === 'test';
const storage = isTestEnv ? ':memory:' : (process.env.DB_PATH || './ranking.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storage,
  logging: false // Disable logging, especially for tests. Set to console.log for debugging.
});

// Define Models
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    wallet_address: { type: DataTypes.STRING, unique: true, allowNull: false },
    max_score: { type: DataTypes.INTEGER, defaultValue: 0 },
    account_level: { type: DataTypes.INTEGER, defaultValue: 1 },
    account_xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    coins: { type: DataTypes.INTEGER, defaultValue: 1000 },
    last_score_timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'users', timestamps: false });

const Hero = sequelize.define('Hero', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hero_type: { type: DataTypes.STRING, allowNull: false, validate: { isIn: [['mock', 'nft']] } },
    nft_id: { type: DataTypes.INTEGER },
    level: { type: DataTypes.INTEGER, defaultValue: 1 },
    xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    hp: { type: DataTypes.INTEGER, defaultValue: 100 },
    maxHp: { type: DataTypes.INTEGER, defaultValue: 100 },
    damage: { type: DataTypes.INTEGER, defaultValue: 1 },
    speed: { type: DataTypes.INTEGER, defaultValue: 200 },
    extraLives: { type: DataTypes.INTEGER, defaultValue: 1 },
    fireRate: { type: DataTypes.INTEGER, defaultValue: 600 },
    bombSize: { type: DataTypes.FLOAT, defaultValue: 1.0 },
    multiShot: { type: DataTypes.INTEGER, defaultValue: 0 },
    sprite_name: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'in_wallet', allowNull: false, validate: { isIn: [['in_wallet', 'staked']] } },
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    tableName: 'heroes',
    timestamps: false,
    uniqueKeys: {
        user_nft_unique: {
            fields: ['user_id', 'nft_id']
        }
    }
});

User.hasMany(Hero, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Hero.belongsTo(User, { foreignKey: 'user_id' });

const WagerTier = sequelize.define('WagerTier', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    bcoin_cost: { type: DataTypes.INTEGER, allowNull: false },
    xp_cost: { type: DataTypes.INTEGER, allowNull: false }
}, { tableName: 'wager_tiers', timestamps: false });

const GameSetting = sequelize.define('GameSetting', {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.STRING, allowNull: false }
}, { tableName: 'game_settings', timestamps: false });

const WagerMatch = sequelize.define('WagerMatch', {
    match_id: { type: DataTypes.INTEGER, primaryKey: true },
    tier_id: { type: DataTypes.INTEGER, allowNull: false },
    player1_address: { type: DataTypes.STRING, allowNull: false },
    player2_address: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' },
    winner_address: { type: DataTypes.STRING }
}, { tableName: 'wager_matches', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const PlayerCheckpoint = sequelize.define('PlayerCheckpoint', {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    highest_wave_reached: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, { tableName: 'player_checkpoints', timestamps: false });

PlayerCheckpoint.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

const MatchmakingQueue = sequelize.define('MatchmakingQueue', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    hero_id: { type: DataTypes.INTEGER, allowNull: false },
    tier: { type: DataTypes.STRING, allowNull: false, defaultValue: 'default' },
    entry_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'searching' }
}, { tableName: 'matchmaking_queue', timestamps: false });

MatchmakingQueue.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
MatchmakingQueue.belongsTo(Hero, { foreignKey: 'hero_id', onDelete: 'CASCADE' });

const AltarStatus = sequelize.define('AltarStatus', {
    id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1, validate: { isIn: [[1]] } },
    current_donations: { type: DataTypes.INTEGER, defaultValue: 0 },
    donation_goal: { type: DataTypes.INTEGER, defaultValue: 10000 },
    active_buff_type: { type: DataTypes.STRING },
    buff_expires_at: { type: DataTypes.DATE }
}, { tableName: 'altar_status', timestamps: false });

const SoloGameHistory = sequelize.define('SoloGameHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    claimed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'solo_game_history',
    timestamps: false,
    indexes: [{ fields: ['user_id'] }, { fields: ['timestamp'] }]
});

SoloGameHistory.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });


async function seedDatabase() {
    await WagerTier.bulkCreate([
        { id: 1, name: 'Bronze', bcoin_cost: 10, xp_cost: 20 },
        { id: 2, name: 'Silver', bcoin_cost: 50, xp_cost: 100 },
        { id: 3, name: 'Gold', bcoin_cost: 200, xp_cost: 500 }
    ], { ignoreDuplicates: true });

    await GameSetting.findOrCreate({
        where: { key: 'xp_multiplier' },
        defaults: { value: '1.0' }
    });

    await AltarStatus.findOrCreate({
        where: { id: 1 }
    });
}

async function initDb() {
    // For in-memory db, `force: true` is fine as it's destroyed on process exit.
    // For file-based db, we avoid `force: true` to not lose data.
    await sequelize.sync({ force: isTestEnv });
    await seedDatabase();
    console.log('Database & tables created!');
    return sequelize;
}

async function closeDb() {
    return sequelize.close();
}

// Data Access Functions
async function createUserByAddress(address, initialCoins = 1000) {
    const user = await User.create({ wallet_address: address, coins: initialCoins });
    return { success: true, userId: user.id };
}

async function findUserByAddress(address) {
    return User.findOne({ where: { wallet_address: address }, attributes: ['id', 'wallet_address'] });
}

async function getUserByAddress(address) {
    return User.findOne({ where: { wallet_address: address } });
}

async function addXpToUser(address, xpAmount) {
     return sequelize.transaction(async (t) => {
        const user = await User.findOne({ where: { wallet_address: address }, transaction: t });
        if (!user) throw new Error(`User not found with address ${address}`);

        const setting = await GameSetting.findOne({ where: { key: 'xp_multiplier' }, transaction: t });
        const multiplier = parseFloat(setting ? setting.value : '1.0');

        let newXp = user.account_xp + xpAmount;
        let newLevel = user.account_level;

        while (true) {
            const xpForNextLevel = getExperienceForLevel(newLevel + 1, multiplier);
            if (newXp >= xpForNextLevel) {
                newLevel++;
            } else {
                break;
            }
        }
        user.account_xp = newXp;
        user.account_level = newLevel;
        await user.save({ transaction: t });
        return { success: true, newXp, newLevel };
    });
}

async function getWagerTier(tierId) {
    return WagerTier.findByPk(tierId);
}

async function getWagerTiers() {
    return WagerTier.findAll({ order: [['id', 'ASC']] });
}

async function processWagerMatchResult(winnerAddress, loserAddress, tier) {
    return sequelize.transaction(async (t) => {
        const winner = await User.findOne({ where: { wallet_address: winnerAddress }, transaction: t });
        const loser = await User.findOne({ where: { wallet_address: loserAddress }, transaction: t });
        if (!winner || !loser) throw new Error("Winner or loser not found");

        const setting = await GameSetting.findOne({ where: { key: 'xp_multiplier' }, transaction: t });
        const multiplier = parseFloat(setting ? setting.value : '1.0');

        let finalXpReward = tier.xp_cost;
        let finalCoinReward = tier.bcoin_cost;
        if (new Date().getDay() === 0) { // Sunday Bonus
            finalXpReward = Math.floor(finalXpReward * 1.10);
            finalCoinReward = Math.floor(finalCoinReward * 1.10);
        }

        // Update Winner
        winner.coins += finalCoinReward;
        winner.account_xp += finalXpReward;
        let winnerNewLevel = winner.account_level;
        while (true) {
            const xpForNextLevel = getExperienceForLevel(winnerNewLevel + 1, multiplier);
            if (winner.account_xp >= xpForNextLevel) {
                winnerNewLevel++;
            } else {
                break;
            }
        }
        winner.account_level = winnerNewLevel;
        await winner.save({ transaction: t });

        // Update Loser
        loser.coins -= tier.bcoin_cost;
        loser.account_xp = Math.max(0, loser.account_xp - tier.xp_cost);
        let loserNewLevel = loser.account_level;
        while (loserNewLevel > 1) {
            const xpForCurrentLevel = getExperienceForLevel(loserNewLevel, multiplier);
            if (loser.account_xp < xpForCurrentLevel) {
                loserNewLevel--;
            } else {
                break;
            }
        }
        loser.account_level = loserNewLevel;
        await loser.save({ transaction: t });

        return {
            success: true,
            winner: { address: winnerAddress, newXp: winner.account_xp, newCoins: winner.coins },
            loser: { address: loserAddress, newXp: loser.account_xp, newCoins: loser.coins, newLevel: loserNewLevel }
        };
    });
}

/**
 * Processes the result of a high-stakes PvP match, transferring Hero XP and handling de-leveling.
 * @param {number} winnerHeroId - The ID of the winner's hero.
 * @param {number} loserHeroId - The ID of the loser's hero.
 * @param {number} xpWager - The amount of XP that was wagered.
 * @returns {Promise<object>} The result of the operation, including updated stats for both heroes.
 */
async function processHeroWagerResult(winnerHeroId, loserHeroId, xpWager) {
    return sequelize.transaction(async (t) => {
        const [winnerHero, loserHero] = await Promise.all([
            Hero.findByPk(winnerHeroId, { transaction: t }),
            Hero.findByPk(loserHeroId, { transaction: t })
        ]);

        if (!winnerHero || !loserHero) {
            throw new Error("Winner or loser hero not found for wager processing.");
        }

        const setting = await GameSetting.findOne({ where: { key: 'xp_multiplier' }, transaction: t });
        const multiplier = parseFloat(setting ? setting.value : '1.0');

        // 1. Update Winner's XP
        winnerHero.xp += xpWager;
        // Recalculate level in case of level up
        const winnerNewLevel = getLevelFromExperience(winnerHero.xp, multiplier);
        if (winnerNewLevel > winnerHero.level) {
            winnerHero.level = winnerNewLevel;
        }
        await winnerHero.save({ transaction: t });

        // 2. Update Loser's XP and handle De-Leveling
        loserHero.xp = Math.max(0, loserHero.xp - xpWager);
        const loserNewLevel = getLevelFromExperience(loserHero.xp, multiplier);
        if (loserNewLevel < loserHero.level) {
            loserHero.level = loserNewLevel;
        }
        await loserHero.save({ transaction: t });

        return {
            success: true,
            winner: { heroId: winnerHeroId, newXp: winnerHero.xp, newLevel: winnerHero.level },
            loser: { heroId: loserHeroId, newXp: loserHero.xp, newLevel: loserHero.level }
        };
    });
}


async function createWagerMatch(matchData) {
    const { matchId, tierId, player1, player2 } = matchData;
    const match = await WagerMatch.create({ match_id: matchId, tier_id: tierId, player1_address: player1, player2_address: player2 });
    return { success: true, id: match.match_id };
}

async function getWagerMatch(matchId) {
    return WagerMatch.findByPk(matchId);
}

async function updateWagerMatch(matchId, status, winnerAddress) {
    const [affectedRows] = await WagerMatch.update(
        { status, winner_address: winnerAddress },
        { where: { match_id: matchId } }
    );
    return { success: true, changes: affectedRows };
}

async function savePlayerCheckpoint(userId, waveNumber) {
    const [checkpoint, created] = await PlayerCheckpoint.findOrCreate({
        where: { user_id: userId },
        defaults: { highest_wave_reached: waveNumber }
    });

    if (!created && waveNumber > checkpoint.highest_wave_reached) {
        checkpoint.highest_wave_reached = waveNumber;
        await checkpoint.save();
        return { success: true, userId: userId, updated: true };
    }
    return { success: true, userId: userId, updated: created };
}

async function getPlayerCheckpoint(userId) {
    const checkpoint = await PlayerCheckpoint.findByPk(userId);
    return checkpoint ? checkpoint.highest_wave_reached : 0;
}

async function getGameSetting(key) {
    const setting = await GameSetting.findByPk(key);
    return setting ? setting.value : null;
}

async function updateGameSetting(key, value) {
    await GameSetting.upsert({ key, value });
    return { success: true };
}

async function getAllPlayers() {
    return User.findAll({ order: [['id', 'ASC']] });
}

async function updatePlayerStats(userId, stats) {
    const validFields = ['account_level', 'account_xp', 'coins'];
    const updateData = {};
    for (const key in stats) {
        if (validFields.includes(key)) {
            updateData[key] = stats[key];
        }
    }
    if (Object.keys(updateData).length === 0) {
        return { success: true, message: 'No valid fields provided for update.' };
    }
    await User.update(updateData, { where: { id: userId } });
    return { success: true, userId: userId };
}

async function createHeroForUser(userId, heroData) {
    const hero = await Hero.create({ user_id: userId, ...heroData });
    return { success: true, heroId: hero.id };
}

async function getHeroesByUserId(userId) {
    const heroes = await Hero.findAll({ where: { user_id: userId } });
    return heroes.map(hero => {
        const data = hero.toJSON();
        if (data.hero_type === 'mock' && !data.name) {
            data.name = data.sprite_name.charAt(0).toUpperCase() + data.sprite_name.slice(1);
        }
        return data;
    });
}

async function updateHeroStatus(nftId, newStatus) {
    const [affectedRows] = await Hero.update(
        { status: newStatus },
        { where: { nft_id: nftId, hero_type: 'nft' } } // Ensure we only update NFTs
    );
    if (affectedRows === 0) {
        console.warn(`Attempted to update status for a non-existent hero with NFT ID: ${nftId}`);
    }
    return { success: true, changes: affectedRows };
}

async function updateHeroStats(heroId, stats) {
    const validFields = ['level', 'xp', 'hp', 'maxHp', 'damage', 'speed', 'extraLives', 'fireRate', 'bombSize', 'multiShot'];
    const updateData = {};
     for (const key in stats) {
        if (validFields.includes(key)) {
            updateData[key] = stats[key];
        }
    }
    if (Object.keys(updateData).length === 0) {
        return { success: true, message: "No fields to update." };
    }
    updateData.last_updated = new Date();
    const [affectedRows] = await Hero.update(updateData, { where: { id: heroId } });
    return { success: true, changes: affectedRows };
}

async function addXpToHero(heroId, xpAmount) {
    return sequelize.transaction(async (t) => {
        const hero = await Hero.findByPk(heroId, { transaction: t });
        if (!hero) throw new Error(`Hero with ID ${heroId} not found.`);

        const setting = await GameSetting.findOne({ where: { key: 'xp_multiplier' }, transaction: t });
        const multiplier = parseFloat(setting ? setting.value : '1.0');

        hero.xp += xpAmount;
        let newMaxHp = hero.maxHp;

        while (true) {
            const xpForNextLevel = getExperienceForLevel(hero.level + 1, multiplier);
            if (hero.xp >= xpForNextLevel) {
                hero.level++;
                newMaxHp += 10;
            } else {
                break;
            }
        }
        hero.maxHp = newMaxHp;
        hero.hp = newMaxHp; // Refill HP on level up
        await hero.save({ transaction: t });

        return { success: true, hero: hero.toJSON() };
    });
}

async function addToMatchmakingQueue(userId, heroId, tier) {
    const [queueEntry, created] = await MatchmakingQueue.findOrCreate({
        where: { user_id: userId },
        defaults: { hero_id: heroId, tier: tier, status: 'searching', entry_time: new Date() }
    });

    if (!created) {
        queueEntry.hero_id = heroId;
        queueEntry.tier = tier;
        queueEntry.status = 'searching';
        queueEntry.entry_time = new Date();
        await queueEntry.save();
    }
    return { success: true, id: queueEntry.id };
}

async function removeFromMatchmakingQueue(userId) {
    const changes = await MatchmakingQueue.destroy({ where: { user_id: userId } });
    return { success: true, changes };
}

async function getMatchmakingQueueUser(userId) {
    return MatchmakingQueue.findOne({ where: { user_id: userId } });
}

async function getAltarStatus() {
    return AltarStatus.findByPk(1);
}

async function updateAltarStatus(statusData) {
    const [changes] = await AltarStatus.update(statusData, { where: { id: 1 } });
    return { success: true, changes };
}

async function addDonationToAltar(amount) {
    const altar = await AltarStatus.findByPk(1);
    if (altar) {
        altar.current_donations += amount;
        await altar.save();
        return { success: true, changes: 1 };
    }
    return { success: false, changes: 0 };
}

async function getTop10Ranking() {
    return User.findAll({
        attributes: [['wallet_address', 'username'], ['max_score', 'score']],
        order: [['max_score', 'DESC']],
        limit: 10
    });
}

async function grantRewards(userId, bcoinReward, accountXpReward) {
    return sequelize.transaction(async (t) => {
        const user = await User.findByPk(userId, { transaction: t });
        if (!user) {
            throw new Error(`User with ID ${userId} not found for granting rewards.`);
        }

        user.coins += bcoinReward;
        user.account_xp += accountXpReward;

        // Recalculate account level based on new XP
        const newLevel = getLevelFromExperience(user.account_xp); // Assuming base multiplier
        if (newLevel > user.account_level) {
            user.account_level = newLevel;
        }

        await user.save({ transaction: t });
        return { success: true, user: user.toJSON() };
    });
}

async function logSoloGame(userId) {
    await SoloGameHistory.create({ user_id: userId });
    return { success: true };
}

async function countGamesInCycle(startTime) {
    const count = await SoloGameHistory.count({
        where: {
            timestamp: {
                [Op.gte]: startTime
            }
        }
    });
    return count;
}

async function getUnclaimedGamesForUser(userId, cycleStartTime) {
    const count = await SoloGameHistory.count({
        where: {
            user_id: userId,
            claimed: false,
            timestamp: {
                [Op.gte]: cycleStartTime
            }
        }
    });
    return count;
}

async function markGamesAsClaimed(userId, cycleStartTime) {
    const [affectedRows] = await SoloGameHistory.update(
        { claimed: true },
        {
            where: {
                user_id: userId,
                claimed: false,
                timestamp: {
                    [Op.gte]: cycleStartTime
                }
            }
        }
    );
    return { success: true, count: affectedRows };
}


module.exports = {
    initDb,
    closeDb,
    createUserByAddress,
    findUserByAddress,
    getUserByAddress,
    addXpToUser,
    getWagerTier,
    getWagerTiers,
    processWagerMatchResult,
    processHeroWagerResult,
    createWagerMatch,
    getWagerMatch,
    updateWagerMatch,
    savePlayerCheckpoint,
    getPlayerCheckpoint,
    getGameSetting,
    updateGameSetting,
    getAllPlayers,
    updatePlayerStats,
    getTop10Ranking,
    createHeroForUser,
    getHeroesByUserId,
    updateHeroStatus,
    updateHeroStats,
    addXpToHero,
    addToMatchmakingQueue,
    removeFromMatchmakingQueue,
    getMatchmakingQueueUser,
    getAltarStatus,
    updateAltarStatus,
    addDonationToAltar,
    grantRewards,
    logSoloGame,
    countGamesInCycle,
    getUnclaimedGamesForUser,
    markGamesAsClaimed,
    // Export models and sequelize instance for testing or advanced usage
    sequelize,
    User,
    Hero
};