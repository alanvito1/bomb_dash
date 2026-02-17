import { SiweMessage } from 'siwe';
import * as contracts from './config/contracts.js';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'API request failed');
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  // --- Authentication Methods ---

  /**
   * Handles the entire Sign-In with Ethereum (SIWE) authentication flow.
   * 1. Connects to the user's wallet.
   * 2. Fetches a unique nonce from the backend.
   * 3. Prompts the user to sign a SIWE message.
   * 4. Sends the message and signature to the backend for verification.
   * 5. On success, stores the received JWT.
   * @returns {Promise<object>} A promise that resolves with the verification data, including the JWT.
   * @throws {Error} Throws an error if any step of the SIWE process fails.
   */
  async web3Login() {
    if (!window.ethereum) throw new Error('MetaMask not detected.');

    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const chainId = (await provider.getNetwork()).chainId;

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
    const data = await this.fetch('/ranking');
    return data.success ? data.ranking : [];
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
   * @returns {Promise<any>} A promise that resolves with the backend's response.
   */
  async completeMatch(heroId, xpGained) {
    return this.fetch('/matches/complete', {
      method: 'POST',
      body: JSON.stringify({ heroId, xpGained }),
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
