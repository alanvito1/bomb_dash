const sqlite3 = require('sqlite3').verbose();
const DB_PATH = process.env.DB_PATH || './ranking.sqlite'; // Allow override for testing

let db = null;

// Função para inicializar o banco de dados
async function initDb() {
    return new Promise((resolve, reject) => {
        if (db && DB_PATH === ':memory:') { // Don't re-initialize in-memory DB
            return resolve(db);
        }
        if (db) {
            db.close();
            db = null;
        }

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database', err.message);
                db = null;
                return reject(err);
            }
            console.log('Connected to the SQLite database.');

            const createUserTableSQL = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    wallet_address TEXT UNIQUE NOT NULL,
                    max_score INTEGER DEFAULT 0,
                    level INTEGER DEFAULT 1,
                    xp INTEGER DEFAULT 0,
                    hp INTEGER DEFAULT 100,
                    last_score_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;
            db.run(createUserTableSQL, (err) => {
                if (err) {
                    console.error('Error creating users table', err.message);
                    db.close(); db = null; return reject(err);
                }
                console.log("Users table (Web3) initialized or already exists.");

                const createPlayerStatsTableSQL = `
                    CREATE TABLE IF NOT EXISTS player_stats (
                        user_id INTEGER PRIMARY KEY,
                        damage INTEGER DEFAULT 1,
                        speed INTEGER DEFAULT 200,
                        extraLives INTEGER DEFAULT 1,
                        fireRate INTEGER DEFAULT 600,
                        bombSize REAL DEFAULT 1.0,
                        multiShot INTEGER DEFAULT 0,
                    coins INTEGER DEFAULT 1000, -- BCOIN balance
                        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                `;
                db.run(createPlayerStatsTableSQL, (err) => {
                    if (err) {
                        console.error('Error creating player_stats table', err.message);
                        db.close(); db = null; return reject(err);
                    }
                    console.log("Player_stats table initialized or already exists.");

                // Create Wager Tiers Table
                const createWagerTiersTableSQL = `
                    CREATE TABLE IF NOT EXISTS wager_tiers (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        bcoin_cost INTEGER NOT NULL,
                        xp_cost INTEGER NOT NULL
                    );
                `;
                db.run(createWagerTiersTableSQL, (err) => {
                    if (err) {
                        console.error('Error creating wager_tiers table', err.message);
                        db.close(); db = null; return reject(err);
                    }
                    console.log("Wager_tiers table initialized or already exists.");

                    // Create Game Settings Table for Halving
                    const createGameSettingsTableSQL = `
                        CREATE TABLE IF NOT EXISTS game_settings (
                            key TEXT PRIMARY KEY,
                            value TEXT NOT NULL
                        );
                    `;
                    db.run(createGameSettingsTableSQL, (err) => {
                        if (err) {
                            console.error('Error creating game_settings table', err.message);
                            db.close(); db = null; return reject(err);
                        }
                        console.log("Game_settings table initialized or already exists.");

                        // Seed initial data
                        db.serialize(() => {
                            // Seed Wager Tiers
                            const tierCheck = "SELECT count(*) as count FROM wager_tiers";
                            db.get(tierCheck, (err, row) => {
                                if (row.count === 0) {
                                    console.log("Seeding wager_tiers table...");
                                    const insertTier = db.prepare("INSERT INTO wager_tiers (id, name, bcoin_cost, xp_cost) VALUES (?, ?, ?, ?)");
                                    insertTier.run(1, 'Bronze', 10, 20);
                                    insertTier.run(2, 'Silver', 50, 100);
                                    insertTier.run(3, 'Gold', 200, 500);
                                    insertTier.finalize();
                                }
                            });

                            // Seed Game Settings
                            const settingCheck = "SELECT count(*) as count FROM game_settings WHERE key = 'xp_multiplier'";
                            db.get(settingCheck, (err, row) => {
                                if (row.count === 0) {
                                    console.log("Seeding game_settings table with initial xp_multiplier...");
                                    db.run("INSERT INTO game_settings (key, value) VALUES ('xp_multiplier', '1.0')");
                                }
                            });
                        });

                    // Create Wager Matches Table
                    const createWagerMatchesTableSQL = `
                        CREATE TABLE IF NOT EXISTS wager_matches (
                            match_id INTEGER PRIMARY KEY,
                            tier_id INTEGER NOT NULL,
                            player1_address TEXT NOT NULL,
                            player2_address TEXT NOT NULL,
                            status TEXT NOT NULL DEFAULT 'pending',
                            winner_address TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                    `;
                    db.run(createWagerMatchesTableSQL, (err) => {
                        if (err) {
                            console.error('Error creating wager_matches table', err.message);
                            db.close(); db = null; return reject(err);
                        }
                        console.log("Wager_matches table initialized or already exists.");

                        const createPlayerCheckpointsTableSQL = `
                            CREATE TABLE IF NOT EXISTS player_checkpoints (
                                user_id INTEGER PRIMARY KEY,
                                highest_wave_reached INTEGER DEFAULT 0 NOT NULL,
                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                            );
                        `;
                        db.run(createPlayerCheckpointsTableSQL, (err) => {
                            if (err) {
                                console.error('Error creating player_checkpoints table', err.message);
                                db.close(); db = null; return reject(err);
                            }
                            console.log("Player_checkpoints table initialized or already exists.");
                            resolve(db);
                        });
                    });
                    });
                });
                });
            });
        });
    });
}

