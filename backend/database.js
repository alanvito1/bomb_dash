const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './ranking.sqlite'; // Consistent filename

let db = null;

// Função para inicializar o banco de dados
async function initDb() {
    return new Promise((resolve, reject) => {
        if (db) {
            console.log("Database already initialized.");
            return resolve(db);
        }

        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database', err.message);
                db = null;
                return reject(err);
            }
            console.log('Connected to the SQLite database.');

            // Modificar a tabela users para Web3: wallet_address como chave
            const createUserTableSQL = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    wallet_address TEXT UNIQUE NOT NULL,
                    max_score INTEGER DEFAULT 0,
                    last_score_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;
            db.run(createUserTableSQL, (err) => {
                if (err) {
                    console.error('Error creating users table', err.message);
                    db.close();
                    db = null;
                    return reject(err);
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
                        db.close();
                        db = null;
                        return reject(err);
                    }
                    console.log("Player_stats table initialized or already exists.");
                    resolve(db);
                });
            });
        });
    });
}

// Função para criar um novo usuário e suas estatísticas iniciais atomicamente
async function createUserByAddress(address) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;", (err) => {
                if (err) return reject(err);
            });

            const userInsertSQL = "INSERT INTO users (wallet_address, max_score) VALUES (?, 0);";
            db.run(userInsertSQL, [address], function(err) {
                if (err) {
                    console.error(`Error creating user for address ${address}:`, err.message);
                    return db.run("ROLLBACK;", () => reject(new Error("Failed to create user.")));
                }

                const userId = this.lastID;
                console.log(`User for address ${address} created with ID ${userId}.`);

                const statsInsertSQL = `
                    INSERT INTO player_stats (user_id, damage, speed, extraLives, fireRate, bombSize, multiShot, coins)
                    VALUES (?, 1, 200, 1, 600, 1.0, 0, 0);
                `;
                db.run(statsInsertSQL, [userId], function(err) {
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

// Função para encontrar um usuário pelo endereço da carteira
async function findUserByAddress(address) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT id, wallet_address, max_score FROM users WHERE wallet_address = ?;";
        db.get(querySQL, [address], (err, row) => {
            if (err) {
                console.error(`Error finding user with address ${address}:`, err.message);
                return reject(err);
            }
            resolve(row);
        });
    });
}

// Função para atualizar a pontuação máxima de um usuário (identificado pelo endereço)
async function updateUserScore(address, score) {
    if (!db) await initDb();
    return new Promise(async (resolve, reject) => {
        try {
            const user = await findUserByAddress(address);
            if (!user) {
                return reject(new Error("User not found."));
            }

            if (score > user.max_score) {
                const updateSQL = "UPDATE users SET max_score = ?, last_score_timestamp = CURRENT_TIMESTAMP WHERE wallet_address = ?;";
                db.run(updateSQL, [score, address], function(err) {
                    if (err) return reject(err);
                    resolve({ success: true, message: "New high score!", new_max_score: score });
                });
            } else {
                resolve({ success: true, message: "Score not higher than current max.", current_max_score: user.max_score });
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Função para obter os 10 melhores jogadores (retorna endereço em vez de username)
async function getTop10Players() {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT wallet_address, max_score FROM users ORDER BY max_score DESC LIMIT 10;";
        db.all(querySQL, [], (err, rows) => {
            if (err) return reject(err);
            resolve(rows.map(row => ({ address: row.wallet_address, score: row.max_score })));
        });
    });
}

// Função para buscar as estatísticas de um jogador
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

// Função para salvar/atualizar as estatísticas de um jogador
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
    updateUserScore,
    getTop10Players,
    getPlayerStats,
    savePlayerStats,
    closeDb
};