const sqlite3 = require('sqlite3').verbose();
const DB_PATH = process.env.DB_PATH || './ranking.sqlite'; // Allow override for testing

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
                    level INTEGER DEFAULT 1,
                    xp INTEGER DEFAULT 0,
                    hp INTEGER DEFAULT 100,
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

                    // Chain creation of tournament tables
                    const createTournamentsTableSQL = `
                        CREATE TABLE IF NOT EXISTS tournaments (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            onchain_tournament_id INTEGER UNIQUE NOT NULL,
                            capacity INTEGER NOT NULL,
                            entry_fee TEXT NOT NULL,
                            status TEXT NOT NULL DEFAULT 'waiting_players', -- waiting_players, in_progress, completed, cancelled
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );
                    `;
                    db.run(createTournamentsTableSQL, (err) => {
                        if (err) return reject(err);
                        console.log("Tournaments table initialized.");

                        const createTournamentParticipantsTableSQL = `
                            CREATE TABLE IF NOT EXISTS tournament_participants (
                                tournament_id INTEGER NOT NULL,
                                user_id INTEGER NOT NULL,
                                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                PRIMARY KEY (tournament_id, user_id),
                                FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                            );
                        `;
                        db.run(createTournamentParticipantsTableSQL, (err) => {
                            if (err) return reject(err);
                            console.log("Tournament_participants table initialized.");

                            const createTournamentMatchesTableSQL = `
                                CREATE TABLE IF NOT EXISTS tournament_matches (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    tournament_id INTEGER NOT NULL,
                                    round INTEGER NOT NULL,
                                    match_in_round INTEGER NOT NULL,
                                    player1_id INTEGER,
                                    player2_id INTEGER,
                                    winner_id INTEGER,
                                    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
                                    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
                                    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE SET NULL,
                                    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL,
                                    FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
                                );
                            `;
                            db.run(createTournamentMatchesTableSQL, (err) => {
                                if (err) {
                                    console.error('Error creating tournament_matches table', err.message);
                                    db.close();
                                    db = null;
                                    return reject(err);
                                }
                                console.log("Tournament_matches table initialized.");

                                // Create indexes for optimization
                                db.run("CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);");
                                db.run("CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id_round ON tournament_matches(tournament_id, round);");

                                console.log("Database indexes created or already exist.");
                                resolve(db); // Resolve the main promise here
                            });
                        });
                    });
                });
            });
        });
    });
}

// Função para encontrar um usuário pelo ID
async function findUserById(userId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT * FROM users WHERE id = ?;";
        db.get(querySQL, [userId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
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
        const querySQL = "SELECT id, wallet_address, max_score, level, xp, hp FROM users WHERE wallet_address = ?;";
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

// Função para adicionar XP a um usuário
async function addXpToUser(address, xpAmount) {
    if (!db) await initDb();
    return new Promise(async (resolve, reject) => {
        try {
            const user = await findUserByAddress(address);
            if (!user) {
                return reject(new Error("User not found."));
            }

            const updateSQL = "UPDATE users SET xp = xp + ? WHERE wallet_address = ?;";
            db.run(updateSQL, [xpAmount, address], function(err) {
                if (err) return reject(err);
                resolve({ success: true, message: `Awarded ${xpAmount} XP.` });
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Função para subir o nível de um usuário, resetar seu HP e aumentar seu dano
async function levelUpUserAndStats(userId, newLevel, newHp) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;", (err) => {
                if (err) return reject(err);
            });

            const updateUserSQL = "UPDATE users SET level = ?, hp = ? WHERE id = ?;";
            db.run(updateUserSQL, [newLevel, newHp, userId], function(err) {
                if (err) {
                    return db.run("ROLLBACK;", () => reject(err));
                }
                if (this.changes === 0) {
                    return db.run("ROLLBACK;", () => reject(new Error("User not found or no changes made in users table.")));
                }

                const updateStatsSQL = "UPDATE player_stats SET damage = damage + 1 WHERE user_id = ?;";
                db.run(updateStatsSQL, [userId], function(err) {
                    if (err) {
                        return db.run("ROLLBACK;", () => reject(err));
                    }
                    if (this.changes === 0) {
                        return db.run("ROLLBACK;", () => reject(new Error("Stats not found for user or no changes made.")));
                    }

                    db.run("COMMIT;", (err) => {
                        if (err) {
                            return db.run("ROLLBACK;", () => reject(err));
                        }
                        resolve({ success: true, message: `User leveled up to ${newLevel}!` });
                    });
                });
            });
        });
    });
}

// --- Tournament Functions ---

// Função para encontrar um torneio aberto que corresponda aos critérios
async function findOpenTournament(capacity, entryFee) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT * FROM tournaments WHERE capacity = ? AND entry_fee = ? AND status = 'waiting_players' LIMIT 1;";
        db.get(querySQL, [capacity, entryFee], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

// Função para criar um novo torneio
async function createTournament(onchainTournamentId, capacity, entryFee) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const insertSQL = "INSERT INTO tournaments (onchain_tournament_id, capacity, entry_fee) VALUES (?, ?, ?);";
        db.run(insertSQL, [onchainTournamentId, capacity, entryFee], function(err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, onchain_tournament_id: onchainTournamentId });
        });
    });
}

