import contracts from '../config/contracts.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

let ethersState = null;

async function getEthersDependencies() {
    if (ethersState) {
        return ethersState;
    }

    const { ethers } = await import('ethers');

    if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed.');
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const stakingContract = new ethers.Contract(
            contracts.heroStaking.address,
            contracts.heroStaking.abi,
            signer
        );

        const nftContract = new ethers.Contract(
            contracts.mockHeroNFT.address,
            contracts.mockHeroNFT.abi,
            signer
        );

        ethersState = { ethers, provider, signer, stakingContract, nftContract };
        return ethersState;

    } catch (error) {
        console.error("Failed to initialize StakingService dependencies:", error);
        throw new Error("Could not connect to wallet or contracts. " + error.message);
    }
}

class StakingService {
    constructor() {
        // Initialization is now on-demand via getEthersDependencies
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
        } catch (error) {
            console.error("Transaction failed:", error);
            GameEventEmitter.emit('transaction:error', error);
            throw error; // Re-throw so the UI can know the operation failed
        }
    }

    async approve() {
        const { nftContract } = await getEthersDependencies();
        console.log(`Requesting approval for all NFTs to be managed by: ${contracts.heroStaking.address}`);
        const txPromise = nftContract.setApprovalForAll(contracts.heroStaking.address, true);
        await this._handleTransaction(txPromise, "Approval successful. You can now stake your heroes.");
    }

    async depositHero(tokenId) {
        const { stakingContract } = await getEthersDependencies();
        console.log(`Depositing Hero NFT with ID: ${tokenId}`);
        const txPromise = stakingContract.depositHero(tokenId);
        await this._handleTransaction(txPromise, "Hero staked successfully!");
    }

    async withdrawHero(tokenId, level, xp, signature) {
        const { stakingContract } = await getEthersDependencies();
        console.log(`Withdrawing Hero NFT with ID: ${tokenId} using signature.`);
        const txPromise = stakingContract.withdrawHero(tokenId, level, xp, signature);
        await this._handleTransaction(txPromise, "Hero withdrawn successfully!");
    }

    async isApproved() {
        const { signer, nftContract } = await getEthersDependencies();
        const ownerAddress = await signer.getAddress();
        return nftContract.isApprovedForAll(ownerAddress, contracts.heroStaking.address);
    }
}

// Export a singleton instance
const stakingService = new StakingService();
export default stakingService;