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
    expect(user.bcoin).toBe(0);
  });

  it('should upgrade a hero level and deduct BCOIN', async () => {
    // Need BCOIN first
    await playerStateService.claimDailyFaucet(); // +5 BCOIN

    const heroes = playerStateService.getHeroes();
    const heroId = heroes[0].id;
    const initialBcoin = playerStateService.getUser().bcoin; // Should be 5
    const initialPower = heroes[0].stats.power;

    const result = await playerStateService.upgradeHeroLevel(heroId);

    expect(result.success).toBe(true);
    expect(playerStateService.getUser().bcoin).toBe(initialBcoin - 1);

    const updatedHero = playerStateService
      .getHeroes()
      .find((h) => h.id === heroId);
    expect(updatedHero.stats.power).toBeGreaterThan(initialPower);
  });

  it('should persist state to localStorage', async () => {
    await playerStateService.claimDailyFaucet(); // +5 BCOIN
    const heroes = playerStateService.getHeroes();
    await playerStateService.upgradeHeroLevel(heroes[0].id);

    const stored = localStorage.getItem('guest_state');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored);
    expect(parsed.user.bcoin).toBe(4);
  });

  describe('Task Force Phase 4: Upgrade Forge', () => {
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
  });
});
