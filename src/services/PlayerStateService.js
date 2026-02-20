import axios from 'axios';
import { supabase } from '../lib/supabaseClient.js';
import { MOCK_USER, MOCK_HEROES, MOCK_INVENTORY } from '../config/MockData.js';
import { MockHeroes, MockHouses, SPELLS } from '../config/MockNFTData.js';

const STORAGE_KEY = 'sandbox_state';

class PlayerStateService {
    constructor() {
        // Initialize with default/mock state to prevent UI crashes before auth
        this.state = this.getDefaultState();
        this.isInitialized = false;
        this.walletAddress = null;
    }

    /**
     * Loads the initial state from Supabase (READ).
     * @param {string} walletAddress - The user's wallet address.
     */
    async init(walletAddress) {
        if (!walletAddress) {
            console.error('[PlayerState] Init failed: No wallet address provided');
            return;
        }

        console.log(`[PlayerState] Initializing for ${walletAddress}...`);
        this.walletAddress = walletAddress;

        try {
            // 1. Fetch User
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('wallet_address', walletAddress)
                .single();

            if (userError || !userData) {
                console.warn('[PlayerState] User not found, using Mock/Default.', userError);
                // In a real app, we might trigger a registration flow here
            } else {
                this.state.user = this._mapUserFromDB(userData);
            }

            // 2. Fetch Heroes
            const { data: heroesData, error: heroesError } = await supabase
                .from('heroes')
                .select('*')
                .eq('user_id', this.state.user.id || 0); // Handle missing user ID safely

            if (!heroesError && heroesData) {
                this.state.heroes = heroesData.map(h => this._mapHeroFromDB(h));
            }

            // 3. Fetch Inventory
            // We join user_items with items to get details
            const { data: inventoryData, error: inventoryError } = await supabase
                .from('user_items')
                .select('quantity, item:items(name, type, rarity)')
                .eq('user_id', this.state.user.id || 0);

            if (!inventoryError && inventoryData) {
                this.state.inventory = inventoryData.map(i => this._mapItemFromDB(i));
            }

            // 4. Fetch Bestiary
            const { data: bestiaryData, error: bestiaryError } = await supabase
                .from('user_bestiary')
                .select('enemy_type, kill_count')
                .eq('user_id', this.state.user.id || 0);

            if (!bestiaryError && bestiaryData) {
                this.state.bestiary = {};
                bestiaryData.forEach(b => {
                    this.state.bestiary[b.enemy_type] = b.kill_count;
                });
            }

            this.isInitialized = true;
            console.log('[PlayerState] Initialization Complete.', this.state);

        } catch (e) {
            console.error('[PlayerState] Initialization Error:', e);
        }
    }

    getDefaultState() {
        const heroes = JSON.parse(JSON.stringify(MockHeroes));
        return {
            user: {
                ...MOCK_USER,
                selectedHeroId: heroes[0] ? heroes[0].id : null,
                accountLevel: 1,
                accountXp: 0,
                bcoin: 1000 // Default Mock Balance
            },
            heroes: heroes,
            houses: JSON.parse(JSON.stringify(MockHouses)),
            inventory: [
                { type: 'fragment', rarity: 'Common', quantity: 200 }
            ],
            bestiary: {}
        };
    }

    // --- ADAPTERS (Snake -> Camel) ---

    _mapUserFromDB(dbUser) {
        return {
            id: dbUser.id,
            walletAddress: dbUser.wallet_address,
            bcoin: dbUser.coins, // Map 'coins' to 'bcoin'
            accountLevel: dbUser.account_level,
            accountXp: dbUser.account_xp,
            selectedHeroId: this.state.user.selectedHeroId // Persist selection locally for now
        };
    }

    _mapHeroFromDB(dbHero) {
        return {
            id: dbHero.id,
            genotype: dbHero.genotype || 'Unknown',
            level: dbHero.level,
            xp: dbHero.xp,
            rarity: this._mapRarityToInt(dbHero.rarity), // Map String to Int
            max_stage: dbHero.max_stage,
            stats: {
                power: dbHero.damage,
                speed: dbHero.speed,
                hp: dbHero.hp,
                // Add other stats if they exist in DB or default
            },
            spells: [], // TODO: Persist spells in DB
            name: dbHero.sprite_name // Use sprite name as name or separate field
        };
    }

    _mapItemFromDB(userItem) {
        // userItem is { quantity, item: { name, type, rarity } }
        const itemDef = userItem.item;
        return {
            type: itemDef.type, // e.g. 'fragment', 'weapon'
            rarity: itemDef.rarity, // 'Common'
            quantity: userItem.quantity,
            name: itemDef.name
        };
    }

    _mapRarityToInt(rarityString) {
        const map = { 'Common': 0, 'Rare': 1, 'Super Rare': 2, 'Epic': 3, 'Legend': 4, 'Super Legend': 5 };
        return map[rarityString] || 0;
    }

    // --- GETTERS (Sync - from Memory) ---

    getUser() { return this.state.user; }
    getHeroes() { return this.state.heroes; }
    getHouses() { return this.state.houses; }
    getInventory() { return this.state.inventory || []; }

