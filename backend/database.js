const { Sequelize, DataTypes, Op } = require('sequelize');
const { getExperienceForLevel, getLevelFromExperience } = require('./rpg');

// Use in-memory SQLite database for tests, otherwise use a dedicated file.
const isTestEnv = process.env.NODE_ENV === 'test';
let sequelize;

if (process.env.DATABASE_URL) {
  // Use PostgreSQL for production (Supabase/Neon/Vercel)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // For Supabase/Heroku/Vercel connections
      },
    },
  });
} else {
  // Use SQLite for local development and testing
  const storage = isTestEnv
    ? ':memory:'
    : process.env.DB_PATH || './game.sqlite';
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storage,
    logging: false, // Disable logging, especially for tests. Set to console.log for debugging.
  });
}

// Define Models
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    wallet_address: { type: DataTypes.STRING, unique: true, allowNull: false },
    max_score: { type: DataTypes.INTEGER, defaultValue: 0 },
    account_level: { type: DataTypes.INTEGER, defaultValue: 1 },
    account_xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    coins: { type: DataTypes.INTEGER, defaultValue: 1000 },
    last_score_timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    flagged_cheater: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  { tableName: 'users', timestamps: false }
);

const Hero = sequelize.define(
  'Hero',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    hero_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isIn: [['mock', 'nft']] },
    },
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
    rarity: {
      type: DataTypes.STRING,
      defaultValue: 'Common',
      allowNull: false,
      validate: { isIn: [['Common', 'Rare', 'Super Rare', 'Legend', 'House']] },
    },
    nft_type: {
      type: DataTypes.STRING,
      defaultValue: 'HERO',
      allowNull: false,
      validate: { isIn: [['HERO', 'HOUSE']] },
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'in_wallet',
      allowNull: false,
      validate: { isIn: [['in_wallet', 'staked']] },
    },
    bomb_mastery_xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    agility_xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'heroes',
    timestamps: false,
    uniqueKeys: {
      user_nft_unique: {
        fields: ['user_id', 'nft_id'],
      },
    },
  }
);

User.hasMany(Hero, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Hero.belongsTo(User, { foreignKey: 'user_id' });

const WagerTier = sequelize.define(
  'WagerTier',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    bcoin_cost: { type: DataTypes.INTEGER, allowNull: false },
    xp_cost: { type: DataTypes.INTEGER, allowNull: false },
  },
  { tableName: 'wager_tiers', timestamps: false }
);

const GameSetting = sequelize.define(
  'GameSetting',
  {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.STRING, allowNull: false },
  },
  { tableName: 'game_settings', timestamps: false }
);

const WagerMatch = sequelize.define(
  'WagerMatch',
  {
    match_id: { type: DataTypes.INTEGER, primaryKey: true },
    tier_id: { type: DataTypes.INTEGER, allowNull: false },
    player1_address: { type: DataTypes.STRING, allowNull: false },
    player2_address: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
    winner_address: { type: DataTypes.STRING },
    player1_score: { type: DataTypes.INTEGER, allowNull: true },
    player2_score: { type: DataTypes.INTEGER, allowNull: true },
    player1_hero_id: { type: DataTypes.INTEGER, allowNull: true },
    player2_hero_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'wager_matches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

const PlayerCheckpoint = sequelize.define(
  'PlayerCheckpoint',
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    highest_wave_reached: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: 'player_checkpoints', timestamps: false }
);

PlayerCheckpoint.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
});

const MatchmakingQueue = sequelize.define(
  'MatchmakingQueue',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    hero_id: { type: DataTypes.INTEGER, allowNull: false },
    tier: { type: DataTypes.STRING, allowNull: false, defaultValue: 'default' },
    entry_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'searching',
    },
    match_data: {
      type: DataTypes.TEXT, // Storing JSON as text for compatibility
      allowNull: true,
    },
  },
  { tableName: 'matchmaking_queue', timestamps: false }
);

