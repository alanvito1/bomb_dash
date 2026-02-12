const { expect } = require('chai');
const { getExperienceForLevel, getLevelFromExperience } = require('../rpg');

describe('RPG Logic', () => {
  describe('getExperienceForLevel', () => {
    it('should return 0 for level 1', () => {
      expect(getExperienceForLevel(1)).to.equal(0);
    });

    it('should calculate the correct XP for a specific level', () => {
      // Test against a known value from the formula
      expect(getExperienceForLevel(2)).to.equal(100); // (50/3) * (2^3 - 6*2^2 + 17*2 - 12) = 100
      expect(getExperienceForLevel(10)).to.equal(9300); // (50/3) * (10^3 - 6*10^2 + 17*10 - 12) = 9300
    });

    it('should handle the difficulty multiplier correctly', () => {
      expect(getExperienceForLevel(2, 1.5)).to.equal(150); // 100 * 1.5
      expect(getExperienceForLevel(10, 0.5)).to.equal(4650); // 9300 * 0.5
    });

    it('should floor the result to the nearest integer', () => {
      // Base XP for level 3 is 200. 200 * 1.01 = 202.
      expect(getExperienceForLevel(3, 1.01)).to.equal(202);
    });
  });

  describe('getLevelFromExperience', () => {
    it('should return level 1 for 0 or less XP', () => {
      expect(getLevelFromExperience(0)).to.equal(1);
      expect(getLevelFromExperience(-100)).to.equal(1);
    });

    it('should return the correct level for a given amount of XP', () => {
      // XP for level 2 is 100. XP for level 3 is 200.
      expect(getLevelFromExperience(99)).to.equal(1); // Just before level 2
      expect(getLevelFromExperience(100)).to.equal(2); // Exactly level 2
      expect(getLevelFromExperience(199)).to.equal(2); // Just before level 3
      expect(getLevelFromExperience(200)).to.equal(3); // Exactly level 3
    });

    it('should handle the difficulty multiplier correctly', () => {
      // With multiplier 1.5, XP for level 2 is 150.
      expect(getLevelFromExperience(149, 1.5)).to.equal(1);
      expect(getLevelFromExperience(150, 1.5)).to.equal(2);
    });

    it('should cap the level at 200 for very high XP', () => {
      const veryHighXp = 999999999;
      expect(getLevelFromExperience(veryHighXp)).to.equal(200);
    });
  });
});
