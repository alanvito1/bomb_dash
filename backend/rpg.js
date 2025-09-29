/**
 * Calculates the total experience points required to reach a given level,
 * based on the classic Tibia formula.
 * @param {number} level The target level.
 * @returns {number} The total XP needed to reach that level.
 */
function getExperienceForLevel(level) {
    if (level <= 1) {
        return 0;
    }
    // Formula: (50/3) * (level^3 - 6*level^2 + 17*level - 12)
    const xp = (50 / 3) * (Math.pow(level, 3) - 6 * Math.pow(level, 2) + 17 * level - 12);
    return Math.floor(xp);
}

module.exports = {
    getExperienceForLevel,
};