MatchmakingQueue.belongsTo(User, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
});
MatchmakingQueue.belongsTo(Hero, {
  foreignKey: 'hero_id',
  onDelete: 'CASCADE',
});

const AltarStatus = sequelize.define(
  'AltarStatus',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      defaultValue: 1,
      validate: { isIn: [[1]] },
    },
    current_donations: { type: DataTypes.INTEGER, defaultValue: 0 },
    donation_goal: { type: DataTypes.INTEGER, defaultValue: 10000 },
    active_buff_type: { type: DataTypes.STRING },
    buff_expires_at: { type: DataTypes.DATE },
  },
  { tableName: 'altar_status', timestamps: false }
);

const AltarDonation = sequelize.define(
  'AltarDonation',
  {
    tx_hash: { type: DataTypes.STRING, primaryKey: true },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'altar_donations', timestamps: false }
);

const SoloGameHistory = sequelize.define(
  'SoloGameHistory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    claimed: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    tableName: 'solo_game_history',
    timestamps: false,
    indexes: [{ fields: ['user_id'] }, { fields: ['timestamp'] }],
  }
);

SoloGameHistory.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

const UserBestiary = sequelize.define(
  'UserBestiary',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    enemy_type: { type: DataTypes.STRING, allowNull: false },
    kill_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: 'user_bestiary',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'enemy_type'],
      },
    ],
  }
);

UserBestiary.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

const News = sequelize.define(
  'News',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false }, // e.g., 'News', 'Updates', 'Events'
    content: { type: DataTypes.TEXT, allowNull: false },
    image_url: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'news', timestamps: false }
);

async function seedDatabase() {
  await WagerTier.bulkCreate(
    [
      { id: 1, name: 'Bronze', bcoin_cost: 10, xp_cost: 20 },
      { id: 2, name: 'Silver', bcoin_cost: 50, xp_cost: 100 },
      { id: 3, name: 'Gold', bcoin_cost: 200, xp_cost: 500 },
    ],
    { ignoreDuplicates: true }
  );

  await GameSetting.findOrCreate({
    where: { key: 'xp_multiplier' },
    defaults: { value: '1.0' },
  });

  await AltarStatus.findOrCreate({
    where: { id: 1 },
  });
}

/**
 * A simple migration function to ensure the database schema is up-to-date.
 * This is crucial for avoiding "no such column" errors when new fields are added to models.
 * @param {import('sequelize').QueryInterface} queryInterface
 */
