/**
 * Calculates the total experience points required to reach a given level.
 * This function is a frontend mirror of the backend logic in `backend/rpg.js`.
 * @param {number} level The target level.
 * @returns {number} The total XP needed to have reached that level.
 */
export function getExperienceForLevel(level) {
    if (level <= 1) {
        return 0;
    }
    // Formula: (50/3) * (level^3 - 6*level^2 + 17*level - 12)
    // This is the same formula used in the backend's rpg.js.
    // We do not include the difficultyMultiplier on the client-side display logic
    // as the raw XP values from the server already have it baked in.
    const baseFormula = (50 / 3) * (Math.pow(level, 3) - 6 * Math.pow(level, 2) + 17 * level - 12);
    return Math.floor(baseFormula);
}