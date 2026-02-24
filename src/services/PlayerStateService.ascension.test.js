import { describe, it, expect, beforeEach, vi } from 'vitest';
import playerStateService from './PlayerStateService.js';

describe('PlayerStateService: Ascension System', () => {
  beforeEach(() => {
    // Reset state before each test
    playerStateService.state = playerStateService.getDefaultState();
    playerStateService.isInitialized = true;
    playerStateService.isGuest = true;
  });

  const HERO_ID = playerStateService.getHeroes()[0].id;

  it('should initialize hero with ascension level 0', () => {
    const hero = playerStateService.getHeroes().find(h => h.id === HERO_ID);
    expect(hero.ascensionLevel).toBe(0);
  });

  it('should prevent ascension without Boss Core', async () => {
    // Ensure no boss core
    playerStateService.state.inventory = [];

    // Set Skills to Max (40 levels total) to bypass skill check
    const hero = playerStateService.getHeroes().find(h => h.id === HERO_ID);
    hero.skills = { speed: 1000, power: 1000, range: 1000, fireRate: 1000 }; // 4000 XP = 40 Levels

    const result = await playerStateService.ascendHero(HERO_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing Boss Core');
  });

  it('should prevent ascension if skills are not maxed (Soft Cap)', async () => {
    // Give resources
    playerStateService.state.inventory = [{ type: 'boss_core', quantity: 1 }];
    playerStateService.state.user.bcoin = 1000;

    const hero = playerStateService.getHeroes().find(h => h.id === HERO_ID);
    // Set skills below cap (e.g., 39 levels total)
    hero.skills = { speed: 900, power: 1000, range: 1000, fireRate: 1000 };

    const result = await playerStateService.ascendHero(HERO_ID);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Maximize all skills');
  });

  it('should ascend hero successfully when conditions are met', async () => {
    // 1. Resources
    playerStateService.state.inventory = [{ type: 'boss_core', quantity: 1 }];
    playerStateService.state.user.bcoin = 1000;

    // 2. Max Skills (Base Cap is 10 per skill -> 40 total levels -> 4000 XP)
    const hero = playerStateService.getHeroes().find(h => h.id === HERO_ID);
    hero.skills = { speed: 1000, power: 1000, range: 1000, fireRate: 1000 };

    // 3. Ascend
    const result = await playerStateService.ascendHero(HERO_ID);

    expect(result.success).toBe(true);
    expect(result.newAscensionLevel).toBe(1);
    expect(hero.ascensionLevel).toBe(1);

    // Verify Cost Deduction
    expect(playerStateService.state.user.bcoin).toBe(1000 - 100); // 100 * (0+1)
    const core = playerStateService.state.inventory.find(i => i.type === 'boss_core');
    expect(core).toBeUndefined(); // Should be removed or quantity 0
  });

  it('should allow training beyond base cap after ascension', async () => {
    // 1. Setup Ascended Hero
    const hero = playerStateService.getHeroes().find(h => h.id === HERO_ID);
    hero.ascensionLevel = 1;
    hero.skills = { speed: 1000, power: 1000, range: 1000, fireRate: 1000 }; // Level 10

    // Give BCOIN for training
    playerStateService.state.user.bcoin = 10;

    // 2. Train Skill (Should succeed because Cap is now 20)
    // Base Cap 10 + Ascension Bonus 10 = 20.
    const result = await playerStateService.upgradeHeroSkill(HERO_ID, 'speed');

    expect(result.success).toBe(true);
    expect(hero.skills.speed).toBe(1100); // 1000 + 100
  });

  it('should enforce new cap after ascension', async () => {
      // 1. Setup Ascended Hero at New Cap (Level 20)
      const hero = playerStateService.getHeroes().find(h => h.id === HERO_ID);
      hero.ascensionLevel = 1;
      // Cap is 20 -> 2000 XP
      hero.skills = { speed: 2000, power: 1000, range: 1000, fireRate: 1000 };

      playerStateService.state.user.bcoin = 10;

      // 2. Try to Train (Should Fail)
      const result = await playerStateService.upgradeHeroSkill(HERO_ID, 'speed');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Skill Capped');
  });
});