async function runMigrations(queryInterface) {
  console.log('MIGRATION: Starting database schema check...');
  const tables = await queryInterface.showAllTables();

  // --- Users Table Migration ---
  if (tables.includes('users')) {
    const userTableInfo = await queryInterface.describeTable('users');

    if (!userTableInfo.coins) {
      console.log(
        "MIGRATION: 'coins' column not found in 'users' table. Adding it now..."
      );
      await queryInterface.addColumn('users', 'coins', {
        type: DataTypes.INTEGER,
        defaultValue: 1000,
      });
      console.log("MIGRATION: 'coins' column added successfully.");
    } else {
      console.log("MIGRATION: 'coins' column already exists in 'users' table.");
    }

    if (!userTableInfo.flagged_cheater) {
      console.log(
        "MIGRATION: 'flagged_cheater' column not found in 'users' table. Adding it now..."
      );
      await queryInterface.addColumn('users', 'flagged_cheater', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      });
      console.log("MIGRATION: 'flagged_cheater' column added successfully.");
    }
  }

  // --- WagerMatches Table Migration ---
  if (tables.includes('wager_matches')) {
    const matchesTableInfo = await queryInterface.describeTable(
      'wager_matches'
    );

    if (!matchesTableInfo.player1_score) {
      console.log(
        "MIGRATION: 'player1_score' column not found in 'wager_matches' table. Adding it now..."
      );
      await queryInterface.addColumn('wager_matches', 'player1_score', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log("MIGRATION: 'player1_score' column added successfully.");
    }

    if (!matchesTableInfo.player2_score) {
      console.log(
        "MIGRATION: 'player2_score' column not found in 'wager_matches' table. Adding it now..."
      );
      await queryInterface.addColumn('wager_matches', 'player2_score', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log("MIGRATION: 'player2_score' column added successfully.");
    }

    if (!matchesTableInfo.player1_hero_id) {
      console.log(
        "MIGRATION: 'player1_hero_id' column not found in 'wager_matches' table. Adding it now..."
      );
      await queryInterface.addColumn('wager_matches', 'player1_hero_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log("MIGRATION: 'player1_hero_id' column added successfully.");
    }

    if (!matchesTableInfo.player2_hero_id) {
      console.log(
        "MIGRATION: 'player2_hero_id' column not found in 'wager_matches' table. Adding it now..."
      );
      await queryInterface.addColumn('wager_matches', 'player2_hero_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log("MIGRATION: 'player2_hero_id' column added successfully.");
    }
  }

  // --- Heroes Table Migration ---
  if (tables.includes('heroes')) {
    const heroTableInfo = await queryInterface.describeTable('heroes');

    if (!heroTableInfo.sprite_name) {
      console.log(
        "MIGRATION: 'sprite_name' column not found in 'heroes' table. Adding it now..."
      );
      await queryInterface.addColumn('heroes', 'sprite_name', {
        type: DataTypes.STRING,
        allowNull: true,
      });
      console.log("MIGRATION: 'sprite_name' column added successfully.");
    } else {
      console.log(
        "MIGRATION: 'sprite_name' column already exists in 'heroes' table."
      );
    }

    if (!heroTableInfo.rarity) {
      console.log(
        "MIGRATION: 'rarity' column not found in 'heroes' table. Adding it now..."
      );
      await queryInterface.addColumn('heroes', 'rarity', {
        type: DataTypes.STRING,
        defaultValue: 'Common',
        allowNull: false,
      });
      console.log("MIGRATION: 'rarity' column added successfully.");
    }

    if (!heroTableInfo.nft_type) {
      console.log(
        "MIGRATION: 'nft_type' column not found in 'heroes' table. Adding it now..."
      );
      await queryInterface.addColumn('heroes', 'nft_type', {
        type: DataTypes.STRING,
        defaultValue: 'HERO',
        allowNull: false,
      });
      console.log("MIGRATION: 'nft_type' column added successfully.");
    }

    if (!heroTableInfo.bomb_mastery_xp) {
      console.log(
        "MIGRATION: 'bomb_mastery_xp' column not found in 'heroes' table. Adding it now..."
      );
      await queryInterface.addColumn('heroes', 'bomb_mastery_xp', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      });
      console.log("MIGRATION: 'bomb_mastery_xp' column added successfully.");
    }

    if (!heroTableInfo.agility_xp) {
      console.log(
        "MIGRATION: 'agility_xp' column not found in 'heroes' table. Adding it now..."
      );
      await queryInterface.addColumn('heroes', 'agility_xp', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      });
      console.log("MIGRATION: 'agility_xp' column added successfully.");
    }
  }

  // --- UserBestiary Table Migration ---
  if (!tables.includes('user_bestiary')) {
    console.log(
      "MIGRATION: 'user_bestiary' table not found. Creating it now..."
    );
    await queryInterface.createTable('user_bestiary', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      enemy_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kill_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    });
    // Add unique index
    await queryInterface.addIndex('user_bestiary', ['user_id', 'enemy_type'], {
      unique: true,
      name: 'user_bestiary_user_id_enemy_type_unique',
    });
    console.log("MIGRATION: 'user_bestiary' table created successfully.");
  }

  // --- MatchmakingQueue Table Migration ---
  if (tables.includes('matchmaking_queue')) {
    const queueTableInfo = await queryInterface.describeTable(
      'matchmaking_queue'
    );

    if (!queueTableInfo.match_data) {
      console.log(
        "MIGRATION: 'match_data' column not found in 'matchmaking_queue' table. Adding it now..."
      );
      await queryInterface.addColumn('matchmaking_queue', 'match_data', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      console.log("MIGRATION: 'match_data' column added successfully.");
    }
  }

  // --- News Table Migration ---
  if (!tables.includes('news')) {
    console.log("MIGRATION: 'news' table not found. Creating it now...");
    await queryInterface.createTable('news', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    });
    console.log("MIGRATION: 'news' table created successfully.");
  }

  console.log('MIGRATION: Database schema check complete.');
}

