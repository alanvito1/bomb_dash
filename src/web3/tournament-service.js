import { ethers } from 'ethers';
import { TOURNAMENT_CONTROLLER_ADDRESS, TOURNAMENT_CONTROLLER_ABI } from '../config/contracts.js';
import bcoinService from './bcoin-service.js';

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
        // Always get a fresh signer to ensure the user is still connected
        const signer = await this.provider.getSigner();
        return new ethers.Contract(TOURNAMENT_CONTROLLER_ADDRESS, TOURNAMENT_CONTROLLER_ABI, signer);
    }

    /**
     * Executes the on-chain transaction to pay the fee for a hero stat upgrade.
     * This function should be called *after* the user has approved the BCOIN spending.
     * @param {number|string} cost The cost of the upgrade in BCOIN (not wei).
     * @returns {Promise<ethers.TransactionResponse>} The transaction response object.
     */
    async payUpgradeFee(cost) {
        const contract = await this.getContract();
        const signer = await contract.getSigner();
        const playerAddress = await signer.getAddress();

        // The contract expects the cost in the smallest unit (wei)
        const costInWei = ethers.parseUnits(cost.toString(), 18);

        // First, check allowance to provide a better error message.
        const allowance = await bcoinService.getAllowance(playerAddress, TOURNAMENT_CONTROLLER_ADDRESS);
        if (allowance < cost) {
             throw new Error(`Insufficient BCOIN allowance. Required: ${cost}, You have approved: ${allowance}`);
        }

        console.log(`Executing payUpgradeFee for player ${playerAddress} with cost ${cost.toString()} BCOIN (${costInWei.toString()} wei)`);

        // Execute the transaction
        const tx = await contract.payUpgradeFee(playerAddress, costInWei, {
            gasLimit: 300000 // Set a reasonable gas limit
        });

        console.log('Transaction sent:', tx.hash);
        return tx;
    }
}

const tournamentService = new TournamentService();
export default tournamentService;