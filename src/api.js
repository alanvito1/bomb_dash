import { SiweMessage } from 'siwe';
import * as contracts from './config/contracts.js';

let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Normalize URL: Ensure no trailing slash before appending /api logic
if (API_BASE_URL.endsWith('/')) {
  API_BASE_URL = API_BASE_URL.slice(0, -1);
}

// Ensure it ends with /api
if (!API_BASE_URL.endsWith('/api')) {
  API_BASE_URL += '/api';
}

console.log('🔗 API URL:', API_BASE_URL);

/**
 * @class ApiClient
 * @description Centralizes all client-server communication, handling API requests,
 * authentication, and JWT management.
 */
class ApiClient {
  /**
   * @constructor
   * @description Initializes the ApiClient and retrieves the JWT from localStorage.
   */
  constructor() {
    this.jwtToken = localStorage.getItem('jwtToken');
  }

  /**
   * Sets the JWT and stores it in localStorage.
   * @param {string | null} token - The JWT. If null, the token is removed.
   */
  setJwtToken(token) {
    this.jwtToken = token;
    if (token) {
      localStorage.setItem('jwtToken', token);
    } else {
      localStorage.removeItem('jwtToken');
    }
  }

  /**
   * Performs a generic fetch request to the backend API.
   * It automatically includes the JWT for authenticated requests.
   * @param {string} endpoint - The API endpoint (e.g., '/auth/me').
   * @param {object} options - Standard fetch options (method, body, etc.).
   * @param {boolean} [requiresAuth=true] - Whether the request requires JWT authentication.
   * @returns {Promise<any>} A promise that resolves with the JSON response from the API.
   * @throws {Error} Throws an error if the network request fails or the API returns a non-OK status.
   */
  async fetch(endpoint, options = {}, requiresAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (requiresAuth && this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    console.groupCollapsed(`🌐 API Request: ${endpoint}`);
    console.log(`URL: ${url}`);
    console.log(`Method: ${options.method || 'GET'}`);
    if (options.body) console.log('Body:', JSON.parse(options.body));
    console.log('Headers:', headers);
    console.groupEnd();

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.groupCollapsed(`✅ API Response: ${endpoint} (${response.status})`);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        console.error('❌ Error Data:', errorData);
        console.groupEnd();
        throw new Error(errorData.message || 'API request failed');
      }

      if (response.status === 204) {
        console.log('No Content (204)');
        console.groupEnd();
        return null;
      }

      const data = await response.json();
      console.log('Data:', data);
      console.groupEnd();
      return data;
    } catch (error) {
      console.error(`🔥 API Failure: ${endpoint}`, error);
      throw error;
    }
  }

  // --- Authentication Methods ---

  /**
   * Handles the entire Sign-In with Ethereum (SIWE) authentication flow using a specific signer.
   * This allows using any signer (MetaMask, Burner Wallet, etc.) to login.
   * @param {object} signer - The ethers.js signer instance.
   * @param {string} address - The wallet address.
   * @param {number|string} chainId - The chain ID.
   * @returns {Promise<object>} A promise that resolves with the verification data, including the JWT.
   */
  async loginWithSigner(signer, address, chainId) {
    try {
      const { nonce } = await this.fetch('/auth/nonce', {}, false);

      if (!nonce || typeof nonce !== 'string' || nonce.length < 8) {
        throw new Error(`Invalid nonce received from server: ${nonce}`);
      }

      const siweMessage = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Bomb Dash Web3 to continue.',
        uri: window.location.origin,
        version: '1',
        chainId: Number(chainId),
        nonce: nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });

      const messageToSign = siweMessage.prepareMessage();
      const signature = await signer.signMessage(messageToSign);

      const verifyData = await this.fetch(
        '/auth/verify',
        {
          method: 'POST',
          body: JSON.stringify({ message: messageToSign, signature }),
        },
        false
      );

      if (verifyData.success && verifyData.token) {
        this.setJwtToken(verifyData.token);
        console.log('SIWE Login successful!');
        return verifyData;
      } else {
        throw new Error(
          verifyData.message || 'SIWE server-side verification failed.'
        );
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Wrapper for web3Login using the browser's Ethereum provider (e.g., MetaMask).
   */
  async web3Login() {
    if (!window.ethereum) throw new Error('MetaMask not detected.');

    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const chainId = (await provider.getNetwork()).chainId;

      return this.loginWithSigner(signer, address, chainId);
    } catch (error) {
      console.error('Web3 Login failed:', error);
      throw error;
    }
  }

  /**
   * Checks if a user session exists (either JWT or Guest mode).
   * @returns {boolean} True if a session exists.
   */
  hasSession() {
    return !!(this.jwtToken || localStorage.getItem('guest_pk'));
  }

  /**
   * Checks the validity of the current JWT with the backend.
   * @returns {Promise<object>} A promise that resolves with user data if the token is valid.
   * @throws {Error} Throws an error if no token is found or if the token is invalid.
   */
  async checkLoginStatus() {
    if (!this.jwtToken) {
      throw new Error('No token found in storage.');
    }
    try {
      const data = await this.fetch('/auth/me');
      if (!data.success) {
        throw new Error(data.message || 'Token validation failed on server.');
      }
      return data;
    } catch (error) {
      console.error('Session check failed:', error.message);
      this.setJwtToken(null);
      throw error;
    }
  }

  /**
   * Logs the user out by clearing the JWT from memory and localStorage.
   */
  logout() {
    this.setJwtToken(null);
  }

  // --- Game API Methods ---

  /**
   * Fetches the list of heroes for the currently authenticated user.
   * @returns {Promise<Array<object>>} A promise that resolves with an array of hero objects.
   */
  async getHeroes() {
    return this.fetch('/heroes');
  }

  /**
   * @deprecated Use `updateUserStats` instead for on-chain verification.
   * @param {number|string} heroId - The ID of the hero.
   * @param {string} upgradeType - The type of upgrade.
   * @param {number} cost - The cost of the upgrade.
   * @returns {Promise<any>} A promise that resolves with the API response.
   */
  async purchaseHeroUpgrade(heroId, upgradeType, cost) {
    console.warn(
      '`purchaseHeroUpgrade` is deprecated and will be removed. Use `updateUserStats` instead.'
    );
    return this.fetch(`/heroes/${heroId}/purchase-upgrade`, {
      method: 'POST',
      body: JSON.stringify({ upgradeType, cost }),
    });
  }

  /**
   * Notifies the backend to verify an on-chain upgrade transaction and update hero stats accordingly.
   * @param {number|string} heroId - The ID of the hero that was upgraded.
   * @param {string} upgradeType - The type of stat that was upgraded (e.g., 'damage').
   * @param {string} txHash - The transaction hash of the on-chain payment.
   * @returns {Promise<any>} A promise that resolves with the backend's response.
   */
  async updateUserStats(heroId, upgradeType, txHash) {
    const body = {
      heroId: parseInt(heroId, 10),
      upgradeType,
      txHash,
    };
    return this.fetch(
      '/user/stats',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      true
    );
  }

  /**
   * Handles the full hero level-up process, including on-chain payment and backend verification.
   * @param {number|string} heroId - The ID of the hero to level up.
   * @returns {Promise<any>} A promise that resolves with the backend's response after verification.
   * @throws {Error} Throws an error if the wallet is not detected or if the transaction fails.
   */
  async levelUpHero(heroId) {
    if (!window.ethereum) throw new Error('MetaMask not detected.');

    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const playerAddress = await signer.getAddress();

      const { address, abi } = contracts.default.tournamentController;
      const contract = new ethers.Contract(address, abi(), signer);

      console.log(`Sending level up transaction for hero ${heroId}...`);
      const tx = await contract.payLevelUpFee(playerAddress, {
        gasLimit: 300000,
      });

      console.log(
        `Transaction sent! Waiting for confirmation... Hash: ${tx.hash}`
      );
      const receipt = await tx.wait();
      console.log('Transaction confirmed!', receipt);

      if (receipt.status !== 1) {
        throw new Error('The on-chain transaction failed.');
      }

      return this.fetch(`/heroes/${heroId}/level-up`, {
        method: 'POST',
        body: JSON.stringify({ txHash: tx.hash }),
      });
    } catch (error) {
      console.error('Hero level-up process failed:', error);
      throw new Error(
        error.reason ||
          error.message ||
          'An unknown error occurred during the level-up process.'
      );
    }
  }

  /**
   * Enters the user into a wager match queue for a specific tier.
   * @param {number|string} tierId - The ID of the wager tier to join.
   * @returns {Promise<any>} A promise that resolves with the API response.
   */
  async enterWagerMatch(tierId) {
    return this.fetch('/pvp/wager/enter', {
      method: 'POST',
      body: JSON.stringify({ tierId }),
    });
  }

  /**
   * Fetches the player ranking leaderboard.
   * @returns {Promise<Array<object>>} A promise that resolves with the ranking data.
   */
  async getRanking() {
    try {
      const data = await this.fetch('/ranking');
      if (!data.success) throw new Error(data.message || 'Ranking fetch failed');
      return data.ranking;
    } catch (error) {
      console.warn('⚠️ API Error: getRanking failed. Using Mock Data.', error);
      return [{ name: 'Jules', score: 9999 }];
    }
  }

  /**
   * Fetches the latest news.
   * @returns {Promise<Array<object>>} A promise that resolves with the news data.
   */
  async getNews() {
    try {
      const data = await this.fetch('/news');
      if (!data.success) throw new Error(data.message || 'News fetch failed');
      return data.news;
    } catch (error) {
      console.warn('⚠️ API Error: getNews failed. Using Mock Data.', error);
      return [{ title: 'Alpha Test', content: 'Systems Online' }];
    }
  }

  /**
   * Saves the player's highest wave reached in a game session.
   * @param {number} waveNumber - The wave number to save.
   * @returns {Promise<any>} A promise that resolves with the API response.
   */
  async saveCheckpoint(waveNumber) {
    return this.fetch('/game/checkpoint', {
      method: 'POST',
      body: JSON.stringify({ waveNumber }),
    });
  }

  /**
   * Fetches the profile of the currently authenticated user.
   * @returns {Promise<object>} A promise that resolves with the user's data.
   */
  async getCurrentUser() {
    return this.fetch('/auth/me');
  }

  /**
   * Fetches the NFT assets owned by the current user.
   * @returns {Promise<Array<object>>} A promise that resolves with an array of NFT objects.
   */
  async getOwnedNfts() {
    return this.fetch('/user/nfts');
  }

  /**
   * Initiates a generic user level-up request.
   * @returns {Promise<any>} A promise that resolves with the API response.
   */
  async levelUp() {
    return this.fetch('/user/level-up', {
      method: 'POST',
    });
  }

  // --- Social Methods ---

  /**
   * Creates a new guild.
   * @param {string} name - Guild Name
   * @param {string} tag - Guild Tag (3-4 chars)
   */
  async createGuild(name, tag) {
    return this.fetch('/social/create-guild', {
      method: 'POST',
      body: JSON.stringify({ name, tag }),
    });
  }

  /**
   * Joins an existing guild.
   * @param {number} guildId - Guild ID
   */
  async joinGuild(guildId) {
    return this.fetch('/social/join-guild', {
      method: 'POST',
      body: JSON.stringify({ guildId }),
    });
  }

  /**
   * Lists all guilds.
   */
  async getGuilds() {
    try {
      const data = await this.fetch('/social/guilds');
      if (!data.success) throw new Error(data.message);
      return data.guilds;
    } catch (e) {
      console.warn('⚠️ Backend offline. Using Frontend Mock for Guilds.');
      return []; // Return empty list to prevent crash
    }
  }

  /**
   * Gets the current user's guild info.
   */
  async getMyGuild() {
    try {
      return await this.fetch('/social/my-guild');
    } catch (e) {
      console.warn('⚠️ Backend offline. Using Frontend Mock for My Guild.');
      return { success: true, guild: null };
    }
  }

  // --- Economy Methods ---

  /**
   * Gets user inventory.
   */
  async getInventory() {
    try {
      return await this.fetch('/economy/inventory');
    } catch (e) {
      console.warn('⚠️ Backend offline. Using Frontend Mock for Inventory.');
      return { success: true, items: [] };
    }
  }

  /**
   * Crafts an item by fusing two existing items.
   * @param {number} item1Id - UserItem ID 1
   * @param {number} item2Id - UserItem ID 2
   */
  async craftItem(item1Id, item2Id) {
    return this.fetch('/economy/craft', {
      method: 'POST',
      body: JSON.stringify({ item1Id, item2Id }),
    });
  }

  /**
   * Gets the global reward pool amount.
   */
  async getRewardPool() {
    try {
      return await this.fetch('/economy/reward-pool');
    } catch (e) {
      console.warn('⚠️ Backend offline. Using Frontend Mock for Reward Pool.');
      return { success: true, pool: 500000 };
    }
  }

  // --- Admin Methods ---

  /**
   * Fetches game settings, requiring an admin secret.
   * @param {string} adminSecret - The secret key for accessing admin endpoints.
   * @returns {Promise<object>} A promise that resolves with the game settings.
   */
  async getGameSettings(adminSecret) {
    return this.fetch('/admin/settings', {
      headers: { 'X-Admin-Secret': adminSecret },
    });
  }

  // --- Game Status Methods ---

  /**
   * Fetches the current status of the PvP mode (enabled/disabled) and time until the next change.
   * @returns {Promise<{pvpEnabled: boolean, nextChangeIn: number}>} A promise that resolves with the PvP status.
   */
  async getPvpStatus() {
    return this.fetch('/game/pvp-status', {}, false);
  }

  /**
   * Fetches the list of currently active global buffs.
   * @returns {Promise<Array<object>>} A promise that resolves with an array of buff objects.
   */
  async getGlobalBuffs() {
    return this.fetch('/game/global-buffs', {}, false);
  }

  /**
   * Saves a collection of player statistics to the backend.
   * @param {object} stats - An object containing player stats to be saved.
   * @returns {Promise<any>} A promise that resolves with the API response.
   */
  async savePlayerStats(stats) {
    return this.fetch('/user/stats', {
      method: 'POST',
      body: JSON.stringify({ stats }),
    });
  }

  /**
   * Fetches the bestiary data for the current user.
   * @returns {Promise<object>} A promise that resolves with the bestiary data.
   */
  async getBestiary() {
    try {
      return await this.fetch('/game/bestiary');
    } catch (e) {
      console.warn('⚠️ Backend offline. Using Frontend Mock for Bestiary.');
      return { success: true, bestiary: {} };
    }
  }

  // --- Matchmaking Methods ---

  /**
   * Joins the matchmaking queue with a specific hero.
   * @param {number|string} heroId - The ID of the hero to join the queue with.
   * @returns {Promise<any>} A promise that resolves with the API response.
   */
  async joinMatchmakingQueue(heroId) {
    return this.fetch('/matchmaking/join', {
      method: 'POST',
      body: JSON.stringify({ heroId }),
    });
  }

  /**
   * Leaves the matchmaking queue.
   * @returns {Promise<any>} A promise that resolves with the API response.
   */
  async leaveMatchmakingQueue() {
    return this.fetch('/matchmaking/leave', {
      method: 'POST',
    });
  }

  /**
   * Fetches the user's current matchmaking status.
   * @returns {Promise<any>} A promise that resolves with the matchmaking status.
   */
  async getMatchmakingStatus() {
    return this.fetch('/pvp/queue/status');
  }

  /**
   * Mints a test hero for the authenticated user (Testnet only).
   * @param {string} [rarity] - Forced rarity (optional).
   * @returns {Promise<any>} Response with the minted hero.
   */
  async mintTestHero(rarity) {
    return this.fetch('/testnet/mint-hero', {
      method: 'POST',
      body: JSON.stringify({ forcedRarity: rarity }),
    });
  }

  /**
   * Mints test BCOIN for the authenticated user (Testnet only).
   * @returns {Promise<any>} Response with amount.
   */
  async mintTestBcoin() {
    return this.fetch('/testnet/mint-bcoin', { method: 'POST' });
  }

  /**
   * Reports the completion of a match to the backend, including XP gained.
   * @param {number} heroId - The ID of the hero used in the match.
   * @param {number} xpGained - The amount of XP (score) gained.
   * @param {number} coinsCollected - The amount of coins collected (Session Loot).
   * @param {object} bestiary - The session bestiary updates { enemyType: count }.
   * @param {object} proficiency - The session proficiency updates { bombHits: number, distance: number }.
   * @param {Array<string>} droppedItems - List of item names dropped in session (Client-Side Loot).
   * @returns {Promise<any>} A promise that resolves with the backend's response.
   */
  async completeMatch(heroId, xpGained, coinsCollected = 0, bestiary = {}, proficiency = {}, droppedItems = []) {
    return this.fetch('/game/matches/complete', {
      method: 'POST',
      body: JSON.stringify({ heroId, xpGained, coinsCollected, bestiary, proficiency, droppedItems }),
    });
  }

  // --- Solo Reward Methods ---

  /**
   * Logs that the user has completed a solo game, making them eligible for rewards.
   * @returns {Promise<any>} A promise that resolves with the backend's response.
   */
  async logSoloGameCompleted() {
    return this.fetch('/solo/game-completed', {
      method: 'POST',
    });
  }

  /**
   * Requests a signature from the backend oracle to claim accumulated solo game rewards.
   * @returns {Promise<{signature: string, gamesPlayed: number, nonce: number}>} A promise that resolves with the signature and associated claim data.
   */
  async getSoloRewardClaimSignature() {
    return this.fetch('/solo/claim-reward', {
      method: 'POST',
    });
  }

  // --- Hero Staking Methods ---

  /**
   * Requests a signature from the backend oracle to authorize withdrawing a staked hero NFT.
   * The signature contains the hero's current off-chain progress (level and XP).
   * @param {number|string} heroId - The ID of the hero to withdraw.
   * @returns {Promise<{success: boolean, tokenId: number, level: number, xp: number, signature: string}>} A promise that resolves with the signature and hero data.
   */
  async initiateHeroWithdrawal(heroId) {
    return this.fetch(`/heroes/${heroId}/initiate-withdrawal`, {
      method: 'POST',
    });
  }
}

const api = new ApiClient();
export default api;