// Função para criar um novo usuário e suas estatísticas iniciais atomicamente
async function createUserByAddress(address, initialStats = null) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;", (err) => {
                if (err) return reject(err);
            });

            const userInsertSQL = "INSERT INTO users (wallet_address) VALUES (?);";
            db.run(userInsertSQL, [address], function(err) {
                if (err) {
                    console.error(`Error creating user for address ${address}:`, err.message);
                    return db.run("ROLLBACK;", () => reject(new Error("Failed to create user.")));
                }

                const userId = this.lastID;
                console.log(`User for address ${address} created with ID ${userId}.`);

                const { damage = 1, speed = 200, extraLives = 1, fireRate = 600, bombSize = 1.0, multiShot = 0, coins = 0 } = initialStats || {};
                const statsInsertSQL = `
                    INSERT INTO player_stats (user_id, damage, speed, extraLives, fireRate, bombSize, multiShot, coins)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                `;
                db.run(statsInsertSQL, [userId, damage, speed, extraLives, fireRate, bombSize, multiShot, coins], function(err) {
                    if (err) {
                        console.error(`Error creating initial stats for user ID ${userId}:`, err.message);
                        return db.run("ROLLBACK;", () => reject(new Error("Failed to create user stats.")));
                    }
                    db.run("COMMIT;", (err) => {
                        if (err) {
                            console.error("Commit failed:", err.message);
                            return db.run("ROLLBACK;", () => reject(new Error("Transaction commit failed.")));
                        }
                        console.log(`Initial stats created for user ID ${userId}. Transaction committed.`);
                        resolve({ success: true, userId: userId });
                    });
                });
            });
        });
    });
}

