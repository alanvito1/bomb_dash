const sqlite3 = require('sqlite3').verbose();
const DB_PATH = './ranking.sqlite'; // Arquivo do banco de dados será criado no diretório 'backend'

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
                db = null; // Garante que db seja nulo em caso de erro
                return reject(err);
            }
            console.log('Connected to the SQLite database.');

            // Criar a tabela users se não existir
            const createUserTableSQL = `
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    max_score INTEGER DEFAULT 0,
                    last_score_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `;
            db.run(createUserTableSQL, (err) => {
                if (err) {
                    console.error('Error creating users table', err.message);
                    db.close(); // Fecha o BD se a criação da tabela falhar
                    db = null;
                    return reject(err);
                }
                console.log("Users table initialized or already exists.");
                resolve(db);
            });
        });
    });
}

// Função para criar um novo usuário
async function createUser(username, passwordHash) {
    if (!db) await initDb(); // Garante que o BD esteja inicializado
    return new Promise((resolve, reject) => {
        const insertSQL = "INSERT INTO users (username, password_hash, max_score) VALUES (?, ?, 0);";
        db.run(insertSQL, [username, passwordHash], function(err) { // Usar function() para ter acesso a this.lastID
            if (err) {
                console.error(`Error creating user ${username}:`, err.message);
                if (err.message && err.message.toLowerCase().includes("unique constraint failed")) {
                    return reject(new Error("Username already exists."));
                }
                return reject(new Error("Failed to create user."));
            }
            console.log(`User ${username} created with ID ${this.lastID}.`);
            resolve({ success: true, userId: this.lastID });
        });
    });
}

// Função para encontrar um usuário pelo username
async function findUserByUsername(username) {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT id, username, password_hash, max_score FROM users WHERE username = ?;";
        db.get(querySQL, [username], (err, row) => {
            if (err) {
                console.error(`Error finding user ${username}:`, err.message);
                return reject(err);
            }
            resolve(row); // Retorna a linha do usuário ou undefined se não encontrado
        });
    });
}

// Função para atualizar a pontuação máxima de um usuário
async function updateUserScore(username, score) {
    if (!db) await initDb();
    return new Promise(async (resolve, reject) => { // Adicionado async aqui
        try {
            const user = await findUserByUsername(username);
            if (!user) {
                return reject(new Error("User not found."));
            }

            if (score > user.max_score) {
                const updateSQL = "UPDATE users SET max_score = ?, last_score_timestamp = CURRENT_TIMESTAMP WHERE username = ?;";
                db.run(updateSQL, [score, username], function(err) {
                    if (err) {
                        console.error(`Error updating max score for ${username}:`, err.message);
                        return reject(err);
                    }
                    if (this.changes > 0) {
                        console.log(`Max score updated for ${username} to ${score}.`);
                        resolve({ success: true, new_max_score: score });
                    } else {
                        // Isso não deveria acontecer se o usuário foi encontrado e a pontuação é maior
                        console.log(`No score update needed or user not found for ${username}.`);
                        resolve({ success: false, message: "Score not higher or user issue." });
                    }
                });
            } else {
                console.log(`New score ${score} is not higher than current max score ${user.max_score} for ${username}.`);
                resolve({ success: true, new_max_score: user.max_score, message: "Score not higher than current max." });
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Função para obter os 10 melhores jogadores
async function getTop10Players() {
    if (!db) await initDb();
    return new Promise((resolve, reject) => {
        const querySQL = "SELECT username, max_score FROM users ORDER BY max_score DESC LIMIT 10;";
        db.all(querySQL, [], (err, rows) => {
            if (err) {
                console.error("Error getting ranking:", err.message);
                return reject(err);
            }
            // Mapeia para o formato { username: 'name', score: value } como no cliente original
            resolve(rows.map(row => ({ username: row.username, score: row.max_score })));
        });
    });
}

// Exportar as funções e a instância do BD (opcionalmente, para fechar)
module.exports = {
    initDb,
    createUser,
    findUserByUsername,
    updateUserScore,
    getTop10Players,
    // Função para fechar a conexão com o BD (útil para graceful shutdown)
    closeDb: () => {
        if (db) {
            db.close((err) => {
                if (err) {
                    return console.error(err.message);
                }
                console.log('Closed the database connection.');
                db = null;
            });
        }
    }
};
