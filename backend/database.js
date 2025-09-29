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
                        coins INTEGER DEFAULT 0,
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
                    resolve(db);
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

function closeDb() {
    if (db) {
        db.close((err) => {
            if (err) return console.error(err.message);
            console.log('Closed the database connection.');
            db = null;
        });
    }
}

module.exports = {
    initDb,
    createUserByAddress,
    findUserByAddress,
    getPlayerStats,
    savePlayerStats,
    updatePlayerStatsFromNFT,
    closeDb,
};