// Função para adicionar um participante a um torneio
async function addParticipantToTournament(tournamentId, userId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const insertSQL = "INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?);";
        db.run(insertSQL, [tournamentId, userId], function(err) {
            if (err) return reject(err);
            resolve({ success: true, changes: this.changes });
        });
    });
}

// Função para obter todos os participantes de um torneio
async function getTournamentParticipants(tournamentId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT user_id FROM tournament_participants WHERE tournament_id = ?;";
        db.all(querySQL, [tournamentId], (err, rows) => {
            if (err) return reject(err);
            resolve(rows.map(row => row.user_id));
        });
    });
}

// Função para criar as partidas de um torneio em lote
async function createTournamentMatches(matches) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const insertSQL = "INSERT INTO tournament_matches (tournament_id, round, match_in_round, player1_id, player2_id, status) VALUES (?, ?, ?, ?, ?, ?);";
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");
            const stmt = db.prepare(insertSQL);
            matches.forEach(match => {
                stmt.run(match.tournament_id, match.round, match.match_in_round, match.player1_id, match.player2_id, match.status);
            });
            stmt.finalize((err) => {
                if (err) return db.run("ROLLBACK;", () => reject(err));
                db.run("COMMIT;", (err) => {
                    if (err) return db.run("ROLLBACK;", () => reject(err));
                    resolve({ success: true });
                });
            });
        });
    });
}

// Função para atualizar o status de um torneio
async function updateTournamentStatus(tournamentId, status) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const updateSQL = "UPDATE tournaments SET status = ? WHERE id = ?;";
        db.run(updateSQL, [status, tournamentId], function(err) {
            if (err) return reject(err);
            resolve({ success: true, changes: this.changes });
        });
    });
}

// Função para reportar o vencedor de uma partida
async function reportMatchWinner(matchId, winnerId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const updateSQL = "UPDATE tournament_matches SET winner_id = ?, status = 'completed' WHERE id = ?;";
        db.run(updateSQL, [winnerId, matchId], function(err) {
            if (err) return reject(err);
            resolve({ success: true, changes: this.changes });
        });
    });
}

// Função para obter todas as partidas de um round específico
async function getMatchesByRound(tournamentId, round) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT * FROM tournament_matches WHERE tournament_id = ? AND round = ?;";
        db.all(querySQL, [tournamentId, round], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

// Função para obter uma partida pelo ID
async function getMatchById(matchId) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT * FROM tournament_matches WHERE id = ?;";
        db.get(querySQL, [matchId], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

module.exports = {
    initDb,
    createUserByAddress,
    findUserByAddress,
    updateUserScore,
    getTop10Players,
    getPlayerStats,
    savePlayerStats,
    addXpToUser,
    levelUpUserAndStats,
    closeDb,
    // Tournament Functions
    findOpenTournament,
    createTournament,
    addParticipantToTournament,
    getTournamentParticipants,
    createTournamentMatches,
    updateTournamentStatus,
    reportMatchWinner,
    getMatchesByRound,
    getMatchById,
    findUserById,
};