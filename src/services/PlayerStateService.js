import { MOCK_USER } from '../config/MockData.js';
import { MockHeroes, MockHouses, SPELLS, RARITY } from '../config/MockNFTData.js';

const STORAGE_KEY = 'sandbox_state';

class PlayerStateService {
    constructor() {
        this.state = this.loadState();
    }

    loadState() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load local state, resetting to defaults.', e);
        }
        return this.getDefaultState();
    }

    getDefaultState() {
        const heroes = JSON.parse(JSON.stringify(MockHeroes));
        return {
            user: {
                ...MOCK_USER,
                selectedHeroId: heroes[0] ? heroes[0].id : null,
                accountLevel: 1, // Task Force: Summoner's Journey
                accountXp: 0
            }, // Copy to avoid mutation issues
            heroes: heroes, // Deep copy
            houses: JSON.parse(JSON.stringify(MockHouses)), // Deep copy
            inventory: [
                { type: 'fragment', rarity: 'Common', quantity: 200 } // Pre-seed 200 Common Fragments
            ],
            bestiary: {} // Track kills per Mob ID
        };
    }

    saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('Failed to save state', e);
        }
    }

    // --- GETTERS ---

    getUser() {
        return this.state.user;
    }

    getHeroes() {
        return this.state.heroes;
    }

    getHouses() {
        return this.state.houses;
    }

    getInventory() {
        return this.state.inventory || [];
    }

    getHeroStage(heroId) {
        const hero = this.state.heroes.find(h => h.id === heroId);
        return hero ? (hero.max_stage || 1) : 1;
    }

    getFragmentCount(rarity) {
        if (!this.state.inventory) return 0;
        const item = this.state.inventory.find(i => i.type === 'fragment' && i.rarity === rarity);
        return item ? item.quantity : 0;
    }

    getAccountLevel() {
        return this.state.user.accountLevel || 1;
    }

    getAccountXp() {
        return this.state.user.accountXp || 0;
    }

    // --- ACTIONS ---

    incrementBestiaryKill(mobId, amount = 1) {
        if (!this.state.bestiary) this.state.bestiary = {};
        if (!this.state.bestiary[mobId]) this.state.bestiary[mobId] = 0;

        this.state.bestiary[mobId] += amount;

        // Cap is implicitly tracked by checking >= 5000 in UI/Logic
        // We do not stop counting at 5000 in case we want "Prestige" later.

        this.saveState();
        return {
            success: true,
            mobId,
            newCount: this.state.bestiary[mobId],
            completed: this.state.bestiary[mobId] >= 5000
        };
    }

    getBestiaryStatus(mobId) {
        const count = (this.state.bestiary && this.state.bestiary[mobId]) || 0;
        return {
            count,
            target: 5000,
            completed: count >= 5000
        };
    }

    setSelectedHero(heroId) {
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');

        this.state.user.selectedHeroId = heroId;
        this.saveState();
        return { success: true, hero };
    }

    completeStage(heroId, stageId) {
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');

        // Initialize max_stage if missing
        if (!hero.max_stage) hero.max_stage = 1;

        // Unlock next stage logic
        if (stageId >= hero.max_stage) {
            hero.max_stage = stageId + 1;
            console.log(`[PlayerState] Hero ${hero.name} unlocked Stage ${hero.max_stage}`);
            this.saveState();
            return { success: true, newMaxStage: hero.max_stage, unlocked: true };
        }

        return { success: true, newMaxStage: hero.max_stage, unlocked: false };
    }

    upgradeHeroStat(heroId) {
        // Deprecated: Kept for legacy compatibility if needed
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');

        const cost = 500;
        if (this.state.user.bcoin < cost) {
            throw new Error('Insufficient BCOIN');
        }

        // Deduct Balance
        this.state.user.bcoin -= cost;

        // Upgrade Random Stat
        const stats = ['power', 'speed', 'stamina', 'bomb_num', 'range'];
        const randomStat = stats[Math.floor(Math.random() * stats.length)];

        // Initialize if missing (safety)
        if (!hero.stats) hero.stats = {};
        if (!hero.stats[randomStat]) hero.stats[randomStat] = 1;

        hero.stats[randomStat] += 1;

        this.saveState();
        return { success: true, hero, statUpgraded: randomStat };
    }

    upgradeHeroStatWithFragments(heroId, statName) {
         // Deprecated: Kept for legacy compatibility if needed
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');

        // Valid stats to upgrade via this method
        if (!['power', 'speed'].includes(statName)) {
             throw new Error('Invalid stat for upgrade');
        }

        const rarity = 'Common';
        const cost = 50;

        const fragmentCount = this.getFragmentCount(rarity);
        if (fragmentCount < cost) {
            return { success: false, message: 'Insufficient Fragments' };
        }

        // Deduct Fragments
        const item = this.state.inventory.find(i => i.type === 'fragment' && i.rarity === rarity);
        if (item) {
            item.quantity -= cost;
        }

        // Upgrade Stat
        if (!hero.stats) hero.stats = {};
        if (!hero.stats[statName]) hero.stats[statName] = 1;

        hero.stats[statName] += 1;

        this.saveState();
        return { success: true, hero, newStatValue: hero.stats[statName], remainingFragments: item ? item.quantity : 0 };
    }

    // NEW: Hero Level Up System
    upgradeHeroLevel(heroId) {
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');

        const bcoinCost = 1;
        const fragmentCost = 50;
        const fragmentRarity = 'Common';

        // Check BCOIN
        if (this.state.user.bcoin < bcoinCost) {
            return { success: false, message: 'Insufficient BCOIN (Need 1)' };
        }

        // Check Fragments
        const fragmentItem = this.state.inventory.find(i => i.type === 'fragment' && i.rarity === fragmentRarity);
        const currentFragments = fragmentItem ? fragmentItem.quantity : 0;

        if (currentFragments < fragmentCost) {
            return { success: false, message: `Insufficient Fragments (Need ${fragmentCost})` };
        }

        // Deduct Costs
        this.state.user.bcoin -= bcoinCost;
        fragmentItem.quantity -= fragmentCost;

        // Level Up Logic
        if (!hero.level) hero.level = 1;
        hero.level += 1;

        // Save
        this.saveState();

        return {
            success: true,
            hero,
            newLevel: hero.level,
            remainingBcoin: this.state.user.bcoin,
            remainingFragments: fragmentItem.quantity
        };
    }

    rerollHeroSpells(heroId) {
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');

        const cost = 1000;
        if (this.state.user.bcoin < cost) {
            throw new Error('Insufficient BCOIN');
        }

        // Deduct Balance
        this.state.user.bcoin -= cost;

        // Determine number of spells based on rarity
        // Common(0): 0-1, Rare(1): 1, SR(2): 1-2, Epic(3): 2-3, Legend(4): 3, SP(5): 4
        let minSpells = 0;
        let maxSpells = 1;

        switch (hero.rarity) {
            case 0: minSpells = 0; maxSpells = 1; break;
            case 1: minSpells = 1; maxSpells = 1; break;
            case 2: minSpells = 1; maxSpells = 2; break;
            case 3: minSpells = 2; maxSpells = 3; break;
            case 4: minSpells = 3; maxSpells = 3; break;
            case 5: minSpells = 4; maxSpells = 4; break;
            default: minSpells = 1; maxSpells = 1;
        }

        const numSpells = Math.floor(Math.random() * (maxSpells - minSpells + 1)) + minSpells;

        // Pick random unique spells
        const allSpellIds = Object.keys(SPELLS).map(k => parseInt(k));
        const newSpells = [];

        // Simple shuffle and pick
        for (let i = allSpellIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allSpellIds[i], allSpellIds[j]] = [allSpellIds[j], allSpellIds[i]];
        }

        hero.spells = allSpellIds.slice(0, numSpells);

        this.saveState();
        return { success: true, hero, newSpells: hero.spells };
    }

    addAccountXp(amount) {
        if (!this.state.user.accountLevel) this.state.user.accountLevel = 1;
        if (!this.state.user.accountXp) this.state.user.accountXp = 0;

        this.state.user.accountXp += amount;
        let leveledUp = false;
        let requiredXp = this.state.user.accountLevel * 100;

        while (this.state.user.accountXp >= requiredXp) {
            this.state.user.accountXp -= requiredXp;
            this.state.user.accountLevel++;
            requiredXp = this.state.user.accountLevel * 100;
            leveledUp = true;
        }

        this.saveState();
        return {
            success: true,
            leveledUp: leveledUp,
            newLevel: this.state.user.accountLevel,
            currentXp: this.state.user.accountXp
        };
    }

    /**
     * Phase 3: Merges session loot into persistent inventory.
     * @param {Array} sessionLoot - Array of { type, rarity, quantity } objects.
     */
    addSessionLoot(sessionLoot) {
        if (!sessionLoot || !Array.isArray(sessionLoot)) return;

        if (!this.state.inventory) this.state.inventory = [];

        sessionLoot.forEach(item => {
            const existingItem = this.state.inventory.find(
                i => i.type === item.type && i.rarity === item.rarity
            );

            if (existingItem) {
                existingItem.quantity = (existingItem.quantity || 0) + (item.quantity || 1);
            } else {
                this.state.inventory.push({
                    type: item.type,
                    rarity: item.rarity,
                    quantity: item.quantity || 1
                });
            }
        });

        console.log('[PlayerState] Inventory Updated:', this.state.inventory);
        this.saveState();
        return { success: true, inventory: this.state.inventory };
    }

    resetState() {
        this.state = this.getDefaultState();
        this.saveState();
    }
}

const playerStateService = new PlayerStateService();
export default playerStateService;
