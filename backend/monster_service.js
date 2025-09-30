/**
 * @file Manages monster-related logic, including difficulty scaling.
 */

/**
 * Calculates the scaled attributes of a monster based on the player's level.
 * The formula applies a 7% increase to base attributes for each player level.
 *
 * @param {object} monsterBaseStats - An object containing the monster's base attributes (e.g., { hp: 100, damage: 10 }).
 * @param {number} playerLevel - The current level of the player.
 * @returns {object} An object containing the scaled monster attributes.
 */
function getMonsterStats(monsterBaseStats, playerLevel) {
    if (!monsterBaseStats || typeof playerLevel !== 'number' || playerLevel < 1) {
        throw new Error("Invalid input for getMonsterStats. Provide base stats and a valid player level.");
    }

    // The scaling factor: 1 + (PlayerLevel * 0.07)
    const scalingFactor = 1 + (playerLevel * 0.07);

    const scaledStats = {};

    for (const stat in monsterBaseStats) {
        if (Object.hasOwnProperty.call(monsterBaseStats, stat) && typeof monsterBaseStats[stat] === 'number') {
            // Apply the scaling factor and round to the nearest integer
            scaledStats[stat] = Math.round(monsterBaseStats[stat] * scalingFactor);
        } else {
            // Copy non-numeric stats as they are
            scaledStats[stat] = monsterBaseStats[stat];
        }
    }

    return scaledStats;
}

module.exports = {
    getMonsterStats,
};