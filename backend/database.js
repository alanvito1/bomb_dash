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
                    account_level INTEGER DEFAULT 1,
                    account_xp INTEGER DEFAULT 0,
                    coins INTEGER DEFAULT 1000,
                    last_score_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;
            db.run(createUserTableSQL, (err) => {
                if (err) {
                    console.error('Error creating users table', err.message);
                    db.close(); db = null; return reject(err);
                }
                console.log("Users table (Web3) initialized or already exists.");

                // Migration: Add account_level and account_xp if they don't exist
                db.all("PRAGMA table_info(users)", (err, columns) => {
                    if (err) {
                        console.error('Error getting users table info during migration', err.message);
                        // We don't reject here, as the table might be new and this could fail spuriously.
                        // The ALTER might fail later, which is fine.
                    } else {
                        const hasAccountLevel = columns.some(col => col.name === 'account_level');
                        const hasAccountXp = columns.some(col => col.name === 'account_xp');

                        if (!hasAccountLevel) {
                            db.run("ALTER TABLE users ADD COLUMN account_level INTEGER DEFAULT 1", (alterErr) => {
                                if (alterErr) {
                                    console.error('Migration Error: Failed to add account_level column.', alterErr.message);
                                } else {
                                    console.log("Migration Success: Added account_level column to users table.");
                                }
                            });
                        }

                        if (!hasAccountXp) {
                            db.run("ALTER TABLE users ADD COLUMN account_xp INTEGER DEFAULT 0", (alterErr) => {
                                if (alterErr) {
                                    console.error('Migration Error: Failed to add account_xp column.', alterErr.message);
                                } else {
                                    console.log("Migration Success: Added account_xp column to users table.");
                                }
                            });
                        }
                    }
                });

                const createHeroesTableSQL = `
                    CREATE TABLE IF NOT EXISTS heroes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        hero_type TEXT NOT NULL CHECK(hero_type IN ('mock', 'nft')),
                        nft_id INTEGER,
                        level INTEGER DEFAULT 1,
                        xp INTEGER DEFAULT 0,
                        hp INTEGER DEFAULT 100,
                        maxHp INTEGER DEFAULT 100,
                        damage INTEGER DEFAULT 1,
                        speed INTEGER DEFAULT 200,
                        extraLives INTEGER DEFAULT 1,
                        fireRate INTEGER DEFAULT 600,
                        bombSize REAL DEFAULT 1.0,
                        multiShot INTEGER DEFAULT 0,
                        sprite_name TEXT,
                        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        UNIQUE(user_id, nft_id)
                    );
                `;
                db.run(createHeroesTableSQL, (err) => {
                    if (err) {
                        console.error('Error creating heroes table', err.message);
                        db.close(); db = null; return reject(err);
                    }
                    console.log("Heroes table initialized or already exists.");

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

                            const createMatchmakingQueueTableSQL = `
                                CREATE TABLE IF NOT EXISTS matchmaking_queue (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    user_id INTEGER NOT NULL UNIQUE,
                                    hero_id INTEGER NOT NULL,
                                    entry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    status TEXT NOT NULL DEFAULT 'searching',
                                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                                    FOREIGN KEY (hero_id) REFERENCES heroes(id) ON DELETE CASCADE
                                );
                            `;
                            db.run(createMatchmakingQueueTableSQL, (err) => {
                                if (err) {
                                    console.error('Error creating matchmaking_queue table', err.message);
                                    db.close(); db = null; return reject(err);
                                }
                                console.log("Matchmaking_queue table initialized or already exists.");

                                const createAltarTableSQL = `
                                    CREATE TABLE IF NOT EXISTS altar_status (
                                        id INTEGER PRIMARY KEY CHECK (id = 1),
                                        current_donations INTEGER DEFAULT 0,
                                        donation_goal INTEGER DEFAULT 10000,
                                        active_buff_type TEXT,
                                        buff_expires_at DATETIME
                                    );
                                `;
                                db.run(createAltarTableSQL, (err) => {
                                    if (err) {
                                        console.error('Error creating altar_status table', err.message);
                                        db.close(); db = null; return reject(err);
                                    }
                                    console.log("Altar_status table initialized or already exists.");

                                    db.run("INSERT OR IGNORE INTO altar_status (id) VALUES (1)", (err) => {
                                        if (err) {
                                            console.error('Error seeding altar_status table', err.message);
                                            db.close(); db = null; return reject(err);
                                        }
                                        console.log("Altar_status table seeded.");
                                        resolve(db);
                                    });
                                });
                            });
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
async function createUserByAddress(address, initialCoins = 1000) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const userInsertSQL = "INSERT INTO users (wallet_address, coins) VALUES (?, ?);";
        db.run(userInsertSQL, [address, initialCoins], function (err) {
            if (err) {
                console.error(`Error creating user for address ${address}:`, err.message);
                reject(new Error("Failed to create user."));
            } else {
                const userId = this.lastID;
                console.log(`User for address ${address} created with ID ${userId}.`);
                resolve({ success: true, userId: userId });
            }
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


const { getExperienceForLevel } = require('./rpg');

// Internal function that performs the core logic without managing transactions.
// It expects db helper functions (`get`, `run`) to be passed in.
async function _addXpToUser_noTX(address, xpAmount, db_helpers) {
    const { get, run } = db_helpers;

    const user = await get("SELECT id, account_level, account_xp FROM users WHERE wallet_address = ?;", [address]);
    if (!user) throw new Error(`User not found with address ${address} during XP addition.`);

    const newXp = user.account_xp + xpAmount;
    let newLevel = user.account_level;

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

    await run("UPDATE users SET account_xp = ?, account_level = ? WHERE id = ?;", [newXp, newLevel, user.id]);
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
            SELECT id, wallet_address, account_level, account_xp, coins
            FROM users
            WHERE wallet_address = ?;
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
        await run("UPDATE users SET coins = ? WHERE id = ?", [winnerNewCoins, winner.id]);
        // Use the internal function to add XP without creating a new transaction
        const { newXp: winnerNewXp } = await _addXpToUser_noTX(winnerAddress, finalXpReward, { get, run });

        // 2. Update Loser's stats
        const loserNewCoins = loser.coins - tier.bcoin_cost;
        const loserNewXp = Math.max(0, loser.account_xp - tier.xp_cost);
        await run("UPDATE users SET coins = ? WHERE id = ?", [loserNewCoins, loser.id]);
        await run("UPDATE users SET account_xp = ? WHERE id = ?", [loserNewXp, loser.id]);

        // 3. Check for de-level on the loser
        let loserNewLevel = loser.account_level;
        // Keep checking in case of multiple de-levels from a huge XP loss
        while (true) {
            const xpForCurrentLevel = getExperienceForLevel(loserNewLevel, multiplier);
            if (loserNewXp < xpForCurrentLevel && loserNewLevel > 1) {
                loserNewLevel--;
            } else {
                break;
            }
        }

        if (loserNewLevel !== loser.account_level) {
            await run("UPDATE users SET account_level = ? WHERE id = ?", [loserNewLevel, loser.id]);
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

async function getAllPlayers() {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = `
            SELECT id, wallet_address, account_level, account_xp, coins
            FROM users
            ORDER BY id;
        `;
        db.all(querySQL, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

async function updatePlayerStats(userId, stats) {
    if (!db) await initDb();

    // Mapeia quais campos pertencem a qual tabela
    const userFields = ['account_level', 'account_xp', 'coins'];

    const userUpdates = {};

    // Separa os campos do objeto 'stats' para suas respectivas tabelas
    for (const key in stats) {
        if (userFields.includes(key)) {
            userUpdates[key] = stats[key];
        }
    }

    const userKeys = Object.keys(userUpdates);

    // Se nenhum campo válido foi fornecido, não faz nada
    if (userKeys.length === 0) {
        return { success: true, message: 'No valid fields provided for update.' };
    }

    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
                await new Promise((res, rej) => db.run("BEGIN TRANSACTION;", err => err ? rej(err) : res()));

                // Atualiza a tabela 'users' se houver campos para ela
                if (userKeys.length > 0) {
                    const setClause = userKeys.map(key => `${key} = ?`).join(', ');
                    const params = userKeys.map(key => userUpdates[key]);
                    params.push(userId);
                    const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
                    await new Promise((res, rej) => db.run(sql, params, err => err ? rej(err) : res()));
                }

                await new Promise((res, rej) => db.run("COMMIT;", err => err ? rej(err) : res()));
                resolve({ success: true, userId: userId });

            } catch (error) {
                console.error('Database update failed, rolling back transaction.', error);
                await new Promise((res, rej) => db.run("ROLLBACK;", err => err ? rej(err) : res()));
                reject(error);
            }
        });
    });
}

async function createHeroForUser(userId, heroData) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const {
            hero_type, nft_id = null, level = 1, xp = 0, hp = 100, maxHp = 100,
            damage = 1, speed = 200, extraLives = 1, fireRate = 600,
            bombSize = 1.0, multiShot = 0, sprite_name = null
        } = heroData;

        const sql = `INSERT INTO heroes (user_id, hero_type, nft_id, level, xp, hp, maxHp, damage, speed, extraLives, fireRate, bombSize, multiShot, sprite_name)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

        db.run(sql, [
            userId, hero_type, nft_id, level, xp, hp, maxHp, damage, speed,
            extraLives, fireRate, bombSize, multiShot, sprite_name
        ], function(err) {
            if (err) {
                console.error(`Error creating hero for user ${userId}:`, err.message);
                return reject(err);
            }
            resolve({ success: true, heroId: this.lastID });
        });
    });
}

async function getHeroesByUserId(userId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        // Select all columns, as the schema is now consistent with frontend expectations
        const sql = `
            SELECT
                id,
                user_id,
                hero_type,
                nft_id,
                level,
                xp,
                hp,
                maxHp,
                damage,
                speed,
                extraLives,
                fireRate,
                bombSize,
                multiShot,
                sprite_name,
                last_updated
            FROM heroes
            WHERE user_id = ?;
        `;
        db.all(sql, [userId], (err, rows) => {
            if (err) {
                console.error(`Error fetching heroes with aliased sprite_name for user ${userId}:`, err.message);
                return reject(err);
            }
            // Add a name property to mock heroes for display consistency
            const heroes = rows.map(hero => {
                if (hero.hero_type === 'mock' && !hero.name) {
                    // Capitalize the first letter of the sprite_name for a cleaner display name
                    hero.name = hero.sprite_name.charAt(0).toUpperCase() + hero.sprite_name.slice(1);
                }
                return hero;
            });
            resolve(heroes);
        });
    });
}

async function updateHeroStats(heroId, stats) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const fields = Object.keys(stats);
        const values = Object.values(stats);

        if (fields.length === 0) {
            return resolve({ success: true, message: "No fields to update." });
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const sql = `UPDATE heroes SET ${setClause}, last_updated = CURRENT_TIMESTAMP WHERE id = ?;`;

        db.run(sql, [...values, heroId], function(err) {
            if (err) {
                console.error(`Error updating hero ${heroId}:`, err.message);
                return reject(err);
            }
            resolve({ success: true, changes: this.changes });
        });
    });
}


async function addToMatchmakingQueue(userId, heroId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        // Using INSERT OR IGNORE to prevent errors on duplicate user_id,
        // which is UNIQUE. We'll then update to ensure the hero_id and time are fresh.
        const sql = `
            INSERT INTO matchmaking_queue (user_id, hero_id, entry_time, status)
            VALUES (?, ?, CURRENT_TIMESTAMP, 'searching')
            ON CONFLICT(user_id) DO UPDATE SET
                hero_id = excluded.hero_id,
                entry_time = excluded.entry_time,
                status = excluded.status;
        `;
        db.run(sql, [userId, heroId], function(err) {
            if (err) {
                console.error(`Error adding/updating user ${userId} in queue:`, err.message);
                return reject(err);
            }
            // Since we use INSERT OR REPLACE, we need to get the ID of the inserted/updated row
            db.get("SELECT id FROM matchmaking_queue WHERE user_id = ?", [userId], (err, row) => {
                if (err) return reject(err);
                resolve({ success: true, id: row ? row.id : null });
            });
        });
    });
}

async function removeFromMatchmakingQueue(userId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const sql = "DELETE FROM matchmaking_queue WHERE user_id = ?";
        db.run(sql, [userId], function(err) {
            if (err) {
                console.error(`Error removing user ${userId} from queue:`, err.message);
                return reject(err);
            }
            resolve({ success: true, changes: this.changes });
        });
    });
}

async function getMatchmakingQueueUser(userId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM matchmaking_queue WHERE user_id = ?";
        db.get(sql, [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function getAltarStatus() {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM altar_status WHERE id = 1;";
        db.get(sql, [], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

async function updateAltarStatus(statusData) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const fields = Object.keys(statusData);
        const values = Object.values(statusData);

        if (fields.length === 0) {
            return resolve({ success: true, message: "No fields to update." });
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const sql = `UPDATE altar_status SET ${setClause} WHERE id = 1;`;

        db.run(sql, values, function(err) {
            if (err) {
                console.error(`Error updating altar_status:`, err.message);
                return reject(err);
            }
            resolve({ success: true, changes: this.changes });
        });
    });
}

async function addDonationToAltar(amount) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const sql = "UPDATE altar_status SET current_donations = current_donations + ? WHERE id = 1;";
        db.run(sql, [amount], function(err) {
            if (err) {
                console.error(`Error adding donation to altar:`, err.message);
                return reject(err);
            }
            resolve({ success: true, changes: this.changes });
        });
    });
}

module.exports = {
    initDb,
    createUserByAddress,
    findUserByAddress,
    closeDb,
    addXpToUser,
    getUserByAddress,
    getWagerTier,
    processWagerMatchResult,
    createWagerMatch,
    getWagerMatch,
    updateWagerMatch,
    savePlayerCheckpoint,
    getPlayerCheckpoint,
    // Funções adicionadas/corrigidas
    getGameSetting,
    updateGameSetting,
    getAllPlayers,
    updatePlayerStats,
    getTop10Ranking,
    // Funções de Herói
    createHeroForUser,
    getHeroesByUserId,
    updateHeroStats,
    // Matchmaking
    addToMatchmakingQueue,
    removeFromMatchmakingQueue,
    getMatchmakingQueueUser,
    // Altar of Buffs
    getAltarStatus,
    updateAltarStatus,
    addDonationToAltar
};

async function getTop10Ranking() {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = `
            SELECT wallet_address as username, max_score as score
            FROM users
            ORDER BY max_score DESC
            LIMIT 10;
        `;
        db.all(querySQL, [], (err, rows) => {
            if (err) {
                console.error("Error fetching top 10 ranking:", err);
                return reject(err);
            }
            resolve(rows);
        });
    });
}