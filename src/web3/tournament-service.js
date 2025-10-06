import { ethers } from 'ethers';
import { TOURNAMENT_CONTROLLER_ADDRESS, TOURNAMENT_CONTROLLER_ABI } from '../config/contracts.js';
import bcoinService from './bcoin-service.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

class TournamentService {
    constructor() {
        this.provider = null;
        this.contract = null;
        if (window.ethereum) {
            this.provider = new ethers.BrowserProvider(window.ethereum);
        }
    }

    async getContract() {
        if (!this.provider) {
            throw new Error("Wallet not connected. Please install MetaMask.");
        }
        const signer = await this.provider.getSigner();
        return new ethers.Contract(TOURNAMENT_CONTROLLER_ADDRESS, TOURNAMENT_CONTROLLER_ABI, signer);
    }

    /**
     * A centralized handler for blockchain transactions.
     * @param {Promise<ethers.TransactionResponse>} transactionPromise The promise returned by the contract method call.
     * @param {string} successMessage The message to show on successful confirmation.
     * @private
     */
    async _handleTransaction(transactionPromise, successMessage) {
        try {
            const tx = await transactionPromise;
            GameEventEmitter.emit('transaction:pending', tx.hash);
            await tx.wait(); // Wait for the transaction to be mined
            GameEventEmitter.emit('transaction:success', successMessage);
        } catch (error) {
            console.error("Transaction failed:", error);
            GameEventEmitter.emit('transaction:error', error);
            throw error; // Re-throw so the UI can know the operation failed
        }
    }

    /**
     * Executes the on-chain transaction to pay the fee for a hero stat upgrade.
     * This function should be called *after* the user has approved the BCOIN spending.
     * @param {number|string} cost The cost of the upgrade in BCOIN (not wei).
     */
    async payUpgradeFee(cost) {
        const contract = await this.getContract();
        const signer = await contract.getSigner();
        const playerAddress = await signer.getAddress();
        const costInWei = ethers.parseUnits(cost.toString(), 18);

        const allowance = await bcoinService.getAllowance(playerAddress, TOURNAMENT_CONTROLLER_ADDRESS);
        if (allowance < cost) {
             throw new Error(`Insufficient BCOIN allowance. Required: ${cost}, You have approved: ${allowance}`);
        }

        console.log(`Executing payUpgradeFee for player ${playerAddress} with cost ${cost.toString()} BCOIN (${costInWei.toString()} wei)`);

        const txPromise = contract.payUpgradeFee(playerAddress, costInWei, {
            gasLimit: 300000
        });

        await this._handleTransaction(txPromise, "Upgrade fee paid successfully!");
    }
}

const tournamentService = new TournamentService();
export default tournamentService;