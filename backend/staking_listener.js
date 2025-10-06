const { ethers } = require('ethers');
const db = require('./database');

// Load contract ABI and address from environment variables
const heroStakingABI = require('./contracts/HeroStaking.json');
const HERO_STAKING_ADDRESS = process.env.HERO_STAKING_ADDRESS;
const TESTNET_RPC_URL = process.env.TESTNET_RPC_URL;

let provider;
let stakingContract;

/**
 * Initializes the connection to the blockchain and sets up the event listener.
 */
async function initStakingListener() {
    if (!HERO_STAKING_ADDRESS || !TESTNET_RPC_URL) {
        console.warn('[StakingListener] HERO_STAKING_ADDRESS or TESTNET_RPC_URL not found in .env. Staking listener will not start.');
        return;
    }

    try {
        console.log('[StakingListener] Initializing...');
        provider = new ethers.JsonRpcProvider(TESTNET_RPC_URL);
        stakingContract = new ethers.Contract(HERO_STAKING_ADDRESS, heroStakingABI, provider);

        // Listen for the HeroDeposited event
        stakingContract.on('HeroDeposited', handleHeroDeposited);

        console.log(`[StakingListener] Successfully listening for HeroDeposited events on contract ${HERO_STAKING_ADDRESS}`);

    } catch (error) {
        console.error('[StakingListener] Failed to initialize:', error);
    }
}

/**
 * Handles the HeroDeposited event from the smart contract.
 * @param {string} owner - The address of the user who deposited the hero.
 * @param {string} nftContract - The address of the NFT contract (for future use).
 * @param {ethers.BigNumber} tokenId - The ID of the deposited token.
 */
async function handleHeroDeposited(owner, nftContract, tokenId) {
    const tokenIdNumber = Number(tokenId); // Convert BigInt to Number for database
    console.log(`[StakingListener] Event Captured: HeroDeposited. Owner: ${owner}, TokenID: ${tokenIdNumber}`);

    try {
        const result = await db.updateHeroStatus(tokenIdNumber, 'staked');
        if (result.changes > 0) {
            console.log(`[StakingListener] Successfully updated hero ${tokenIdNumber} status to 'staked' in the database.`);
        } else {
            console.warn(`[StakingListener] A staking event was received for NFT ID ${tokenIdNumber}, but no matching hero was found in the database.`);
        }
    } catch (error) {
        console.error(`[StakingListener] Error updating database for token ${tokenIdNumber}:`, error);
    }
}

/**
 * Stops the listener.
 */
function stopListener() {
    if (stakingContract) {
        stakingContract.off('HeroDeposited', handleHeroDeposited);
        console.log('[StakingListener] Listener stopped.');
    }
}

module.exports = {
    initStakingListener,
    stopListener,
    handleHeroDeposited // Export for testing purposes
};