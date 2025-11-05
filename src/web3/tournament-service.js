import contracts from '../config/contracts.js';
import bcoinService from './bcoin-service.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

let ethersState = null;

/**
 * Lazily initializes and returns Ethers.js dependencies for the tournament service.
 * @returns {Promise<{ethers: object, provider: object, signer: object, contract: object}>} A promise that resolves with the ethers instances.
 * @throws {Error} Throws an error if no wallet is detected.
 * @private
 */
async function getEthersDependencies() {
    if (ethersState) {
        return ethersState;
    }

    const { ethers } = await import('ethers');

    if (!window.ethereum) {
        throw new Error('No wallet detected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contracts.tournamentController.address, contracts.tournamentController.abi, signer);

    ethersState = { ethers, provider, signer, contract };
    return ethersState;
}

/**
 * @class TournamentService
 * @description A service for interacting with the TournamentController smart contract.
 * It primarily handles on-chain payments for in-game actions like hero upgrades.
 */
class TournamentService {
    /**
     * @constructor
     */
    constructor() {
        // Initialization is handled on-demand.
    }

    /**
     * Gets the initialized TournamentController contract instance.
     * @returns {Promise<ethers.Contract>} A promise that resolves with the contract instance.
     */
    async getContract() {
        const { contract } = await getEthersDependencies();
        return contract;
    }

    /**
     * A centralized handler for blockchain transactions that emits global events.
     * @param {Promise} transactionPromise - The promise returned by the contract method call.
     * @param {string} successMessage - The message to emit on successful confirmation.
     * @returns {Promise<object>} A promise that resolves with the confirmed transaction receipt.
     * @throws {Error} Re-throws the error from the transaction promise.
     * @private
     */
    async _handleTransaction(transactionPromise, successMessage) {
        try {
            const tx = await transactionPromise;
            GameEventEmitter.emit('transaction:pending', tx.hash);
            const receipt = await tx.wait();
            GameEventEmitter.emit('transaction:success', successMessage);
            return receipt;
        } catch (error) {
            console.error("Transaction failed:", error);
            GameEventEmitter.emit('transaction:error', error);
            throw error;
        }
    }

    /**
     * Executes the on-chain transaction to pay the BCOIN fee for a hero stat upgrade.
     * @param {number|string} cost - The cost of the upgrade in BCOIN (e.g., 10), not wei.
     * @returns {Promise<object>} A promise that resolves with the transaction receipt.
     * @throws {Error} Throws an error if the BCOIN allowance is insufficient.
     */
    async payUpgradeFee(cost) {
        const { ethers, contract } = await getEthersDependencies();
        const signer = await contract.getSigner();
        const playerAddress = await signer.getAddress();
        const costInWei = ethers.parseUnits(cost.toString(), 18);

        const allowance = await bcoinService.getAllowance(playerAddress, contracts.tournamentController.address);
        if (allowance < cost) {
             throw new Error(`Insufficient BCOIN allowance. Required: ${cost}, You have: ${allowance}`);
        }

        const txPromise = contract.payUpgradeFee(playerAddress, costInWei, { gasLimit: 300000 });
        return this._handleTransaction(txPromise, "Upgrade fee paid successfully!");
    }
}

const tournamentService = new TournamentService();
export default tournamentService;