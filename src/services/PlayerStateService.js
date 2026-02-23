import axios from 'axios';
import { supabase } from '../lib/supabaseClient.js';
import { MOCK_USER } from '../config/MockData.js';
import { MockHeroes, MockHouses } from '../config/MockNFTData.js';

const STORAGE_KEY = 'sandbox_state';
const GUEST_STATE_KEY = 'guest_state';

class PlayerStateService {
  constructor() {
    this.state = this.getDefaultState();
    this.isInitialized = false;
    this.walletAddress = null;
    this.isGuest = false;
    this.isAdmin = false;
    this.godMode = false; // Admin God Mode Flag
  }

  /**
   * Initializes the player state.
   * @param {string|null} walletAddress - User wallet/id. If null, loads Guest Mode.
   * @param {string|null} email - User email for Admin check.
   */
  async init(walletAddress = null, email = null) {
    console.log(
      `[PlayerState] Initializing. Wallet: ${
        walletAddress || 'Guest'
      }, Email: ${email || 'N/A'}`
    );

    this.walletAddress = walletAddress;
    this.checkAdmin(email);

    if (!walletAddress) {
      this.loadLocalState();
      this.isGuest = true;
      this.isInitialized = true;
      console.log('[PlayerState] Guest Mode Active');
    } else {
      this.isGuest = false;
      await this.loadCloudState(walletAddress);
    }

    // --- Analytics: Days Logged In ---
    this.checkDailyLogin();
  }

