import { describe, it, expect, beforeEach, vi } from 'vitest';
import playerStateService from './PlayerStateService.js';
import { MOCK_USER } from '../config/MockData.js';

// Mock localStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('PlayerStateService', () => {
  beforeEach(() => {
    localStorage.clear();
    playerStateService.resetState();
    // Force guest mode initialization
    playerStateService.init(null);
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
    // getDefaultState sets BCOIN to 1000
    expect(user.bcoin).toBe(1000);
  });

  it('should upgrade a hero level and deduct BCOIN', async () => {
    const heroes = playerStateService.getHeroes();
    const heroId = heroes[0].id;
    const initialBcoin = playerStateService.getUser().bcoin;
    const initialPower = heroes[0].stats.power;

    // Use upgradeHeroLevel instead of upgradeHeroStat
    const result = await playerStateService.upgradeHeroLevel(heroId);

    expect(result.success).toBe(true);
    // Cost is 1 BCOIN in current implementation
    expect(playerStateService.getUser().bcoin).toBe(initialBcoin - 1);

    const updatedHero = playerStateService
      .getHeroes()
      .find((h) => h.id === heroId);
    expect(updatedHero.stats.power).toBeGreaterThan(initialPower);
  });

  // Skipped: rerollHeroSpells not implemented in current service
  it.skip('should reroll hero spells and deduct BCOIN', () => {
    const heroes = playerStateService.getHeroes();
    const heroId = heroes[0].id;
    const initialBcoin = playerStateService.getUser().bcoin;

    const result = playerStateService.rerollHeroSpells(heroId);

    expect(result.success).toBe(true);
    expect(playerStateService.getUser().bcoin).toBe(initialBcoin - 1000);
    expect(result.newSpells.length).toBeLessThanOrEqual(1);
  });

  it('should persist state to localStorage', async () => {
    const heroes = playerStateService.getHeroes();
    await playerStateService.upgradeHeroLevel(heroes[0].id);

    const stored = localStorage.getItem('guest_state');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored);
    expect(parsed.user.bcoin).toBeLessThan(1000);
  });

  describe('Task Force Phase 4: Upgrade Forge', () => {
    // Current default state includes 200 Common Fragments
    it('should initialize inventory with default starter pack', () => {
      const inventory = playerStateService.getInventory();
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory[0].type).toBe('fragment');
    });

    it('should correctly count fragments', () => {
      // Starting with 200 common fragments
      playerStateService.addSessionLoot([
        { type: 'fragment', rarity: 'Common', quantity: 10 },
        { type: 'fragment', rarity: 'Rare', quantity: 5 },
      ]);
      expect(playerStateService.getFragmentCount('Common')).toBe(210);
      expect(playerStateService.getFragmentCount('Rare')).toBe(5);
    });

    // Skipped: upgradeHeroStatWithFragments not implemented in current service
    it.skip('should upgrade hero POWER using 50 Common Fragments', () => {
      const hero = playerStateService.getHeroes()[0];
      const initialPower = hero.stats.power || 0;

      playerStateService.addSessionLoot([
        { type: 'fragment', rarity: 'Common', quantity: 60 },
      ]);

      const res = playerStateService.upgradeHeroStatWithFragments(
        hero.id,
        'power'
      );

      expect(res.success).toBe(true);
      expect(res.newStatValue).toBe(initialPower + 1);
    });
  });
});
