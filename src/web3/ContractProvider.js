const API_BASE_URL = 'http://localhost:3000/api';

// Import all ABIs directly into the provider.
// The paths are relative to this file's location (src/web3/).
import heroStakingAbi from '../../backend/contracts/HeroStaking.json';
import mockHeroNFTAbi from '../../backend/contracts/MockHeroNFT.json';
import bcoinAbi from '../../backend/contracts/IBEP20.json';
import tournamentControllerAbi from '../../backend/contracts/TournamentController.json';
import wagerArenaAbi from '../../backend/contracts/WagerArena.json';
import perpetualRewardPoolAbi from '../../backend/contracts/PerpetualRewardPool.json';

class ContractProvider {
    constructor() {
        this.addresses = null;
        // Centralize ABIs for easy access. Note that some are objects with an .abi property,
        // while others are the ABI array itself.
        this.abis = {
            wagerArena: wagerArenaAbi.abi,
            heroStaking: heroStakingAbi.abi,
            mockHeroNFT: mockHeroNFTAbi.abi,
            bcoin: bcoinAbi, // This ABI is an array, not an object.
            tournamentController: tournamentControllerAbi.abi,
            perpetualRewardPool: perpetualRewardPoolAbi.abi,
        };
        this.initialized = false;
    }

    /**
     * Fetches contract addresses from the backend. This must be called at game startup.
     */
    async initialize() {
        if (this.initialized) {
            console.log("ContractProvider already initialized.");
            return;
        }

        try {
            console.log("Initializing ContractProvider: fetching contract addresses...");
            const response = await fetch(`${API_BASE_URL}/contracts`);
            if (!response.ok) {
                throw new Error(`Failed to fetch contract addresses: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.success) {
                // Map backend address names to a cleaner, consistent key format.
                this.addresses = {
                    wagerArena: data.wagerArenaAddress,
                    heroStaking: data.heroStakingAddress,
                    mockHeroNFT: data.mockHeroNFTAddress,
                    bcoin: data.bcoinTokenAddress,
                    tournamentController: data.tournamentControllerAddress,
                    perpetualRewardPool: data.perpetualRewardPoolAddress,
                };
                this.initialized = true;
                console.log("ContractProvider initialized successfully with addresses:", this.addresses);
            } else {
                throw new Error(data.message || 'Failed to fetch contract addresses.');
            }
        } catch (error) {
            console.error("CRITICAL: Failed to initialize ContractProvider. The application cannot connect to the blockchain.", error);
            this.initialized = false;
            // Re-throw the error so the calling context (e.g., a loading scene) can handle it.
            throw error;
        }
    }

    /**
     * Checks if the provider has been successfully initialized.
     * @returns {boolean}
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Gets the address for a specific contract by name.
     * @param {string} name - The simplified name of the contract (e.g., 'bcoin').
     * @returns {string} The contract's blockchain address.
     */
    getAddress(name) {
        if (!this.initialized) throw new Error("ContractProvider not initialized. Cannot get address.");
        if (!this.addresses[name]) throw new Error(`Address for contract '${name}' not found.`);
        return this.addresses[name];
    }

    /**
     * Gets the ABI for a specific contract by name.
     * @param {string} name - The simplified name of the contract (e.g., 'bcoin').
     * @returns {Array<any>} The contract's ABI.
     */
    getAbi(name) {
        if (!this.initialized) throw new Error("ContractProvider not initialized. Cannot get ABI.");
        if (!this.abis[name]) throw new Error(`ABI for contract '${name}' not found.`);
        return this.abis[name];
    }

    /**
     * Gets both the address and ABI for a specific contract.
     * @param {string} name - The simplified name of the contract (e.g., 'bcoin').
     * @returns {{address: string, abi: Array<any>}}
     */
    getContract(name) {
         if (!this.initialized) throw new Error("ContractProvider not initialized.");
         const address = this.getAddress(name);
         const abi = this.getAbi(name);
         return { address, abi };
    }
}

// Export a singleton instance.
const contractProvider = new ContractProvider();
export default contractProvider;