  checkAdmin(email) {
    if (!email) {
      this.isAdmin = false;
      return;
    }
    // Check environment variables for Admin Email
    const adminEmail =
      import.meta.env?.VITE_ADMIN_EMAIL || process.env?.REACT_APP_ADMIN_EMAIL;

    if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
      this.isAdmin = true;
      console.log('🌹 [PlayerState] ADMIN ACCESS GRANTED 🌹');
    } else {
      this.isAdmin = false;
    }
  }

  checkDailyLogin() {
    const today = new Date().toDateString();
    if (this.state.user.lastLoginDate !== today) {
        this.state.user.daysLogged = (this.state.user.daysLogged || 0) + 1;
        this.state.user.lastLoginDate = today;
        this.saveLocalState();
        console.log(`[PlayerState] Daily Login Recorded. Days: ${this.state.user.daysLogged}`);
    }
  }

  loadLocalState() {
    try {
      const json = localStorage.getItem(GUEST_STATE_KEY);
      if (json) {
        const savedState = JSON.parse(json);
        // Merge with default to ensure structure integrity
        this.state = { ...this.getDefaultState(), ...savedState };
        // Ensure new fields exist if loading old state
        if (!this.state.user.matchHistory) this.state.user.matchHistory = [];
        if (this.state.user.totalEarned === undefined) this.state.user.totalEarned = 0;
        if (this.state.user.totalSpent === undefined) this.state.user.totalSpent = 0;
        if (this.state.user.daysLogged === undefined) this.state.user.daysLogged = 1;

        console.log('[PlayerState] Loaded Local Guest State');
      } else {
        this.state = this.getDefaultState();
        this.saveLocalState();
        console.log('[PlayerState] Created New Guest State');
      }
    } catch (e) {
      console.warn('[PlayerState] Failed to load local state, resetting.', e);
      this.state = this.getDefaultState();
    }
  }

  saveLocalState() {
    if (!this.isGuest) return; // Only save locally if guest
    try {
      localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('[PlayerState] Failed to save local state', e);
    }
  }

  async loadCloudState(walletAddress) {
    try {
      // 1. Fetch User
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError || !userData) {
        console.warn(
          '[PlayerState] Cloud User not found. This should be handled by Auth.',
          userError
        );
        // Fallback to Mock if DB fails, but keep isGuest=false to prevent overwriting local
        this.state.user = { ...MOCK_USER, walletAddress };
      } else {
        this.state.user = this._mapUserFromDB(userData);
      }

      // 2. Fetch Heroes
      const { data: heroesData } = await supabase
        .from('heroes')
        .select('*')
        .eq('user_id', this.state.user.id || 0);

      if (heroesData) {
        this.state.heroes = heroesData.map((h) => this._mapHeroFromDB(h));
      }

      // 3. Fetch Inventory
      const { data: inventoryData } = await supabase
        .from('user_items')
        .select('quantity, item:items(name, type, rarity)')
        .eq('user_id', this.state.user.id || 0);

      if (inventoryData) {
        this.state.inventory = inventoryData.map((i) => this._mapItemFromDB(i));
      }

      // 4. Fetch Bestiary
      const { data: bestiaryData } = await supabase
        .from('user_bestiary')
        .select('enemy_type, kill_count')
        .eq('user_id', this.state.user.id || 0);

      if (bestiaryData) {
        this.state.bestiary = {};
        bestiaryData.forEach((b) => {
          this.state.bestiary[b.enemy_type] = b.kill_count;
        });
      }

      this.isInitialized = true;
      console.log('[PlayerState] Cloud State Loaded', this.state);
    } catch (e) {
      console.error('[PlayerState] Cloud Load Error:', e);
    }
  }

  async mergeGuestData(user) {
    console.log('[PlayerState] Merging Guest Data to Cloud...');
    const guestState = JSON.parse(localStorage.getItem(GUEST_STATE_KEY));
    if (!guestState) return;

    const gainedXp = guestState.user.accountXp || 0;
    const gainedCoins = guestState.user.bcoin - 0; // Guest starts with 0 now

    try {
      await axios.post('/api/game/sync-offline', {
        walletAddress: user.walletAddress,
        xp: gainedXp,
        coins: Math.max(0, gainedCoins),
        items: guestState.inventory || [],
        bestiary: guestState.bestiary || {},
      });

      localStorage.removeItem(GUEST_STATE_KEY);
      localStorage.removeItem('termsAccepted');
      console.log('[PlayerState] Merge Complete. Guest State Cleared.');

      await this.init(user.walletAddress, user.email);
    } catch (e) {
      console.error('[PlayerState] Failed to merge guest data', e);
    }
  }

  getDefaultState() {
    const heroes = JSON.parse(JSON.stringify(MockHeroes));
    return {
      user: {
        ...MOCK_USER,
        id: 'guest_' + Date.now(),
        walletAddress: null,
        selectedHeroId: heroes[0] ? heroes[0].id : null,
        accountLevel: 1,
        accountXp: 0,
        bcoin: 0, // Starts with 0
        totalEarned: 0,
        totalSpent: 0,
        daysLogged: 1,
        lastLoginDate: new Date().toDateString(),
        lastFaucetClaim: 0,
        matchHistory: [], // { wave: number, bcoin: number, timestamp: number }
      },
      heroes: heroes,
      houses: JSON.parse(JSON.stringify(MockHouses)),
      inventory: [
        { type: 'fragment', rarity: 'Common', quantity: 200 },
      ],
      bestiary: {},
    };
  }

  // --- ADAPTERS ---

  _mapUserFromDB(dbUser) {
    return {
      id: dbUser.id,
      walletAddress: dbUser.wallet_address,
      bcoin: dbUser.coins,
      accountLevel: dbUser.account_level,
      accountXp: dbUser.account_xp,
      selectedHeroId: this.state.user.selectedHeroId,
      // Fallback for missing fields in DB (MVP Mock)
      totalEarned: dbUser.total_earned || 0,
      totalSpent: dbUser.total_spent || 0,
      daysLogged: dbUser.days_logged || 1,
      lastLoginDate: new Date().toDateString(), // Refresh on load
      matchHistory: [], // TODO: Load from DB if needed
    };
  }

  _mapHeroFromDB(dbHero) {
    return {
      id: dbHero.id,
      genotype: dbHero.genotype || 'Unknown',
      level: dbHero.level,
      xp: dbHero.xp,
      rarity: this._mapRarityToInt(dbHero.rarity),
      max_stage: dbHero.max_stage,
      stats: {
        power: dbHero.damage,
        speed: dbHero.speed,
        hp: dbHero.hp,
      },
      spells: [],
      name: dbHero.sprite_name,
    };
  }

  _mapItemFromDB(userItem) {
    const itemDef = userItem.item;
    return {
      type: itemDef.type,
      rarity: itemDef.rarity,
      quantity: userItem.quantity,
      name: itemDef.name,
    };
  }

  _mapRarityToInt(rarityString) {
    const map = {
      Common: 0,
      Rare: 1,
      'Super Rare': 2,
      Epic: 3,
      Legend: 4,
      'Super Legend': 5,
    };
    return map[rarityString] || 0;
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
  getMatchHistory() {
      return this.state.user.matchHistory || [];
  }
  isEndGame() {
      return this.state.user.accountLevel >= 8;
  }

  getHeroStage(heroId) {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    return hero ? hero.max_stage || 1 : 1;
  }

  getFragmentCount(rarity) {
    if (!this.state.inventory) return 0;
    const item = this.state.inventory.find(
      (i) =>
        (i.type === 'fragment' || i.name?.includes('Fragment')) &&
        i.rarity === rarity
    );
    return item ? item.quantity : 0;
  }

  getAccountLevel() {
    return this.state.user.accountLevel || 1;
  }
  getAccountXp() {
    return this.state.user.accountXp || 0;
  }
  getNextLevelXp() {
      const level = this.state.user.accountLevel;
      // Hardcore Formula: 1000 * (1.5 ^ Level)
      return Math.floor(1000 * Math.pow(1.5, level));
  }

  getBestiaryStatus(mobId) {
    const count = (this.state.bestiary && this.state.bestiary[mobId]) || 0;
    return { count, target: 5000, completed: count >= 5000 };
  }

  setSelectedHero(heroId) {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (!hero) throw new Error('Hero not found');
    this.state.user.selectedHeroId = heroId;
    this.saveLocalState();
    return { success: true, hero };
  }

  // --- ACTIONS ---

  async claimDailyFaucet() {
      const now = Date.now();
      const lastClaim = this.state.user.lastFaucetClaim || 0;
      const cooldown = 24 * 60 * 60 * 1000; // 24 Hours

      if (now - lastClaim < cooldown) {
          const remaining = Math.ceil((cooldown - (now - lastClaim)) / (60 * 60 * 1000));
          return { success: false, message: `Wait ${remaining}h` };
      }

      const amount = 5;
      this.state.user.bcoin += amount;
      this.state.user.totalEarned = (this.state.user.totalEarned || 0) + amount;
      this.state.user.lastFaucetClaim = now;
      this.saveLocalState();

      console.log(`[PlayerState] Daily Faucet Claimed: +${amount} BCOIN`);
      return { success: true, newBalance: this.state.user.bcoin };
  }

  async recordMatch(result) {
      // result: { wave, bcoin, xp }
      const { wave, bcoin, xp } = result;

      // 1. Add History (Keep last 5)
      if (!this.state.user.matchHistory) this.state.user.matchHistory = [];
      this.state.user.matchHistory.unshift({
          wave,
          bcoin,
          timestamp: Date.now()
      });
      if (this.state.user.matchHistory.length > 5) {
          this.state.user.matchHistory.pop();
      }

      // 2. Add Stats
      this.state.user.totalEarned = (this.state.user.totalEarned || 0) + bcoin;
      this.state.user.bcoin += bcoin;

      // 3. Add XP (Use internal method to handle leveling)
      const levelResult = this.addAccountXp(xp);

      this.saveLocalState();
      console.log('[PlayerState] Match Recorded:', result);

      return { success: true, levelResult };
  }

  async incrementBestiaryKill(mobId, amount = 1) {
    if (!this.state.bestiary) this.state.bestiary = {};
    if (!this.state.bestiary[mobId]) this.state.bestiary[mobId] = 0;
    this.state.bestiary[mobId] += amount;

    this.saveLocalState();

    if (!this.isGuest) {
      try {
        await axios.post('/api/game/bestiary/update', {
          walletAddress: this.walletAddress,
          updates: { [mobId]: amount },
        });
      } catch (e) {
        console.error('Failed to sync Bestiary', e);
      }
    }

    return {
      success: true,
      mobId,
      newCount: this.state.bestiary[mobId],
      completed: this.state.bestiary[mobId] >= 5000,
    };
  }

  addAccountXp(amount) {
    this.state.user.accountXp = (this.state.user.accountXp || 0) + amount;

    // Hardcore Level Up Logic
    // XP Required = 1000 * (1.5 ^ Level)
    const getReqXp = (lvl) => Math.floor(1000 * Math.pow(1.5, lvl));

    let requiredXp = getReqXp(this.state.user.accountLevel);
    let leveledUp = false;

    // While loop to handle multiple level ups (rare but possible with big XP chunks)
    while (this.state.user.accountXp >= requiredXp) {
      this.state.user.accountXp -= requiredXp;
      this.state.user.accountLevel++;
      leveledUp = true;
      requiredXp = getReqXp(this.state.user.accountLevel);
      console.log(`[PlayerState] LEVEL UP! New Level: ${this.state.user.accountLevel}`);
    }

    this.saveLocalState();
    return { success: true, newLevel: this.state.user.accountLevel, leveledUp };
  }

  async completeStage(heroId, stageId) {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (!hero) throw new Error('Hero not found');

    let unlocked = false;
    if (!hero.max_stage) hero.max_stage = 1;
    if (stageId >= hero.max_stage) {
      hero.max_stage = stageId + 1;
      unlocked = true;
    }

    this.saveLocalState();

    if (!this.isGuest) {
      try {
        await axios.post('/api/game/stage/complete', {
          walletAddress: this.walletAddress,
          heroId,
          stageId,
        });
      } catch (e) {
        console.error('Failed to save Stage Progress', e);
      }
    }

    return { success: true, newMaxStage: hero.max_stage, unlocked };
  }

  async upgradeHeroLevel(heroId) {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (!hero) throw new Error('Hero not found');

    const bcoinCost = 1;

    if (this.state.user.bcoin < bcoinCost) {
      return { success: false, message: 'Insufficient BCOIN' };
    }

    // Logic split: Guest vs Cloud
    if (this.isGuest) {
      this.state.user.bcoin -= bcoinCost;
      this.state.user.totalSpent = (this.state.user.totalSpent || 0) + bcoinCost;

      hero.level++;
      hero.stats.power += 1;
      hero.stats.speed += 1;

      this.saveLocalState();
      return {
        success: true,
        hero,
        newLevel: hero.level,
        remainingBcoin: this.state.user.bcoin,
        remainingFragments: 0,
      };
    } else {
      try {
        const response = await axios.post('/api/heroes/levelup', {
          walletAddress: this.walletAddress,
          heroId,
        });

        if (response.data.success) {
          const { hero: updatedHero, newBalance } = response.data;
          Object.assign(hero, this._mapHeroFromDB(updatedHero));
          this.state.user.bcoin = newBalance;
          // Optimistic spent tracking for analytics (approx)
          this.state.user.totalSpent = (this.state.user.totalSpent || 0) + bcoinCost;

          return {
            success: true,
            hero,
            newLevel: hero.level,
            remainingBcoin: newBalance,
          };
        } else {
          return { success: false, message: response.data.message || 'Failed' };
        }
      } catch (e) {
        return { success: false, message: 'Network Error' };
      }
    }
  }

  async addSessionLoot(sessionLoot) {
    if (!sessionLoot || !Array.isArray(sessionLoot)) return;

    if (!this.state.inventory) this.state.inventory = [];
    sessionLoot.forEach((item) => {
      const existing = this.state.inventory.find(
        (i) => i.type === item.type && i.rarity === item.rarity
      );
      if (existing) existing.quantity += item.quantity || 1;
      else this.state.inventory.push(item);
    });

    this.saveLocalState();

    if (!this.isGuest) {
      try {
        await axios.post('/api/game/loot/sync', {
          walletAddress: this.walletAddress,
          loot: sessionLoot,
        });
      } catch (e) {
        console.error('Failed to sync loot', e);
      }
    }

    return { success: true, inventory: this.state.inventory };
  }

  // --- ADMIN TOOLS ---

  addResources(xp, coins) {
    console.log(`[Admin] Adding ${xp} XP and ${coins} Coins`);
    this.state.user.bcoin += coins;
    this.state.user.totalEarned = (this.state.user.totalEarned || 0) + coins;
    this.addAccountXp(xp);
    this.saveLocalState();

    if (!this.isGuest) {
      axios
        .post('/api/admin/grant-resources', {
          walletAddress: this.walletAddress,
          xp,
          coins,
        })
        .catch((e) => console.warn('Admin Sync Failed', e));
    }
    return {
      success: true,
      newBalance: this.state.user.bcoin,
      newLevel: this.state.user.accountLevel,
    };
  }

  resetHero(heroId) {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (hero) {
      hero.level = 1;
      hero.stats = { power: 1, speed: 1, hp: 100 };
      this.saveLocalState();
      return { success: true, hero };
    }
    return { success: false, message: 'Hero not found' };
  }

  toggleGodMode() {
    this.godMode = !this.godMode;
    console.log('[Admin] God Mode:', this.godMode);
    return this.godMode;
  }

  resetState() {
    this.state = this.getDefaultState();
    this.saveLocalState();
  }
}

const playerStateService = new PlayerStateService();
export default playerStateService;
