import { ethers } from 'ethers';
import contracts from '../config/contracts.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

class StakingService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.stakingContract = null;
        this.nftContract = null;
    }

    async init() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed.');
        }
        if (this.stakingContract && this.signer) {
            return; // Already initialized
        }

        try {
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();

            this.stakingContract = new ethers.Contract(
                contracts.heroStaking.address,
                contracts.heroStaking.abi,
                this.signer
            );

            this.nftContract = new ethers.Contract(
                contracts.mockHeroNFT.address,
                contracts.mockHeroNFT.abi,
                this.signer
            );

        } catch (error) {
            console.error("Failed to initialize StakingService:", error);
            throw new Error("Could not connect to wallet or contracts. " + error.message);
        }
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

    async approve() {
        await this.init();
        console.log(`Requesting approval for all NFTs to be managed by: ${contracts.heroStaking.address}`);
        const txPromise = this.nftContract.setApprovalForAll(contracts.heroStaking.address, true);
        await this._handleTransaction(txPromise, "Approval successful. You can now stake your heroes.");
    }

    async depositHero(tokenId) {
        await this.init();
        console.log(`Depositing Hero NFT with ID: ${tokenId}`);
        const txPromise = this.stakingContract.depositHero(tokenId);
        await this._handleTransaction(txPromise, "Hero staked successfully!");
    }

    async withdrawHero(tokenId, level, xp, signature) {
        await this.init();
        console.log(`Withdrawing Hero NFT with ID: ${tokenId} using signature.`);
        const txPromise = this.stakingContract.withdrawHero(tokenId, level, xp, signature);
        await this._handleTransaction(txPromise, "Hero withdrawn successfully!");
    }

    async isApproved() {
        await this.init();
        const ownerAddress = await this.signer.getAddress();
        return this.nftContract.isApprovedForAll(ownerAddress, contracts.heroStaking.address);
    }
}

// Export a singleton instance
const stakingService = new StakingService();
export default stakingService;