import { describe, it, expect, beforeEach, vi } from 'vitest';
import playerStateService from './PlayerStateService.js';

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

describe('PlayerStateService Metagame', () => {
  beforeEach(() => {
    localStorage.clear();
    playerStateService.resetState();
    // Force guest mode
    playerStateService.init(null);
  });

  describe('XP Formula (Hardcore)', () => {
    it('should calculate next level XP correctly', () => {
       // Level 1 -> 1000 * 1.5^1 = 1500
       const user = playerStateService.getUser();
       user.accountLevel = 1;
       expect(playerStateService.getNextLevelXp()).toBe(1500);

       // Level 2 -> 1000 * 1.5^2 = 2250
       user.accountLevel = 2;
       expect(playerStateService.getNextLevelXp()).toBe(2250);

       // Level 8 -> 1000 * 1.5^8 = 25628
       user.accountLevel = 8;
       expect(playerStateService.getNextLevelXp()).toBe(25628);
    });

    it('should level up when XP threshold is reached', () => {
        // Level 1 needs 1500 XP
        const res = playerStateService.addAccountXp(1600);
        expect(res.leveledUp).toBe(true);
        expect(res.newLevel).toBe(2);

        // Remaining XP: 1600 - 1500 = 100
        expect(playerStateService.getUser().accountXp).toBe(100);
    });
  });

  describe('Level Gating', () => {
      it('should return isEndGame false for level < 8', () => {
          playerStateService.getUser().accountLevel = 1;
          expect(playerStateService.isEndGame()).toBe(false);

          playerStateService.getUser().accountLevel = 7;
          expect(playerStateService.isEndGame()).toBe(false);
      });

      it('should return isEndGame true for level >= 8', () => {
          playerStateService.getUser().accountLevel = 8;
          expect(playerStateService.isEndGame()).toBe(true);

          playerStateService.getUser().accountLevel = 50;
          expect(playerStateService.isEndGame()).toBe(true);
      });
  });

  describe('Daily Faucet', () => {
      it('should allow claiming 5 BCOIN', async () => {
          const res = await playerStateService.claimDailyFaucet();
          expect(res.success).toBe(true);
          expect(res.newBalance).toBe(5);
          expect(playerStateService.getUser().totalEarned).toBe(5);
      });

      it('should prevent claiming twice within 24h', async () => {
          await playerStateService.claimDailyFaucet();
          const res = await playerStateService.claimDailyFaucet();
          expect(res.success).toBe(false);
          expect(res.message).toContain('Wait');
      });
  });

  describe('Match History & Analytics', () => {
      it('should record match history', async () => {
          const matchData = { wave: 10, bcoin: 2, xp: 500 };
          await playerStateService.recordMatch(matchData);

          const history = playerStateService.getMatchHistory();
          expect(history).toHaveLength(1);
          expect(history[0].wave).toBe(10);
          expect(history[0].bcoin).toBe(2);
      });

      it('should limit history to 5 items', async () => {
          for(let i=0; i<6; i++) {
              await playerStateService.recordMatch({ wave: i, bcoin: 1, xp: 10 });
          }
          const history = playerStateService.getMatchHistory();
          expect(history).toHaveLength(5);
          expect(history[0].wave).toBe(5); // Newest first
      });

      it('should track lifetime stats', async () => {
          await playerStateService.recordMatch({ wave: 1, bcoin: 10, xp: 10 });
          await playerStateService.recordMatch({ wave: 1, bcoin: 5, xp: 10 });

          const user = playerStateService.getUser();
          expect(user.totalEarned).toBe(15);
      });

      it('should track spending', async () => {
          await playerStateService.claimDailyFaucet(); // +5
          const heroes = playerStateService.getHeroes();
          await playerStateService.upgradeHeroSkill(heroes[0].id, 'power'); // -1

          const user = playerStateService.getUser();
          expect(user.totalSpent).toBe(1);
      });
  });
});