async function findUserByAddress(address) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT id, wallet_address FROM users WHERE wallet_address = ?;";
        db.get(querySQL, [address], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function getPlayerStats(userId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT * FROM player_stats WHERE user_id = ?;";
        db.get(querySQL, [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function savePlayerStats(userId, stats) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const { damage=1, speed=200, extraLives=1, fireRate=600, bombSize=1.0, multiShot=0, coins=0 } = stats;
        const upsertSQL = `
            INSERT INTO player_stats (user_id, damage, speed, extraLives, fireRate, bombSize, multiShot, coins, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
                damage=excluded.damage, speed=excluded.speed, extraLives=excluded.extraLives, fireRate=excluded.fireRate,
                bombSize=excluded.bombSize, multiShot=excluded.multiShot, coins=excluded.coins, last_updated=CURRENT_TIMESTAMP;
        `;
        db.run(upsertSQL, [userId, damage, speed, extraLives, fireRate, bombSize, multiShot, coins], function(err) {
            if (err) return reject(err);
            resolve({ success: true, userId: userId, stats: stats });
        });
    });
}

async function updatePlayerStatsFromNFT(userId, nftStats) {
    if (!db) await initDb();
    const gameStats = {
        damage: nftStats.bombPower,
        speed: nftStats.speed,
        // Keep default values for stats not provided by the NFT
        extraLives: 1,
        fireRate: 600,
        bombSize: 1.0,
        multiShot: 0,
        coins: 0,
    };
    return savePlayerStats(userId, gameStats);
}

const { getExperienceForLevel } = require('./rpg');

// Internal function that performs the core logic without managing transactions.
// It expects db helper functions (`get`, `run`) to be passed in.
async function _addXpToUser_noTX(address, xpAmount, db_helpers) {
    const { get, run } = db_helpers;

    const user = await get("SELECT id, level, xp FROM users WHERE wallet_address = ?;", [address]);
    if (!user) throw new Error(`User not found with address ${address} during XP addition.`);

    const newXp = user.xp + xpAmount;
    let newLevel = user.level;

    const multiplierRow = await get("SELECT value FROM game_settings WHERE key = ?", ['xp_multiplier']);
    const multiplier = parseFloat(multiplierRow ? multiplierRow.value : '1.0');

    // Loop to handle multiple level-ups from a large XP gain
    while (true) {
        const xpForNextLevel = getExperienceForLevel(newLevel + 1, multiplier);
        if (newXp >= xpForNextLevel) {
            newLevel++;
        } else {
            break; // Not enough XP for the next level
        }
    }

    await run("UPDATE users SET xp = ?, level = ? WHERE id = ?;", [newXp, newLevel, user.id]);
    return { newXp, newLevel };
}

// Exported function that manages its own transaction.
// This is for use cases where XP is added outside of another transaction.
async function addXpToUser(address, xpAmount) {
    if (!db) await initDb();
    const run = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this); }));
    const get = (sql, params) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => { err ? reject(err) : resolve(row); }));

    try {
        await run("BEGIN TRANSACTION;");
        const result = await _addXpToUser_noTX(address, xpAmount, { get, run });
        await run("COMMIT;");
        return { success: true, ...result };
    } catch (error) {
        await run("ROLLBACK;").catch(rbError => console.error("Failed to rollback transaction:", rbError));
        console.error(`Error in addXpToUser for address ${address}:`, error.message);
        throw error;
    }
}