async function initDb() {
  // For test env, we can force sync. For prod, we run migrations first.
  if (!isTestEnv && process.env.NODE_ENV !== 'production') {
    await runMigrations(sequelize.getQueryInterface());
  }

  // In production (Serverless/Supabase), we skip sync() to avoid startup latency and locks.
  // The schema is managed via migrations or SQL scripts (supabase_schema.sql).
  if (process.env.NODE_ENV !== 'production' || process.env.DB_SYNC === 'true') {
    await sequelize.sync({ force: isTestEnv });
    await seedDatabase();
    console.log('Database & tables created!');
  } else {
    console.log('Production mode: Skipping sequelize.sync() and seeding.');
  }

  return sequelize;
}

async function closeDb() {
  return sequelize.close();
}

// Data Access Functions
async function createUserByAddress(address, initialCoins = 1000) {
  const user = await User.create({
    wallet_address: address,
    coins: initialCoins,
  });
  return { success: true, userId: user.id };
}

async function findUserByAddress(address) {
  return User.findOne({
    where: { wallet_address: address },
    attributes: ['id', 'wallet_address'],
  });
}

async function getUserByAddress(address) {
  return User.findOne({ where: { wallet_address: address } });
}

async function addXpToUser(address, xpAmount) {
  return sequelize.transaction(async (t) => {
    const user = await User.findOne({
      where: { wallet_address: address },
      transaction: t,
    });
    if (!user) throw new Error(`User not found with address ${address}`);

    const setting = await GameSetting.findOne({
      where: { key: 'xp_multiplier' },
      transaction: t,
    });
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
    const winner = await User.findOne({
      where: { wallet_address: winnerAddress },
      transaction: t,
    });
    const loser = await User.findOne({
      where: { wallet_address: loserAddress },
      transaction: t,
    });
    if (!winner || !loser) throw new Error('Winner or loser not found');

    const setting = await GameSetting.findOne({
      where: { key: 'xp_multiplier' },
      transaction: t,
    });
    const multiplier = parseFloat(setting ? setting.value : '1.0');

    let finalXpReward = tier.xp_cost;
    let finalCoinReward = tier.bcoin_cost;
    if (new Date().getDay() === 0) {
      // Sunday Bonus
      finalXpReward = Math.floor(finalXpReward * 1.1);
      finalCoinReward = Math.floor(finalCoinReward * 1.1);
    }

    // Update Winner
    winner.coins += finalCoinReward;
    winner.account_xp += finalXpReward;
    let winnerNewLevel = winner.account_level;
    while (true) {
      const xpForNextLevel = getExperienceForLevel(
        winnerNewLevel + 1,
        multiplier
      );
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
      const xpForCurrentLevel = getExperienceForLevel(
        loserNewLevel,
        multiplier
      );
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
      winner: {
        address: winnerAddress,
        newXp: winner.account_xp,
        newCoins: winner.coins,
      },
      loser: {
        address: loserAddress,
        newXp: loser.account_xp,
        newCoins: loser.coins,
        newLevel: loserNewLevel,
      },
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
      Hero.findByPk(loserHeroId, { transaction: t }),
    ]);

    if (!winnerHero || !loserHero) {
      throw new Error('Winner or loser hero not found for wager processing.');
    }

    const setting = await GameSetting.findOne({
      where: { key: 'xp_multiplier' },
      transaction: t,
    });
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
      // On de-level, set XP to the maximum for the new level to ensure consistency.
      const xpForNextLevel = getExperienceForLevel(
        loserNewLevel + 1,
        multiplier
      );
      loserHero.xp = xpForNextLevel - 1;
    }
    await loserHero.save({ transaction: t });

    return {
      success: true,
      winner: {
        heroId: winnerHeroId,
        newXp: winnerHero.xp,
        newLevel: winnerHero.level,
      },
      loser: {
        heroId: loserHeroId,
        newXp: loserHero.xp,
        newLevel: loserHero.level,
      },
    };
  });
}

