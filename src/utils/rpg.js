/**
 * Calculates the total experience points required to reach a given level.
 * This function mirrors the backend logic to ensure consistency.
 * @param {number} level The target level.
 * @param {number} [difficultyMultiplier=1.0] The game's current difficulty multiplier.
 * @returns {number} The total XP needed to reach that level.
 */
export function getExperienceForLevel(level, difficultyMultiplier = 1.0) {
    if (level <= 1) {
        return 0;
    }
    // Original Formula: (50/3) * (level^3 - 6*level^2 + 17*level - 12)
    const baseFormula = (50 / 3) * (Math.pow(level, 3) - 6 * Math.pow(level, 2) + 17 * level - 12);
    const xp = baseFormula * difficultyMultiplier;
    return Math.floor(xp);
}