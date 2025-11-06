const { ethers } = require('ethers');
const db = require('./database');
const fs = require('fs');
const path = require('path');

// Defensively load contract ABI
const abiPath = path.join(__dirname, 'contracts', 'HeroStaking.json');
let heroStakingABI;

if (fs.existsSync(abiPath)) {
    try {
        const abiFile = require(abiPath);
        if (Array.isArray(abiFile)) {
            heroStakingABI = abiFile;
        } else if (abiFile && abiFile.abi && Array.isArray(abiFile.abi)) {
            heroStakingABI = abiFile.abi;
        } else {
            console.error(`[StakingListener] Invalid ABI format in ${abiPath}.`);
        }
    } catch (error) {
        console.error(`[StakingListener] Error loading or parsing ABI from ${abiPath}:`, error);
    }
} else {
    // This is not an error during startup, as the deploy script hasn't run yet.
    console.warn(`[StakingListener] ABI file not found: ${abiPath}. Listener will not start.`);
}

const HERO_STAKING_ADDRESS = process.env.HERO_STAKING_ADDRESS;
const TESTNET_RPC_URL = process.env.TESTNET_RPC_URL;

let provider;
let stakingContract;

/**
 * Initializes the connection to the blockchain and sets up the event listener.
 */
async function initStakingListener() {
    if (!HERO_STAKING_ADDRESS || !TESTNET_RPC_URL || !heroStakingABI) {
        console.warn('[StakingListener] HERO_STAKING_ADDRESS, TESTNET_RPC_URL, or ABI not found/valid. Staking listener will not start.');
        return;
    }

    try {
        console.log('[StakingListener] Initializing...');
        provider = new ethers.JsonRpcProvider(TESTNET_RPC_URL);
        stakingContract = new ethers.Contract(HERO_STAKING_ADDRESS, heroStakingABI, provider);

        // Listen for the HeroDeposited event
        stakingContract.on('HeroDeposited', handleHeroDeposited);
        // Listen for the HeroWithdrawn event
        stakingContract.on('HeroWithdrawn', handleHeroWithdrawn);

        console.log(`[StakingListener] Successfully listening for HeroDeposited and HeroWithdrawn events on contract ${HERO_STAKING_ADDRESS}`);

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
 * Handles the HeroWithdrawn event from the smart contract.
 * @param {string} owner - The address of the user who withdrew the hero.
 * @param {ethers.BigNumber} tokenId - The ID of the withdrawn token.
 * @param {ethers.BigNumber} level - The hero's level at withdrawal.
 * @param {ethers.BigNumber} xp - The hero's xp at withdrawal.
 */
async function handleHeroWithdrawn(owner, tokenId, level, xp) {
    const tokenIdNumber = Number(tokenId);
    console.log(`[StakingListener] Event Captured: HeroWithdrawn. Owner: ${owner}, TokenID: ${tokenIdNumber}, Level: ${level}, XP: ${xp}`);

    try {
        const result = await db.updateHeroStatus(tokenIdNumber, 'in_wallet');
        if (result.changes > 0) {
            console.log(`[StakingListener] Successfully updated hero ${tokenIdNumber} status to 'in_wallet' in the database.`);
        } else {
            console.warn(`[StakingListener] A withdrawal event was received for NFT ID ${tokenIdNumber}, but no matching hero was found in the database.`);
        }
    } catch (error) {
        console.error(`[StakingListener] Error updating database for withdrawn token ${tokenIdNumber}:`, error);
    }
}

/**
 * Stops the listener.
 */
function stopListener() {
    if (stakingContract) {
        stakingContract.off('HeroDeposited', handleHeroDeposited);
        stakingContract.off('HeroWithdrawn', handleHeroWithdrawn);
        console.log('[StakingListener] Listener stopped.');
    }
}

module.exports = {
    initStakingListener,
    stopListener,
    handleHeroDeposited, // Export for testing purposes
    handleHeroWithdrawn // Export for testing purposes
};