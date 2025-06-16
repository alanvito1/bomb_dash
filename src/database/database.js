// src/database/database.js
import initSqlJs from 'sql.js'; // Assuming sql.js is installed or correctly linked

let db = null;
const DB_STORAGE_KEY = 'bomb_dash_sqlite_db';

async function initDB() {
  if (db) return true; // Already initialized

  try {
    const SQL = await initSqlJs({
      locateFile: file => file // Simplistic wasm locator. Adjust if wasm is in a subfolder e.g. `assets/${file}`
                               // This might need to be configured based on how files are served.
                               // For example: locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
                               // Or if local: locateFile: file => `./${file}` if sql-wasm.wasm is in the same dir as this bundle
                               // Or often: locateFile: file => `assets/sql-wasm.wasm`
    });

    // Try to load existing DB from localStorage
    const savedDb = localStorage.getItem(DB_STORAGE_KEY);
    if (savedDb) {
      const dbArray = Uint8Array.from(JSON.parse(savedDb));
      db = new SQL.Database(dbArray);
      console.log("Loaded database from localStorage.");
    } else {
      db = new SQL.Database();
      console.log("Created new empty database.");
    }

    // SQL command to create the users table (same as before)
    const createUserTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        pin TEXT NOT NULL,
        max_score INTEGER DEFAULT 0,
        last_score_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
    db.run(createUserTableSQL);
    saveDB(); // Save after table creation if new
    console.log("Users table initialized.");
    // Clean up the old simulated DB if it exists
    if (window.simulatedDB) {
        delete window.simulatedDB;
        console.log("Old simulatedDB removed from window object.");
    }
    return true;
  } catch (error) {
    console.error("Error initializing database with sql.js:", error);
    db = null; // Ensure db is null if init fails
    return false;
  }
}

function saveDB() {
  if (db) {
    try {
      const dbArray = db.export();
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(Array.from(dbArray)));
      console.log("Database saved to localStorage.");
    } catch (error) {
      console.error("Error saving database to localStorage:", error);
    }
  }
}

async function createUser(username, pin) {
  if (!db) {
    console.error("DB not initialized.");
    // Attempt to initialize DB, then retry if successful
    const initialized = await initDB();
    if (!initialized || !db) return { success: false, message: "Database not ready." };
  }
  if (!username || !pin || pin.length !== 4 || !/^\d+$/.test(pin) || /\s/.test(username)) {
    return { success: false, message: "Invalid username or PIN format." };
  }

  const insertSQL = "INSERT INTO users (username, pin, max_score) VALUES (?, ?, 0);";
  try {
    db.run(insertSQL, [username, pin]);
    saveDB();
    console.log(`User ${username} created.`);
    return { success: true };
  } catch (error) {
    console.error(`Error creating user ${username}:`, error);
    if (error.message && error.message.toLowerCase().includes("unique constraint failed")) {
        return { success: false, message: "Username already exists." };
    }
    return { success: false, message: "Failed to create user." };
  }
}

async function verifyUser(username, pin) {
  if (!db) {
     const initialized = await initDB();
     if (!initialized || !db) return null;
  }
  const querySQL = "SELECT username, pin, max_score FROM users WHERE username = ?;";
  const stmt = db.prepare(querySQL);
  stmt.bind([username]);
  let user = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    if (row.pin === pin) {
      user = { username: row.username, max_score: row.max_score };
    }
  }
  stmt.free();
  if(user) console.log(`User ${username} verified.`);
  else console.log(`Verification failed for user ${username}.`);
  return user;
}

// IMPORTANT: Fix for LoadingScene's auto-login validation ambiguity
async function getUser(username) {
  if (!db) {
    const initialized = await initDB();
    if (!initialized || !db) return null;
  }
  const querySQL = "SELECT username, max_score FROM users WHERE username = ?;";
  const stmt = db.prepare(querySQL);
  stmt.bind([username]);
  let user = null;
  if (stmt.step()) {
    user = stmt.getAsObject(); // { username: 'name', max_score: 123 }
  }
  stmt.free();
  return user;
}


async function getUserMaxScore(username) {
  if (!db) {
    const initialized = await initDB();
    if (!initialized || !db) return 0;
  }
  const user = await getUser(username);
  return user ? user.max_score : 0;
}


async function updateUserMaxScore(username, newScore) {
  if (!db) {
    const initialized = await initDB();
    if (!initialized || !db) return false;
  }
  const user = await getUser(username);
  if (user && newScore > user.max_score) {
    const updateSQL = "UPDATE users SET max_score = ?, last_score_timestamp = CURRENT_TIMESTAMP WHERE username = ?;";
    try {
      db.run(updateSQL, [newScore, username]);
      saveDB();
      console.log(`Max score updated for ${username} to ${newScore}.`);
      return true;
    } catch (error) {
      console.error(`Error updating max score for ${username}:`, error);
      return false;
    }
  }
  return false;
}

async function getRankingTop10() {
  if (!db) {
    const initialized = await initDB();
    if (!initialized || !db) return [];
  }
  const querySQL = "SELECT username, max_score FROM users ORDER BY max_score DESC LIMIT 10;";
  try {
    const results = db.exec(querySQL);
    if (results.length > 0 && results[0].values) {
      return results[0].values.map(row => ({ username: row[0], score: row[1] }));
    }
    return [];
  } catch (error) {
    console.error("Error getting ranking:", error);
    return [];
  }
}

export {
  initDB,
  createUser,
  verifyUser,
  getUser, // Export new getUser function
  getUserMaxScore,
  updateUserMaxScore,
  getRankingTop10,
  // For testing/debug:
  // clearDB: () => { localStorage.removeItem(DB_STORAGE_KEY); db = null; console.log("DB cleared from localStorage."); }
};
