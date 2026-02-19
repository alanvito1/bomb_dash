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

    describe('Task Force Phase 4: Upgrade Forge', () => {
        it('should initialize inventory empty if new user', () => {
            const inventory = playerStateService.getInventory();
            expect(inventory).toEqual([]);
        });

        it('should correctly count fragments', () => {
             playerStateService.addSessionLoot([
                { type: 'fragment', rarity: 'Common', quantity: 10 },
                { type: 'fragment', rarity: 'Rare', quantity: 5 }
            ]);
            expect(playerStateService.getFragmentCount('Common')).toBe(10);
            expect(playerStateService.getFragmentCount('Rare')).toBe(5);
        });

        it('should upgrade hero POWER using 50 Common Fragments', () => {
            const hero = playerStateService.getHeroes()[0];
            const initialPower = hero.stats.power || 0;

            playerStateService.addSessionLoot([
                { type: 'fragment', rarity: 'Common', quantity: 60 }
            ]);

            const res = playerStateService.upgradeHeroStatWithFragments(hero.id, 'power');

            expect(res.success).toBe(true);
            expect(res.newStatValue).toBe(initialPower + 1);
            expect(playerStateService.getFragmentCount('Common')).toBe(10);
        });

        it('should fail upgrade if insufficient fragments', () => {
            const hero = playerStateService.getHeroes()[0];

            playerStateService.addSessionLoot([
                { type: 'fragment', rarity: 'Common', quantity: 40 }
            ]);

            const res = playerStateService.upgradeHeroStatWithFragments(hero.id, 'power');

            expect(res.success).toBe(false);
            expect(res.message).toBe('Insufficient Fragments');
        });

        it('should upgrade hero SPEED using 50 Common Fragments', () => {
            const hero = playerStateService.getHeroes()[0];
            const initialSpeed = hero.stats.speed || 0;

            playerStateService.addSessionLoot([
                { type: 'fragment', rarity: 'Common', quantity: 50 }
            ]);

            const res = playerStateService.upgradeHeroStatWithFragments(hero.id, 'speed');

            expect(res.success).toBe(true);
            expect(res.newStatValue).toBe(initialSpeed + 1);
            expect(res.remainingFragments).toBe(0);
        });
    });
});
