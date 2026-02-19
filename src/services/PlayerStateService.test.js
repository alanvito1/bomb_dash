import { describe, it, expect, beforeEach, vi } from 'vitest';
import playerStateService from './PlayerStateService.js';
import { MOCK_USER } from '../config/MockData.js';

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) {
      return store[key] || null;
    },
    setItem: function(key, value) {
      store[key] = value.toString();
    },
    removeItem: function(key) {
      delete store[key];
    },
    clear: function() {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('PlayerStateService', () => {
    beforeEach(() => {
        localStorage.clear();
        playerStateService.resetState();
    });

    it('should initialize with 6 heroes', () => {
        const heroes = playerStateService.getHeroes();
        expect(heroes).toHaveLength(6);
    });

    it('should initialize with 2 houses', () => {
        const houses = playerStateService.getHouses();
        expect(houses).toHaveLength(2);
    });

    it('should have correct initial user BCOIN', () => {
        const user = playerStateService.getUser();
        expect(user.bcoin).toBe(MOCK_USER.bcoin);
    });

    it('should upgrade a hero stat and deduct BCOIN', () => {
        const heroes = playerStateService.getHeroes();
        const heroId = heroes[0].id;
        const initialBcoin = playerStateService.getUser().bcoin;

        const result = playerStateService.upgradeHeroStat(heroId);

        expect(result.success).toBe(true);
        expect(playerStateService.getUser().bcoin).toBe(initialBcoin - 500);

        const updatedHero = playerStateService.getHeroes().find(h => h.id === heroId);
        expect(updatedHero.stats[result.statUpgraded]).toBeGreaterThan(0);
    });

    it('should reroll hero spells and deduct BCOIN', () => {
        const heroes = playerStateService.getHeroes();
        const heroId = heroes[0].id; // Common hero, initially 0 spells
        const initialBcoin = playerStateService.getUser().bcoin;

        const result = playerStateService.rerollHeroSpells(heroId);

        expect(result.success).toBe(true);
        expect(playerStateService.getUser().bcoin).toBe(initialBcoin - 1000);

        // Check spell count matches logic (Common: 0-1)
        expect(result.newSpells.length).toBeLessThanOrEqual(1);
    });

    it('should persist state to localStorage', () => {
        const heroes = playerStateService.getHeroes();
        playerStateService.upgradeHeroStat(heroes[0].id);

        const stored = localStorage.getItem('sandbox_state');
        expect(stored).not.toBeNull();

        const parsed = JSON.parse(stored);
        expect(parsed.user.bcoin).toBeLessThan(MOCK_USER.bcoin);
    });
});
