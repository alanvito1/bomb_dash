/**
 * Calculates the total experience points required to reach a given level.
 * The formula incorporates a difficulty multiplier to support the annual "Halving".
 * @param {number} level The target level.
 * @param {number} [difficultyMultiplier=1.0] The game's current difficulty multiplier.
 * @returns {number} The total XP needed to reach that level.
 */
function getExperienceForLevel(level, difficultyMultiplier = 1.0) {
  if (level <= 1) {
    return 0;
  }
  // Original Formula: (50/3) * (level^3 - 6*level^2 + 17*level - 12)
  const baseFormula =
    (50 / 3) * (Math.pow(level, 3) - 6 * Math.pow(level, 2) + 17 * level - 12);
  const xp = baseFormula * difficultyMultiplier;
  return Math.floor(xp);
}

/**
 * Calculates the hero's level based on their total experience points.
 * This is the inverse of `getExperienceForLevel`. It finds the level by checking
 * the XP requirements for each level sequentially.
 * @param {number} xp The total experience points of the hero.
 * @param {number} [difficultyMultiplier=1.0] The game's current difficulty multiplier.
 * @returns {number} The calculated level.
 */
function getLevelFromExperience(xp, difficultyMultiplier = 1.0) {
  if (xp <= 0) {
    return 1;
  }

  let level = 1;
  // We check against the XP required for the *next* level.
  // If the player's XP is less than the amount needed for level L+1, they are at level L.
  while (level <= 200) {
    const xpForNextLevel = getExperienceForLevel(
      level + 1,
      difficultyMultiplier
    );
    if (xp < xpForNextLevel) {
      return level;
    }
    level++;
    // As a safeguard against infinite loops in case of unexpected input.
    if (level > 200) {
      // Max level cap
      return 200;
    }
  }
}

module.exports = {
  getExperienceForLevel,
  getLevelFromExperience,
};
