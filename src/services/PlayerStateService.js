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
        return {
            user: { ...MOCK_USER }, // Copy to avoid mutation issues
            heroes: JSON.parse(JSON.stringify(MockHeroes)), // Deep copy
            houses: JSON.parse(JSON.stringify(MockHouses)) // Deep copy
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

    // --- ACTIONS ---

    upgradeHeroStat(heroId) {
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

    resetState() {
        this.state = this.getDefaultState();
        this.saveState();
    }
}

const playerStateService = new PlayerStateService();
export default playerStateService;
