import contracts from '../config/contracts.js';
import bcoinService from './bcoin-service.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

let ethersState = null;

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

class TournamentService {
    constructor() {
        // Initialization is now handled on-demand by getEthersDependencies
    }

    async getContract() {
        const { contract } = await getEthersDependencies();
        return contract;
    }

    /**
     * A centralized handler for blockchain transactions.
     * @param {Promise} transactionPromise The promise returned by the contract method call.
     * @param {string} successMessage The message to show on successful confirmation.
     * @private
     */
    async _handleTransaction(transactionPromise, successMessage) {
        try {
            const tx = await transactionPromise;
            GameEventEmitter.emit('transaction:pending', tx.hash);
            await tx.wait(); // Wait for the transaction to be mined
            GameEventEmitter.emit('transaction:success', successMessage);
            return tx; // PT-02: Return the confirmed transaction object
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
        const { ethers, contract } = await getEthersDependencies();
        const signer = await contract.getSigner();
        const playerAddress = await signer.getAddress();
        const costInWei = ethers.parseUnits(cost.toString(), 18);

        const allowance = await bcoinService.getAllowance(playerAddress, contracts.tournamentController.address);
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