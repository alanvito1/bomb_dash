// This file centralizes all smart contract addresses and ABIs for the frontend.
// It is a hybrid CJS/ESM module to support both the Vite build process (ESM) and legacy test files (CJS).

const addresses = require('../../backend/contracts/contract-addresses.json');
const heroStakingAbi = require('../../backend/contracts/HeroStaking.json');
const mockHeroNFTAbi = require('../../backend/contracts/MockHeroNFT.json');
const bcoinAbi = require('../../backend/contracts/IBEP20.json');
const tournamentControllerAbi = require('../../backend/contracts/TournamentController.json');
const wagerArenaAbi = require('../../backend/contracts/WagerArena.json');

const contracts = {
    wagerArena: {
        address: addresses.wagerArenaAddress,
        abi: wagerArenaAbi.abi
    },
    heroStaking: {
        address: addresses.heroStakingAddress,
        abi: heroStakingAbi
    },
    mockHeroNFT: {
        address: addresses.mockHeroNFTAddress,
        abi: mockHeroNFTAbi
    },
    bcoin: {
        address: addresses.bcoinTokenAddress,
        abi: bcoinAbi
    },
    tournamentController: {
        address: addresses.tournamentControllerAddress,
        // The .abi is important because the JSON file is a full Hardhat artifact
        abi: tournamentControllerAbi.abi
    }
};

// For CommonJS environments (like old tests)
module.exports = contracts;

// For ES Module environments (like Vite)
export default contracts;