async function getUserByAddress(address) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = `
            SELECT u.id, u.wallet_address, u.level, u.xp, ps.coins
            FROM users u
            JOIN player_stats ps ON u.id = ps.user_id
            WHERE u.wallet_address = ?;
        `;
        db.get(querySQL, [address], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function getWagerTier(tierId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM wager_tiers WHERE id = ?", [tierId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function processWagerMatchResult(winnerAddress, loserAddress, tier) {
    if (!db) await initDb();
    const run = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this); }));
    const get = (sql, params) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => { err ? reject(err) : resolve(row); }));

    try {
        await run("BEGIN TRANSACTION;");

        const winner = await getUserByAddress(winnerAddress);
        const loser = await getUserByAddress(loserAddress);
        if (!winner || !loser) throw new Error("Winner or loser not found");

        const multiplierStr = await getGameSetting('xp_multiplier');
        const multiplier = parseFloat(multiplierStr || '1.0');

        // 1. Update Winner's stats
        let finalXpReward = tier.xp_cost;
        let finalCoinReward = tier.bcoin_cost;
        const isSunday = new Date().getDay() === 0; // 0 = Sunday

        if (isSunday) {
            finalXpReward = Math.floor(finalXpReward * 1.10);
            finalCoinReward = Math.floor(finalCoinReward * 1.10);
            console.log(`[Sunday Bonus] Aplicando bônus de 10%. Recompensas: ${finalXpReward} XP, ${finalCoinReward} BCOIN.`);
        }

        const winnerNewCoins = winner.coins + finalCoinReward;
        await run("UPDATE player_stats SET coins = ? WHERE user_id = ?", [winnerNewCoins, winner.id]);
        // Use the internal function to add XP without creating a new transaction
        const { newXp: winnerNewXp } = await _addXpToUser_noTX(winnerAddress, finalXpReward, { get, run });

        // 2. Update Loser's stats
        const loserNewCoins = loser.coins - tier.bcoin_cost;
        const loserNewXp = Math.max(0, loser.xp - tier.xp_cost);
        await run("UPDATE player_stats SET coins = ? WHERE user_id = ?", [loserNewCoins, loser.id]);
        await run("UPDATE users SET xp = ? WHERE id = ?", [loserNewXp, loser.id]);

        // 3. Check for de-level on the loser
        let loserNewLevel = loser.level;
        // Keep checking in case of multiple de-levels from a huge XP loss
        while (true) {
            const xpForCurrentLevel = getExperienceForLevel(loserNewLevel, multiplier);
            if (loserNewXp < xpForCurrentLevel && loserNewLevel > 1) {
                loserNewLevel--;
            } else {
                break;
            }
        }

        if (loserNewLevel !== loser.level) {
            await run("UPDATE users SET level = ? WHERE id = ?", [loserNewLevel, loser.id]);
        }

        await run("COMMIT;");
        return {
            success: true,
            winner: { address: winnerAddress, newXp: winnerNewXp, newCoins: winnerNewCoins },
            loser: { address: loserAddress, newXp: loserNewXp, newCoins: loserNewCoins, newLevel: loserNewLevel }
        };
    } catch (error) {
        await run("ROLLBACK;").catch(rbError => console.error("Failed to rollback transaction:", rbError));
        console.error(`Error in processWagerMatchResult for winner ${winnerAddress} and loser ${loserAddress}:`, error.message);
        throw error;
    }
}

async function getGameSetting(key) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM game_settings WHERE key = ?", [key], (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.value : null);
        });
    });
}

async function updateGameSetting(key, value) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const upsertSQL = "INSERT INTO game_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value;";
        db.run(upsertSQL, [key, value], function(err) {
            if (err) return reject(err);
            resolve({ success: true });
        });
    });
}


function closeDb() {
    if (db) {
        db.close((err) => {
            if (err) return console.error(err.message);
            console.log('Closed the database connection.');
            db = null;
        });
    }
}

async function createWagerMatch(matchData) {
    if (!db) await initDb();
    const { matchId, tierId, player1, player2 } = matchData;
    return new Promise((resolve, reject) => {
        const sql = "INSERT INTO wager_matches (match_id, tier_id, player1_address, player2_address) VALUES (?, ?, ?, ?)";
        db.run(sql, [matchId, tierId, player1, player2], function(err) {
            if (err) return reject(err);
            resolve({ success: true, id: this.lastID });
        });
    });
}

async function getWagerMatch(matchId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM wager_matches WHERE match_id = ?", [matchId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function updateWagerMatch(matchId, status, winnerAddress) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const sql = "UPDATE wager_matches SET status = ?, winner_address = ?, updated_at = CURRENT_TIMESTAMP WHERE match_id = ?";
        db.run(sql, [status, winnerAddress, matchId], function(err) {
            if (err) return reject(err);
            resolve({ success: true, changes: this.changes });
        });
    });
}