async function createWagerMatch(matchData) {
  const { matchId, tierId, player1, player2 } = matchData;
  const match = await WagerMatch.create({
    match_id: matchId,
    tier_id: tierId,
    player1_address: player1,
    player2_address: player2,
  });
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
    defaults: { highest_wave_reached: waveNumber },
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
  return heroes.map((hero) => {
    const data = hero.toJSON();
    // Ensure name is always present (critical for PvP opponent display)
    if (!data.name) {
      if (data.sprite_name) {
        // Formats "ninja_hero" to "Ninja Hero"
        data.name = data.sprite_name
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } else {
        data.name = 'Unknown Hero';
      }
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
    console.warn(
      `Attempted to update status for a non-existent hero with NFT ID: ${nftId}`
    );
  }
  return { success: true, changes: affectedRows };
}

async function updateHeroStats(heroId, stats) {
  // Add 'status' to the list of fields that can be updated.
  const validFields = [
    'level',
    'xp',
    'hp',
    'maxHp',
    'damage',
    'speed',
    'extraLives',
    'fireRate',
    'bombSize',
    'multiShot',
    'status',
    'rarity',
    'nft_type',
  ];
  const updateData = {};
  for (const key in stats) {
    if (validFields.includes(key)) {
      updateData[key] = stats[key];
    }
  }
  if (Object.keys(updateData).length === 0) {
    return { success: true, message: 'No fields to update.' };
  }
  updateData.last_updated = new Date();
  const [affectedRows] = await Hero.update(updateData, {
    where: { id: heroId },
  });
  return { success: true, changes: affectedRows };
}

async function addXpToHero(heroId, xpAmount) {
  return sequelize.transaction(async (t) => {
    const hero = await Hero.findByPk(heroId, { transaction: t });
    if (!hero) throw new Error(`Hero with ID ${heroId} not found.`);

    const setting = await GameSetting.findOne({
      where: { key: 'xp_multiplier' },
      transaction: t,
    });
    const multiplier = parseFloat(setting ? setting.value : '1.0');

    const xpForNextLevel = getExperienceForLevel(hero.level + 1, multiplier);
    const xpCap = xpForNextLevel > 0 ? xpForNextLevel - 1 : 0;

    // If hero is already at max XP for their level, do not add more.
    if (hero.xp >= xpCap) {
      return { success: true, hero: hero.toJSON() };
    }

    const newXp = hero.xp + xpAmount;
    hero.xp = Math.min(newXp, xpCap); // Cap the XP at the max for the current level

    await hero.save({ transaction: t });

    return { success: true, hero: hero.toJSON() };
  });
}

async function addToMatchmakingQueue(userId, heroId, tier) {
  const [queueEntry, created] = await MatchmakingQueue.findOrCreate({
    where: { user_id: userId },
    defaults: {
      hero_id: heroId,
      tier: tier,
      status: 'searching',
      entry_time: new Date(),
    },
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
  const changes = await MatchmakingQueue.destroy({
    where: { user_id: userId },
  });
  return { success: true, changes };
}

async function getMatchmakingQueueUser(userId) {
  return MatchmakingQueue.findOne({ where: { user_id: userId } });
}

async function updateMatchmakingQueueStatus(userId, status, matchData = null) {
  const updatePayload = { status };
  if (matchData) {
    updatePayload.match_data = JSON.stringify(matchData);
  }
  const [changes] = await MatchmakingQueue.update(updatePayload, {
    where: { user_id: userId },
  });
  return { success: true, changes };
}

async function getAltarStatus() {
  return AltarStatus.findByPk(1);
}

async function updateAltarStatus(statusData) {
  const [changes] = await AltarStatus.update(statusData, { where: { id: 1 } });
  return { success: true, changes };
}

async function addDonationToAltar(amount, txHash) {
  if (!txHash) throw new Error('txHash required for donation');
  return sequelize.transaction(async (t) => {
    // Check duplicate
    const existing = await AltarDonation.findByPk(txHash, { transaction: t });
    if (existing) {
      throw new Error('Transaction already processed');
    }

    await AltarDonation.create(
      { tx_hash: txHash, amount: amount },
      { transaction: t }
    );

    const altar = await AltarStatus.findByPk(1, { transaction: t });
    if (altar) {
      altar.current_donations += amount;
      await altar.save({ transaction: t });
      return { success: true, changes: 1 };
    }
    return { success: false, changes: 0 };
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
        [Op.gte]: startTime,
      },
    },
  });
  return count;
}

async function getUnclaimedGamesForUser(userId, cycleStartTime) {
  const count = await SoloGameHistory.count({
    where: {
      user_id: userId,
      claimed: false,
      timestamp: {
        [Op.gte]: cycleStartTime,
      },
    },
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
          [Op.gte]: cycleStartTime,
        },
      },
    }
  );
  return { success: true, count: affectedRows };
}

