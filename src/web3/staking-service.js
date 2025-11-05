import contracts from '../config/contracts.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

let ethersState = null;

/**
 * Lazily initializes and returns Ethers.js dependencies for the staking service.
 * @returns {Promise<{ethers: object, provider: object, signer: object, stakingContract: object, nftContract: object}>} A promise that resolves with the ethers instances.
 * @throws {Error} Throws an error if the wallet connection or contract instantiation fails.
 * @private
 */
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

/**
 * @class StakingService
 * @description A service for managing all interactions with the HeroStaking smart contract.
 * It handles approving, depositing (staking), and withdrawing NFTs.
 */
class StakingService {
    /**
     * @constructor
     */
    constructor() {
        // Initialization is handled on-demand.
    }

    /**
     * A centralized handler for blockchain transactions that emits global events.
     * @param {Promise} transactionPromise - The promise returned by the contract method call.
     * @param {string} successMessage - The message to emit on successful confirmation.
     * @returns {Promise<void>} A promise that resolves when the transaction is confirmed.
     * @throws {Error} Re-throws the error from the transaction promise.
     * @private
     */
    async _handleTransaction(transactionPromise, successMessage) {
        try {
            const tx = await transactionPromise;
            GameEventEmitter.emit('transaction:pending', tx.hash);
            await tx.wait();
            GameEventEmitter.emit('transaction:success', successMessage);
        } catch (error) {
            console.error("Transaction failed:", error);
            GameEventEmitter.emit('transaction:error', error);
            throw error;
        }
    }

    /**
     * Approves the staking contract to manage all of the user's Hero NFTs.
     * @returns {Promise<void>} A promise that resolves when the approval transaction is confirmed.
     */
    async approve() {
        const { nftContract } = await getEthersDependencies();
        const txPromise = nftContract.setApprovalForAll(contracts.heroStaking.address, true);
        await this._handleTransaction(txPromise, "Approval successful. You can now stake your heroes.");
    }

    /**
     * Deposits (stakes) a specific Hero NFT into the staking contract.
     * @param {string|number} tokenId - The ID of the NFT to deposit.
     * @returns {Promise<void>} A promise that resolves when the deposit transaction is confirmed.
     */
    async depositHero(tokenId) {
        const { stakingContract } = await getEthersDependencies();
        const txPromise = stakingContract.depositHero(tokenId);
        await this._handleTransaction(txPromise, "Hero staked successfully!");
    }

    /**
     * Withdraws a specific Hero NFT from the staking contract.
     * @param {string|number} tokenId - The ID of the NFT to withdraw.
     * @param {number} level - The hero's current level.
     * @param {number} xp - The hero's current XP.
     * @param {string} signature - The signature from the oracle.
     * @returns {Promise<void>} A promise that resolves when the withdrawal transaction is confirmed.
     */
    async withdrawHero(tokenId, level, xp, signature) {
        const { stakingContract } = await getEthersDependencies();
        const txPromise = stakingContract.withdrawHero(tokenId, level, xp, signature);
        await this._handleTransaction(txPromise, "Hero withdrawn successfully!");
    }

    /**
     * Checks if the user has already approved the staking contract to manage their NFTs.
     * @returns {Promise<boolean>} A promise that resolves with true if approved, otherwise false.
     */
    async isApproved() {
        const { signer, nftContract } = await getEthersDependencies();
        const ownerAddress = await signer.getAddress();
        return nftContract.isApprovedForAll(ownerAddress, contracts.heroStaking.address);
    }
}

const stakingService = new StakingService();
export default stakingService;