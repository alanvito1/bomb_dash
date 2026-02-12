const fs = require('fs').promises;
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'game_config.json');

/**
 * Reads the global game settings from the JSON file.
 * @returns {Promise<object>} The game settings object.
 */
async function getGameSettings() {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading game settings file:', error);
    // If the file doesn't exist or is corrupted, return default values
    return {
      levelUpCost: 1,
      monsterScaleFactor: 7,
      pvpWinXp: 50,
      monsterXp: { mob1: 10, mob2: 15, mob3: 20 },
      pvpCycleOpenHours: 24,
      pvpCycleClosedHours: 24,
    };
  }
}

/**
 * Writes the global game settings to the JSON file.
 * @param {object} settings - The new settings object to save.
 * @returns {Promise<void>}
 */
async function saveGameSettings(settings) {
  try {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing game settings file:', error);
    throw new Error('Failed to save game settings.');
  }
}

module.exports = {
  getGameSettings,
  saveGameSettings,
};