async function getRanking(limit = 10) {
  return PlayerCheckpoint.findAll({
    include: [
      {
        model: User,
        attributes: ['wallet_address'],
        required: true, // Ensures we only get checkpoints for existing users
      },
    ],
    order: [['highest_wave_reached', 'DESC']],
    limit: limit,
  });
}

async function updateBestiary(userId, updates) {
  // updates: { [enemyType]: countToAdd }
  return sequelize.transaction(async (t) => {
    const results = [];
    for (const [enemyType, count] of Object.entries(updates)) {
      if (count <= 0) continue;
      const [entry, created] = await UserBestiary.findOrCreate({
        where: { user_id: userId, enemy_type: enemyType },
        defaults: { kill_count: 0 },
        transaction: t,
      });
      entry.kill_count += count;
      await entry.save({ transaction: t });
      results.push(entry.toJSON());
    }
    return results;
  });
}

async function getBestiary(userId) {
  const entries = await UserBestiary.findAll({ where: { user_id: userId } });
  // Convert to object for easier frontend consumption: { slime: 100, goblin: 50 }
  const result = {};
  entries.forEach((entry) => {
    result[entry.enemy_type] = entry.kill_count;
  });
  return result;
}

async function updateHeroProficiency(heroId, updates) {
  // updates: { bombMasteryXp: number, agilityXp: number }
  const hero = await Hero.findByPk(heroId);
  if (!hero) throw new Error(`Hero ${heroId} not found`);

  if (updates.bombMasteryXp) hero.bomb_mastery_xp += updates.bombMasteryXp;
  if (updates.agilityXp) hero.agility_xp += updates.agilityXp;

  await hero.save();
  return hero.toJSON();
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
  createHeroForUser,
  getHeroesByUserId,
  updateHeroStatus,
  updateHeroStats,
  addXpToHero,
  addToMatchmakingQueue,
  removeFromMatchmakingQueue,
  getMatchmakingQueueUser,
  updateMatchmakingQueueStatus,
  getAltarStatus,
  updateAltarStatus,
  addDonationToAltar,
  grantRewards,
  logSoloGame,
  countGamesInCycle,
  getUnclaimedGamesForUser,
  markGamesAsClaimed,
  getRanking,
  updateBestiary,
  getBestiary,
  updateHeroProficiency,
  // Export models and sequelize instance for testing or advanced usage
  sequelize,
  User,
  Hero,
  MatchmakingQueue,
  AltarDonation,
  News,
  UserBestiary,
};
