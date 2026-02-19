import {
  MOCK_USER,
  MOCK_HEROES,
  MOCK_INVENTORY,
  MOCK_REWARD_POOL,
  MOCK_RANKING,
  MOCK_GUILDS,
  MOCK_PVP_STATUS,
  MOCK_GLOBAL_BUFFS,
  MOCK_NEWS,
  MOCK_BESTIARY
} from './config/MockData.js';

import playerStateService from './services/PlayerStateService.js';

console.log('⚠️ OFFLINE MODE: API is running in full mock mode with Local State.');

class ApiClient {
  constructor() {
    this.jwtToken = localStorage.getItem('jwtToken') || 'mock-token';
    this.mockDelay = 200; // Simulate slight network delay
  }

  setJwtToken(token) {
    this.jwtToken = token;
    if (token) {
      localStorage.setItem('jwtToken', token);
    } else {
      localStorage.removeItem('jwtToken');
    }
  }

  async _mockResponse(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(data);
      }, this.mockDelay);
    });
  }

  // Generic fetch wrapper for legacy calls
  async fetch(endpoint, options = {}, requiresAuth = true) {
      console.log(`[MockAPI] Generic fetch intercepted: ${endpoint}`);
      if (endpoint === '/auth/me') return this.getCurrentUser();
      if (endpoint === '/heroes') return this.getHeroes();
      if (endpoint.includes('/economy/inventory')) return this.getInventory();
      // Add other fallbacks if needed
      return this._mockResponse({ success: true, mocked: true });
  }

  // --- Authentication ---

  async loginWithSigner(signer, address, chainId) {
    console.log('[MockAPI] Login with signer:', address);
    this.setJwtToken('mock-jwt-token');
    return this._mockResponse({ success: true, token: 'mock-jwt-token', user: playerStateService.getUser() });
  }

  async web3Login() {
    console.log('[MockAPI] Web3 Login requested. simulating success.');
    this.setJwtToken('mock-jwt-token');
    return this._mockResponse({ success: true, token: 'mock-jwt-token', user: playerStateService.getUser() });
  }

  hasSession() {
    return !!this.jwtToken;
  }

  async checkLoginStatus() {
    if (!this.jwtToken) throw new Error('No token');
    return this._mockResponse({ success: true, user: playerStateService.getUser() });
  }

  logout() {
    this.setJwtToken(null);
  }

  // --- Game Data ---

  async getHeroes() {
    return this._mockResponse({ success: true, heroes: playerStateService.getHeroes() });
  }

  async getHouses() {
    return this._mockResponse({ success: true, houses: playerStateService.getHouses() });
  }

  async getInventory() {
    return this._mockResponse({ success: true, inventory: MOCK_INVENTORY });
  }

  async getRewardPool() {
    return this._mockResponse({ success: true, pool: MOCK_REWARD_POOL });
  }

  async getRanking() {
    return this._mockResponse(MOCK_RANKING); // Return unwrapped array
  }

  async getNews() {
    return this._mockResponse(MOCK_NEWS); // Return unwrapped array
  }

  async getCurrentUser() {
    return this._mockResponse({ success: true, user: playerStateService.getUser() });
  }

  // --- Actions (Mocked) ---

  async craftItem(item1Id, item2Id) {
    console.log(`[MockAPI] Crafting items ${item1Id} + ${item2Id}`);
    return this._mockResponse({ success: true, result: 'success', message: 'Crafted successfully (Mock)' });
  }

  async purchaseHeroUpgrade(heroId, type, cost) {
    console.log(`[MockAPI] Upgrade hero ${heroId} ${type}`);
    // This is the legacy call. Redirecting to new service if applicable,
    // or keep mocked.
    // Since we want to use the new service, let's map it.
    try {
        const result = playerStateService.upgradeHeroStat(heroId);
        return this._mockResponse({ success: true, hero: result.hero });
    } catch (e) {
        return this._mockResponse({ success: false, message: e.message });
    }
  }

  async upgradeHeroStat(heroId) {
      try {
          const result = playerStateService.upgradeHeroStat(heroId);
          return this._mockResponse({ success: true, hero: result.hero, stat: result.statUpgraded });
      } catch (e) {
          return this._mockResponse({ success: false, message: e.message });
      }
  }

  async rerollHeroSpells(heroId) {
      try {
          const result = playerStateService.rerollHeroSpells(heroId);
          return this._mockResponse({ success: true, hero: result.hero, spells: result.newSpells });
      } catch (e) {
          return this._mockResponse({ success: false, message: e.message });
      }
  }

  async updateUserStats(heroId, upgradeType, txHash) {
     console.log(`[MockAPI] Update stats hero ${heroId}`);
     // Mapping to new service logic for consistency
     try {
        const result = playerStateService.upgradeHeroStat(heroId);
        return this._mockResponse({ success: true, hero: result.hero });
     } catch (e) {
         return this._mockResponse({ success: false, message: e.message });
     }
  }

  async levelUpHero(heroId) {
    console.log(`[MockAPI] Level up hero ${heroId}`);
    return this._mockResponse({ success: true });
  }

  async enterWagerMatch(tierId) {
    console.log(`[MockAPI] Enter wager ${tierId}`);
    return this._mockResponse({ success: true });
  }

  async saveCheckpoint(wave) {
      console.log(`[MockAPI] Checkpoint wave ${wave}`);
      return this._mockResponse({ success: true });
  }

  async getOwnedNfts() {
      return this._mockResponse({ success: true, nfts: [] });
  }

  async levelUp() {
      return this._mockResponse({ success: true });
  }

  // --- Social ---

  async createGuild(name, tag) {
    console.log(`[MockAPI] Create Guild ${name} [${tag}]`);
    return this._mockResponse({ success: true });
  }

  async joinGuild(guildId) {
    console.log(`[MockAPI] Join Guild ${guildId}`);
    return this._mockResponse({ success: true });
  }

  async getGuilds() {
    return this._mockResponse(MOCK_GUILDS); // Return unwrapped array
  }

  async getMyGuild() {
     // Return first guild as if user is in it, or null
     return this._mockResponse({ success: true, guild: MOCK_GUILDS[0] });
  }

  // --- Status ---

  async getPvpStatus() {
    return this._mockResponse(MOCK_PVP_STATUS);
  }

  async getGlobalBuffs() {
    return this._mockResponse(MOCK_GLOBAL_BUFFS);
  }

  async savePlayerStats(stats) {
      console.log('[MockAPI] Stats saved', stats);
      return this._mockResponse({ success: true });
  }

  async getBestiary() {
      return this._mockResponse({ success: true, bestiary: MOCK_BESTIARY });
  }

  async joinMatchmakingQueue(heroId) {
      return this._mockResponse({ success: true });
  }

  async leaveMatchmakingQueue() {
      return this._mockResponse({ success: true });
  }

  async getMatchmakingStatus() {
      return this._mockResponse({ status: 'idle' });
  }

  async completeMatch(heroId, xp, coins, bestiary, proficiency, drops) {
      console.log('[MockAPI] Match Complete', { heroId, xp, coins, drops });
      return this._mockResponse({ success: true });
  }

  async completeStage(heroId, stageId) {
      try {
          console.log(`[MockAPI] Complete Stage: Hero ${heroId}, Stage ${stageId}`);
          const result = playerStateService.completeStage(heroId, stageId);
          return this._mockResponse(result);
      } catch (e) {
          console.error('[MockAPI] completeStage error:', e);
          return this._mockResponse({ success: false, message: e.message });
      }
  }

  async logSoloGameCompleted() {
      return this._mockResponse({ success: true });
  }

  async getSoloRewardClaimSignature() {
      return this._mockResponse({ signature: '0xMockSig', gamesPlayed: 10, nonce: 1 });
  }

  async initiateHeroWithdrawal(heroId) {
      return this._mockResponse({ success: true, signature: '0xMockSig' });
  }

  // --- Testnet ---
  async mintTestHero() { return this._mockResponse({ success: true }); }
  async mintTestBcoin() { return this._mockResponse({ success: true }); }
}

const api = new ApiClient();
export default api;
