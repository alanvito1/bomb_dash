const { ethers } = require('ethers');
const contracts = require('../config/contracts.js');

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

    async approve() {
        await this.init();
        console.log(`Requesting approval for all NFTs to be managed by: ${contracts.heroStaking.address}`);
        const tx = await this.nftContract.setApprovalForAll(contracts.heroStaking.address, true);
        return tx;
    }

    async depositHero(tokenId) {
        await this.init();
        console.log(`Depositing Hero NFT with ID: ${tokenId}`);
        const tx = await this.stakingContract.depositHero(tokenId);
        return tx;
    }

    async withdrawHero(tokenId, level, xp, signature) {
        await this.init();
        console.log(`Withdrawing Hero NFT with ID: ${tokenId} using signature.`);
        const tx = await this.stakingContract.withdrawHero(tokenId, level, xp, signature);
        return tx;
    }

    async isApproved() {
        await this.init();
        const ownerAddress = await this.signer.getAddress();
        return this.nftContract.isApprovedForAll(ownerAddress, contracts.heroStaking.address);
    }
}

// Export a singleton instance
const stakingService = new StakingService();
module.exports = stakingService;