async function savePlayerCheckpoint(userId, waveNumber) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const upsertSQL = `
            INSERT INTO player_checkpoints (user_id, highest_wave_reached)
            VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                highest_wave_reached = excluded.highest_wave_reached
            WHERE excluded.highest_wave_reached > player_checkpoints.highest_wave_reached;
        `;
        db.run(upsertSQL, [userId, waveNumber], function(err) {
            if (err) return reject(err);
            resolve({ success: true, userId: userId, updated: this.changes > 0 });
        });
    });
}

async function getPlayerCheckpoint(userId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT highest_wave_reached FROM player_checkpoints WHERE user_id = ?;";
        db.get(querySQL, [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.highest_wave_reached : 0);
        });
    });
}

async function getAllPlayers() {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = `
            SELECT u.id, u.wallet_address, u.level, u.xp, ps.*
            FROM users u
            LEFT JOIN player_stats ps ON u.id = ps.user_id
            ORDER BY u.id;
        `;
        db.all(querySQL, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

async function updatePlayerStats(userId, stats) {
    if (!db) await initDb();

    const userFields = {};
    const playerStatsFields = {};

    // Separate fields for each table based on what's provided in the stats object
    if (stats.level !== undefined) userFields.level = stats.level;
    if (stats.xp !== undefined) userFields.xp = stats.xp;
    if (stats.damage !== undefined) playerStatsFields.damage = stats.damage;
    if (stats.speed !== undefined) playerStatsFields.speed = stats.speed;
    if (stats.extraLives !== undefined) playerStatsFields.extraLives = stats.extraLives;
    if (stats.fireRate !== undefined) playerStatsFields.fireRate = stats.fireRate;
    if (stats.bombSize !== undefined) playerStatsFields.bombSize = stats.bombSize;
    if (stats.multiShot !== undefined) playerStatsFields.multiShot = stats.multiShot;
    if (stats.coins !== undefined) playerStatsFields.coins = stats.coins;

    const userKeys = Object.keys(userFields);
    const playerStatsKeys = Object.keys(playerStatsFields);

    if (userKeys.length === 0 && playerStatsKeys.length === 0) {
        return { success: true, message: 'No valid fields provided for update.' };
    }

    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                await new Promise((res, rej) => db.run("BEGIN TRANSACTION;", (err) => { if (err) rej(err); else res(); }));

                if (userKeys.length > 0) {
                    const setClause = userKeys.map(key => `${key} = ?`).join(', ');
                    const params = userKeys.map(key => userFields[key]);
                    params.push(userId);
                    const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
                    await new Promise((res, rej) => db.run(sql, params, (err) => { if (err) rej(err); else res(); }));
                }

                if (playerStatsKeys.length > 0) {
                    const setClause = playerStatsKeys.map(key => `${key} = ?`).join(', ');
                    const params = playerStatsKeys.map(key => playerStatsFields[key]);
                    params.push(userId);
                    const sql = `UPDATE player_stats SET ${setClause}, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?`;
                    await new Promise((res, rej) => db.run(sql, params, (err) => { if (err) rej(err); else res(); }));
                }

                await new Promise((res, rej) => db.run("COMMIT;", (err) => { if (err) rej(err); else res(); }));
                resolve({ success: true, userId: userId });

            } catch (error) {
                console.error('Database update failed, rolling back transaction.', error);
                await new Promise((res, rej) => db.run("ROLLBACK;", (err) => { if (err) rej(err); else res(); }));
                reject(error);
            }
        });
    });
}

module.exports = {
    initDb,
    createUserByAddress,
    findUserByAddress,
    getPlayerStats,
    savePlayerStats,
    updatePlayerStatsFromNFT,
    closeDb,
    addXpToUser,
    getUserByAddress,
    getWagerTier,
    processWagerMatchResult,
    getGameSetting,
    updateGameSetting,
    createWagerMatch,
    getWagerMatch,
    updateWagerMatch,
    savePlayerCheckpoint,
    getPlayerCheckpoint,
    getAllPlayers,
    updatePlayerStats
};