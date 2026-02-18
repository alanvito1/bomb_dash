let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Normalize URL: Ensure no trailing slash before appending /api logic
if (API_BASE_URL.endsWith('/')) {
  API_BASE_URL = API_BASE_URL.slice(0, -1);
}

// Ensure it ends with /api
if (!API_BASE_URL.endsWith('/api')) {
  API_BASE_URL += '/api';
}

import heroStakingAbi from '../../backend/contracts/HeroStaking.json';
import mockHeroNFTAbi from '../../backend/contracts/MockHeroNFT.json';
import bcoinAbi from '../../backend/contracts/IBEP20.json';
import tournamentControllerAbi from '../../backend/contracts/TournamentController.json';
import wagerArenaAbi from '../../backend/contracts/WagerArena.json';
import perpetualRewardPoolAbi from '../../backend/contracts/PerpetualRewardPool.json';

/**
 * @class ContractProvider
 * @description A singleton service that fetches, stores, and provides smart contract
 * addresses and ABIs. It acts as a single source of truth for on-chain contract
 * information, ensuring the application uses the correct, deployed contract versions.
 */
class ContractProvider {
  /**
   * @constructor
   */
  constructor() {
    /**
     * Stores the fetched contract addresses, mapped by a simplified name.
     * @type {object | null}
     */
    this.addresses = null;
    /**
     * A centralized map of all contract ABIs, imported from their JSON artifacts.
     * @type {object}
     */
    this.abis = {
      wagerArena: wagerArenaAbi.abi,
      heroStaking: heroStakingAbi.abi,
      mockHeroNFT: mockHeroNFTAbi.abi,
      bcoin: bcoinAbi,
      tournamentController: tournamentControllerAbi.abi,
      perpetualRewardPool: perpetualRewardPoolAbi.abi,
    };
    /**
     * A flag to track whether the provider has successfully fetched addresses.
     * @type {boolean}
     */
    this.initialized = false;
  }

  /**
   * Initializes the provider by fetching contract addresses from the backend API.
   * This method must be called successfully at application startup.
   * @returns {Promise<void>} A promise that resolves on successful initialization.
   * @throws {Error} Throws an error if the API call fails.
   */
  async initialize() {
    if (this.initialized) {
      console.log('ContractProvider already initialized.');
      return;
    }

    try {
      console.log(
        'Initializing ContractProvider: fetching contract addresses...'
      );
      const response = await fetch(`${API_BASE_URL}/contracts`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch contract addresses: ${response.statusText}`
        );
      }
      const data = await response.json();

      if (data.success) {
        this.addresses = {
          wagerArena: data.wagerArenaAddress,
          heroStaking: data.heroStakingAddress,
          mockHeroNFT: data.mockHeroNFTAddress,
          bcoin: data.bcoinTokenAddress,
          tournamentController: data.tournamentControllerAddress,
          perpetualRewardPool: data.perpetualRewardPoolAddress,
        };
        this.initialized = true;
        console.log(
          'ContractProvider initialized successfully with addresses:',
          this.addresses
        );
      } else {
        throw new Error(data.message || 'Failed to fetch contract addresses.');
      }
    } catch (error) {
      console.error('CRITICAL: Failed to initialize ContractProvider.', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Checks if the provider has been successfully initialized.
   * @returns {boolean} True if addresses have been fetched, otherwise false.
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Gets the address for a specific contract by name.
   * @param {string} name - The simplified name of the contract (e.g., 'bcoin').
   * @returns {string} The contract's blockchain address.
   * @throws {Error} Throws an error if the provider is not initialized or the name is not found.
   */
  getAddress(name) {
    if (!this.initialized)
      throw new Error('ContractProvider not initialized. Cannot get address.');
    if (!this.addresses[name])
      throw new Error(`Address for contract '${name}' not found.`);
    return this.addresses[name];
  }

  /**
   * Gets the ABI for a specific contract by name.
   * @param {string} name - The simplified name of the contract (e.g., 'bcoin').
   * @returns {Array<any>} The contract's Application Binary Interface (ABI).
   * @throws {Error} Throws an error if the provider is not initialized or the name is not found.
   */
  getAbi(name) {
    if (!this.initialized)
      throw new Error('ContractProvider not initialized. Cannot get ABI.');
    if (!this.abis[name])
      throw new Error(`ABI for contract '${name}' not found.`);
    return this.abis[name];
  }

  /**
   * Gets both the address and ABI for a specific contract.
   * @param {string} name - The simplified name of the contract (e.g., 'bcoin').
   * @returns {{address: string, abi: Array<any>}} An object containing the address and ABI.
   * @throws {Error} Throws an error if the provider is not initialized.
   */
  getContract(name) {
    if (!this.initialized) throw new Error('ContractProvider not initialized.');
    const address = this.getAddress(name);
    const abi = this.getAbi(name);
    return { address, abi };
  }
}

const contractProvider = new ContractProvider();
export default contractProvider;
