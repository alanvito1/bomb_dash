import axios from 'axios';
import { supabase } from '../lib/supabaseClient.js';
import { MOCK_USER } from '../config/MockData.js';
import { MockHeroes, MockHouses } from '../config/MockNFTData.js';

const STORAGE_KEY = 'sandbox_state';
const GUEST_STATE_KEY = 'guest_state';

const XP_PER_LEVEL = 100;
const BASE_SKILL_CAP_LEVEL = 10;
const ASCENSION_BONUS_LEVEL = 10;

class PlayerStateService {
  constructor() {
    this.state = this.getDefaultState();
    this.isInitialized = false;
    this.walletAddress = null;
    this.isGuest = false;
    this.isAdmin = false;
    this.godMode = false; // Admin God Mode Flag

    // XP Boost Logic
    this.xpBoostActiveUntil = 0;
  }

  /**
   * Initializes the player state.
   * @param {object|null} user - Supabase User Object or null (Guest).
   */
  async init(user = null) {
    let walletAddress = null;
    let email = null;
    let fullName = null;
    let avatarUrl = null;

    if (user) {
        if (typeof user === 'string') {
             // Legacy Support for tests/mock calls passing walletAddress string directly
             walletAddress = user;
        } else {
             // Standard Supabase User Object
             walletAddress = user.id; // Use UUID as walletAddress for Web2 Auth
             email = user.email;
             // Extract Metadata
             if (user.user_metadata) {
                 fullName = user.user_metadata.full_name || user.user_metadata.name;
                 avatarUrl = user.user_metadata.avatar_url || user.user_metadata.picture;
             }
        }
    }

    console.log(
      `[PlayerState] Initializing. Wallet/ID: ${
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

      // Check for Guest Data Merge
      if (localStorage.getItem(GUEST_STATE_KEY)) {
          console.log('[PlayerState] Found existing guest data. Attempting merge...');
          // Pass the full user object to preserve metadata during re-init
          await this.mergeGuestData(user);
      }

      await this.loadCloudState(walletAddress);

      // Inject Identity Metadata (since DB might not have it yet)
      if (fullName) this.state.user.fullName = fullName;
      if (avatarUrl) this.state.user.avatarUrl = avatarUrl;
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

        // Reset Daily XP Boost Count
        this.state.user.dailyBoostUsage = 0;

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
        if (this.state.user.dailyBoostUsage === undefined) this.state.user.dailyBoostUsage = 0;

        // Boost Timestamp from localStorage? For now, boosts are transient in session (MVP)
        // or we could save xpBoostActiveUntil if we want persistence across reloads.
        // Let's keep it simple: boosts are session/timestamp based.
        if (savedState.xpBoostActiveUntil) {
           this.xpBoostActiveUntil = savedState.xpBoostActiveUntil;
        }

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
    // Save locally for Guest OR to persist preferences/boost timers for Authenticated users too (if hybrid)
    // But architecture says "Only save locally if guest" for core state.
    // We might want to save Boost Timer locally for everyone so refresh doesn't kill it.

    const exportState = { ...this.state, xpBoostActiveUntil: this.xpBoostActiveUntil };

    if (this.isGuest) {
        try {
            localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(exportState));
        } catch (e) {
            console.error('[PlayerState] Failed to save local state', e);
        }
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

    // Resolve Wallet Address from User Object (Supabase or Legacy)
    const walletAddress = user.id || user.walletAddress || (typeof user === 'string' ? user : null);

    const gainedXp = guestState.user.accountXp || 0;
    const gainedCoins = guestState.user.bcoin - 0; // Guest starts with 0 now

    try {
      await axios.post('/api/game/sync-offline', {
        walletAddress: walletAddress,
        xp: gainedXp,
        coins: Math.max(0, gainedCoins),
        items: guestState.inventory || [],
        bestiary: guestState.bestiary || {},
      });

      localStorage.removeItem(GUEST_STATE_KEY);
      localStorage.removeItem('termsAccepted');
      console.log('[PlayerState] Merge Complete. Guest State Cleared.');

      // Re-init with full user object to restore metadata
      await this.init(user);
    } catch (e) {
      console.error('[PlayerState] Failed to merge guest data', e);
    }
  }

  getDefaultState() {
    const heroes = JSON.parse(JSON.stringify(MockHeroes)).map(h => {
        // Ensure default skills structure
        h.skills = { speed: 0, fireRate: 0, range: 0, power: 0 };
        // Ensure default ascension
        h.ascensionLevel = 0;
        return h;
    });

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
        dailyBoostUsage: 0, // Track usage for progressive cost
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
      dailyBoostUsage: dbUser.daily_boost_usage || 0,
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
      skills: dbHero.skills || { speed: 0, fireRate: 0, range: 0, power: 0 },
      ascensionLevel: dbHero.ascension_level || 0,
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

  /**
   * Calculates the Effective Stats of a hero based on Base NFT + Account Buffs + Skill Levels.
   * Micro-Progress Rule: Each Skill Level grants +0.01% (x 1.0001) or linear percentage?
   * Prompt says: "+1 em qualquer atributo... concederá apenas um incremento de 0.01%".
   * Interpreting as: Effective = Base * (1 + (SkillLevel * 0.0001)).
   */
  getHeroStats(heroId) {
      const hero = this.state.heroes.find(h => h.id === heroId);
      if (!hero) return null;

      const accountLevel = this.getAccountLevel();
      const skills = hero.skills || { speed: 0, fireRate: 0, range: 0, power: 0 };

      // Skill Levels (Handbrake Logic: Use explicit levels, default to floor if missing)
      const XP_PER_LEVEL = 100;

      // Task Force: Speed is NOT manual anymore. It's Account Level only.
      const speedLvl = 0;

      // Task Force: Manual Skills use explicit level (unlocked via Forge)
      const powerLvl = skills.power_level !== undefined ? skills.power_level : Math.floor((skills.power || 0) / XP_PER_LEVEL);
      const rangeLvl = skills.range_level !== undefined ? skills.range_level : Math.floor((skills.range || 0) / XP_PER_LEVEL);
      const fireRateLvl = skills.fireRate_level !== undefined ? skills.fireRate_level : Math.floor((skills.fireRate || 0) / XP_PER_LEVEL);

      // Base Stats from NFT
      const basePower = hero.stats.power || 1;
      const baseSpeed = hero.stats.speed || 1;
      const baseHp = hero.stats.hp || 100;
      const baseRange = hero.stats.range || 1;

      // Multipliers
      // 1. Account Buff (+1% per Level)
      const accountMult = 1 + (accountLevel * 0.01);

      // 2. Skill Buffs (+0.01% per Level)
      // Speed Buff: Removed manual component. Only Account Buff affects speed now?
      // User said: "Speed EXCLUSIVELY to Account Level".
      // So no speedLvl buff.
      const speedBuff = 1;

      const powerBuff = 1 + (powerLvl * 0.0001);
      const rangeBuff = 1 + (rangeLvl * 0.0001);
      const fireRateBuff = 1 - (fireRateLvl * 0.0001);

      // Final Calculations
      const rawDamage = (10 * basePower) + accountLevel;
      const finalDamage = rawDamage * powerBuff;

      // Speed: (150 + Base * 10) * AccountBuff (No SkillBuff)
      const rawSpeed = (150 + baseSpeed * 10);
      const finalSpeed = rawSpeed * accountMult;

      // HP
      const rawHp = (baseHp) * 100; // If baseHp is stamina (1-10). If it's 2100, careful.
      // GameScene logic says: baseHp = heroStats.hp || (heroStats.stamina * 100).
      // Mock data has 'hp: 100' or 'hp: 2100'? Let's trust the value in `hero.stats.hp`.
      // If it's small (<100), treat as stamina.
      let effectiveBaseHp = baseHp;
      if (baseHp < 50) effectiveBaseHp = baseHp * 100;
      const finalHp = effectiveBaseHp * accountMult; // HP doesn't have a Skill Bar in the 4 listed (Speed, FR, Range, Power)

      // Range
      // Strict NFT Stat * Skill Buff
      const finalRange = (baseRange || 1) * rangeBuff;

      // Fire Rate
      // Base is usually 600ms.
      const baseFireRate = 600;
      const finalFireRate = Math.max(100, baseFireRate * fireRateBuff); // Cap at 100ms

      return {
          damage: finalDamage,
          speed: finalSpeed,
          hp: finalHp,
          range: finalRange,
          fireRate: finalFireRate,

          // Return levels for UI
          levels: {
              speed: speedLvl,
              power: powerLvl,
              range: rangeLvl,
              fireRate: fireRateLvl
          },
          ascension: {
              current: hero.ascensionLevel || 0,
              maxSkillLevel: BASE_SKILL_CAP_LEVEL + ((hero.ascensionLevel || 0) * ASCENSION_BONUS_LEVEL)
          }
      };
  }

  // --- ACTIONS ---

  // New: Economic Boost
  getBoostCost() {
      const usage = this.state.user.dailyBoostUsage || 0;
      // Formula: 1.00 * (1.30 ^ usage)
      const cost = 1.00 * Math.pow(1.30, usage);
      return parseFloat(cost.toFixed(2));
  }

  isBoostActive() {
      return Date.now() < this.xpBoostActiveUntil;
  }

  getXpBoostMultiplier() {
      return this.isBoostActive() ? 2.0 : 1.0;
  }

  // Task Force: Auto-Attack Monetization
  async purchaseAutoFire() {
      const cost = 1;
      if (this.state.user.bcoin < cost) {
          return { success: false, message: 'Need 1 BCOIN for Auto-Fire.' };
      }

      this.state.user.bcoin -= cost;
      this.state.user.totalSpent = (this.state.user.totalSpent || 0) + cost;
      this.saveLocalState();

      return { success: true, remaining: this.state.user.bcoin };
  }

  async buyXpBoost() {
      const cost = this.getBoostCost();
      if (this.state.user.bcoin < cost) {
          return { success: false, message: `Need ${cost} BCOIN` };
      }

      // Deduct
      this.state.user.bcoin -= cost;
      this.state.user.totalSpent = (this.state.user.totalSpent || 0) + cost;

      // Increment Usage
      this.state.user.dailyBoostUsage = (this.state.user.dailyBoostUsage || 0) + 1;

      // Set Timer (10 Minutes)
      // If already active, extend? Or just reset to 10m from now?
      // User said "10 Minutes". Let's stack if active? Usually "refresh" is safer.
      const duration = 10 * 60 * 1000;
      const now = Date.now();
      if (this.xpBoostActiveUntil > now) {
          this.xpBoostActiveUntil += duration;
      } else {
          this.xpBoostActiveUntil = now + duration;
      }

      this.saveLocalState();

      return {
          success: true,
          message: 'XP Boost Activated!',
          newBalance: this.state.user.bcoin,
          cost: cost,
          activeUntil: this.xpBoostActiveUntil
      };
  }

  // New: Manual Training Persistence (Handbrake Edition)
  async applySessionTraining(heroId, sessionData) {
      const hero = this.state.heroes.find(h => h.id === heroId);
      if (!hero) return { success: false };

      if (!hero.skills) hero.skills = { speed: 0, fireRate: 0, range: 0, power: 0 };

      const mult = this.getXpBoostMultiplier();
      const XP_PER_LEVEL = 100;

      // Helper to cap XP
      const cappedAdd = (stat, amount) => {
          const xp = hero.skills[stat] || 0;
          const lvl = hero.skills[`${stat}_level`] !== undefined ? hero.skills[`${stat}_level`] : Math.floor(xp / XP_PER_LEVEL);
          const cap = (lvl + 1) * XP_PER_LEVEL;

          // Add XP but clamp to next level cap
          hero.skills[stat] = Math.min(xp + (amount * mult), cap);

          // Ensure level property exists for consistency
          if (hero.skills[`${stat}_level`] === undefined) hero.skills[`${stat}_level`] = lvl;
      };

      // Task Force: Ignore Speed (Handbrake)
      // if (sessionData.speed) ...

      if (sessionData.power) cappedAdd('power', sessionData.power);
      if (sessionData.range) cappedAdd('range', sessionData.range);
      if (sessionData.fireRate) cappedAdd('fireRate', sessionData.fireRate);

      this.saveLocalState();

      // Sync to Cloud if not guest
      if (!this.isGuest) {
          try {
              // TODO: Create endpoint for batch skill update
              // axios.post('/api/heroes/skills/update', { heroId, skills: hero.skills });
          } catch (e) { console.error(e); }
      }

      return { success: true, hero };
  }

  async claimDailyFaucet() {
      const now = Date.now();
      const lastClaim = this.state.user.lastFaucetClaim || 0;
      const cooldown = 24 * 60 * 60 * 1000; // 24 Hours

      if (now - lastClaim < cooldown) {
          const diff = cooldown - (now - lastClaim);
          const hours = Math.floor(diff / (60 * 60 * 1000));
          const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
          return { success: false, message: `Wait ${hours}h ${minutes}m` };
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

      const mult = this.getXpBoostMultiplier();
      const finalXp = Math.floor(xp * mult);

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
      const levelResult = this.addAccountXp(finalXp);

      this.saveLocalState();
      console.log('[PlayerState] Match Recorded:', { ...result, xp: finalXp });

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

  // Task Force: Tibia-style Death Penalty
  applyDeathPenalty(heroId) {
      const PENALTY_PCT = 0.05; // 5% Loss

      // 1. Account XP Loss
      const currentXp = this.state.user.accountXp || 0;
      const xpLoss = Math.floor(currentXp * PENALTY_PCT);
      this.state.user.accountXp = Math.max(0, currentXp - xpLoss);

      // 2. Hero Skill XP Loss
      const hero = this.state.heroes.find(h => h.id === heroId);
      let skillsLost = {};

      if (hero && hero.skills) {
          ['speed', 'power', 'range', 'fireRate'].forEach(stat => {
              const val = hero.skills[stat] || 0;
              const loss = Math.floor(val * PENALTY_PCT);
              hero.skills[stat] = Math.max(0, val - loss);
              skillsLost[stat] = loss;
          });
      }

      console.log(`[PlayerState] Death Penalty Applied: -${xpLoss} Account XP`, skillsLost);
      this.saveLocalState();

      return {
          success: true,
          xpLost: xpLoss,
          skillsLost
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

  /**
   * Upgrades a specific skill by adding XP equivalent to 1 Level (0.01% stat boost).
   * @param {string} heroId
   * @param {string} skillType - 'power', 'speed', 'range', 'fireRate'
   */
  async upgradeHeroSkill(heroId, skillType) {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (!hero) return { success: false, message: 'Hero not found' };

    const validSkills = ['power', 'speed', 'range', 'fireRate'];
    if (!validSkills.includes(skillType)) return { success: false, message: 'Invalid Skill' };

    // Task Force: Speed is Auto (Account Level)
    if (skillType === 'speed') return { success: false, message: 'Speed scales with Summoner Level.' };

    const XP_PER_LEVEL = 100;
    const skills = hero.skills || {};

    // Get Current Level State
    const currentLvl = skills[`${skillType}_level`] !== undefined ? skills[`${skillType}_level`] : Math.floor((skills[skillType] || 0) / XP_PER_LEVEL);
    const currentXp = skills[skillType] || 0;

    // Check Cap (Ascension)
    const ascension = hero.ascensionLevel || 0;
    const maxLevel = BASE_SKILL_CAP_LEVEL + (ascension * ASCENSION_BONUS_LEVEL);

    if (currentLvl >= maxLevel) {
        return { success: false, message: `Max Level ${maxLevel} Reached. Ascend!` };
    }

    // Check Handbrake: XP must be full (next level cap)
    const reqXp = (currentLvl + 1) * XP_PER_LEVEL;
    if (currentXp < reqXp) {
        return { success: false, message: `Train more! ${Math.floor((currentXp/reqXp)*100)}% Complete.` };
    }

    // Cost
    const bcoinCost = 1;
    if (this.state.user.bcoin < bcoinCost) {
      return { success: false, message: 'Need 1 BCOIN to Unlock Level.' };
    }

    // Execute Unlock
    this.state.user.bcoin -= bcoinCost;
    this.state.user.totalSpent = (this.state.user.totalSpent || 0) + bcoinCost;

    // Increment Level
    hero.skills[`${skillType}_level`] = currentLvl + 1;

    // Ensure XP matches (optional, but clean)
    // hero.skills[skillType] = reqXp;

    this.saveLocalState();

    return {
      success: true,
      hero,
      newSkillLevel: hero.skills[`${skillType}_level`],
      remainingBcoin: this.state.user.bcoin
    };
  }

  async ascendHero(heroId) {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (!hero) return { success: false, message: 'Hero not found' };

    const ascension = hero.ascensionLevel || 0;

    // 1. Check Soft Cap (Sum of Skills)
    const currentMaxPerSkill = BASE_SKILL_CAP_LEVEL + (ascension * ASCENSION_BONUS_LEVEL);
    const totalCap = currentMaxPerSkill * 4; // 4 Skills

    // Calculate Total Hero Skill Levels
    const s = hero.skills || {};
    const totalLevels = Math.floor((s.speed||0)/XP_PER_LEVEL) +
                        Math.floor((s.power||0)/XP_PER_LEVEL) +
                        Math.floor((s.range||0)/XP_PER_LEVEL) +
                        Math.floor((s.fireRate||0)/XP_PER_LEVEL);

    if (totalLevels < totalCap) {
        return { success: false, message: `Maximize all skills to Ascend. (${totalLevels}/${totalCap})` };
    }

    // 2. Costs
    // Boss Core
    // Check inventory. Assume 'boss_core' is the type.
    // NOTE: Inventory items structure: { type: 'boss_core', quantity: 1, ... } or { type: 'material', name: 'Boss Core' ... }
    // Based on `_mapItemFromDB`, itemDef has type/name/rarity.
    // In `addSessionLoot`, we use `item.type`.
    // Let's assume consistent use of `boss_core` as type or specific logic.
    const coreItem = this.state.inventory.find(i => i.type === 'boss_core' || (i.name === 'Boss Core'));
    if (!coreItem || coreItem.quantity < 1) {
        return { success: false, message: 'Missing Boss Core.' };
    }

    // BCOIN: 100 * (AscensionLevel + 1)
    const bcoinCost = 100 * (ascension + 1);
    if (this.state.user.bcoin < bcoinCost) {
         return { success: false, message: `Need ${bcoinCost} BCOIN.` };
    }

    // 3. Apply
    coreItem.quantity -= 1;
    if (coreItem.quantity <= 0) {
        // Remove item from inventory logic if needed, or keep 0.
        this.state.inventory = this.state.inventory.filter(i => i !== coreItem);
    }

    this.state.user.bcoin -= bcoinCost;
    this.state.user.totalSpent = (this.state.user.totalSpent || 0) + bcoinCost;

    hero.ascensionLevel = ascension + 1;

    this.saveLocalState();

    // Sync Cloud if needed (Stub)

    return { success: true, hero, newAscensionLevel: hero.ascensionLevel };
  }

  // Legacy Level Up (Deprecated for Stats, kept for compatibility if needed)
  async upgradeHeroLevel(heroId) {
     return { success: false, message: 'Use Skill Training instead.' };
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