    getHeroStage(heroId) {
        const hero = this.state.heroes.find(h => h.id === heroId);
        return hero ? (hero.max_stage || 1) : 1;
    }

    getFragmentCount(rarity) {
        if (!this.state.inventory) return 0;
        // Support both specific fragment types or generic 'fragment'
        const item = this.state.inventory.find(i =>
            (i.type === 'fragment' || i.name?.includes('Fragment')) && i.rarity === rarity
        );
        return item ? item.quantity : 0;
    }

    getAccountLevel() { return this.state.user.accountLevel || 1; }
    getAccountXp() { return this.state.user.accountXp || 0; }

    getBestiaryStatus(mobId) {
        const count = (this.state.bestiary && this.state.bestiary[mobId]) || 0;
        return { count, target: 5000, completed: count >= 5000 };
    }

    setSelectedHero(heroId) {
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');
        this.state.user.selectedHeroId = heroId;
        return { success: true, hero };
    }

    // --- ACTIONS (Async - Write to API) ---

    async incrementBestiaryKill(mobId, amount = 1) {
        // Optimistic Update
        if (!this.state.bestiary) this.state.bestiary = {};
        if (!this.state.bestiary[mobId]) this.state.bestiary[mobId] = 0;
        this.state.bestiary[mobId] += amount;

        try {
            // Fire and forget - or queue
            await axios.post('/api/game/bestiary/update', {
                walletAddress: this.walletAddress,
                updates: { [mobId]: amount }
            });
        } catch (e) {
            console.error('Failed to sync Bestiary', e);
        }

        return {
            success: true,
            mobId,
            newCount: this.state.bestiary[mobId],
            completed: this.state.bestiary[mobId] >= 5000
        };
    }

    async completeStage(heroId, stageId) {
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');

        // Optimistic Update
        let unlocked = false;
        if (!hero.max_stage) hero.max_stage = 1;
        if (stageId >= hero.max_stage) {
            hero.max_stage = stageId + 1;
            unlocked = true;
        }

        try {
             await axios.post('/api/game/stage/complete', {
                walletAddress: this.walletAddress,
                heroId,
                stageId
            });
        } catch (e) {
            console.error('Failed to save Stage Progress', e);
        }

        return { success: true, newMaxStage: hero.max_stage, unlocked };
    }

    /**
     * Upgrades Hero Level securely via API (WRITE).
     */
    async upgradeHeroLevel(heroId) {
        // Optimistic checks
        const hero = this.state.heroes.find(h => h.id === heroId);
        if (!hero) throw new Error('Hero not found');

        const bcoinCost = 1;
        const fragmentCost = 50;

        if (this.state.user.bcoin < bcoinCost) {
            return { success: false, message: 'Insufficient BCOIN' };
        }

        try {
            // Call API to execute transaction
            const response = await axios.post('/api/heroes/levelup', {
                walletAddress: this.walletAddress,
                heroId
            });

            if (response.data.success) {
                // Update local state with authoritative data from backend
                const { hero: updatedHero, newBalance, remainingFragments } = response.data;

                // Merge updates
                Object.assign(hero, this._mapHeroFromDB(updatedHero));
                this.state.user.bcoin = newBalance;

                // Update fragments in inventory
                const fragmentItem = this.state.inventory.find(i => i.type === 'fragment' && i.rarity === 'Common');
                if (fragmentItem) fragmentItem.quantity = remainingFragments;

                return {
                    success: true,
                    hero,
                    newLevel: hero.level,
                    remainingBcoin: this.state.user.bcoin,
                    remainingFragments: fragmentItem ? fragmentItem.quantity : 0
                };
            } else {
                return { success: false, message: response.data.message || 'Level up failed' };
            }
        } catch (e) {
            console.error('Level Up API Error:', e);
            return { success: false, message: 'Network Error' };
        }
    }

    async addSessionLoot(sessionLoot) {
        if (!sessionLoot || !Array.isArray(sessionLoot)) return;

        // Optimistic Update
        if (!this.state.inventory) this.state.inventory = [];
        sessionLoot.forEach(item => {
            const existing = this.state.inventory.find(i => i.type === item.type && i.rarity === item.rarity);
            if (existing) existing.quantity += (item.quantity || 1);
            else this.state.inventory.push(item);
        });

        try {
            await axios.post('/api/game/loot/sync', {
                walletAddress: this.walletAddress,
                loot: sessionLoot
            });
        } catch (e) {
            console.error('Failed to sync loot', e);
        }

        return { success: true, inventory: this.state.inventory };
    }

    // --- Legacy / Deprecated Methods (Kept for compatibility) ---

    saveState() { /* No-op: State is now DB-managed */ }
    resetState() { this.state = this.getDefaultState(); }

    upgradeHeroStat(heroId) { return { success: false, message: "Use Level Up" }; }
    upgradeHeroStatWithFragments(heroId) { return { success: false, message: "Use Level Up" }; }
    rerollHeroSpells(heroId) { return { success: false, message: "Coming Soon" }; }
}

const playerStateService = new PlayerStateService();
export default playerStateService;
