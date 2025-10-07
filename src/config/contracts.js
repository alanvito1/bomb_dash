// This file centralizes all smart contract addresses and ABIs for the frontend.
// It uses CommonJS `require` to be compatible with the testing environment.

const addresses = require('../../backend/contracts/contract-addresses.json');
const heroStakingAbi = require('../../backend/contracts/HeroStaking.json');
const mockHeroNFTAbi = require('../../backend/contracts/MockHeroNFT.json');
const bcoinAbi = require('../../backend/contracts/IBEP20.json');
const tournamentControllerAbi = require('../../backend/contracts/TournamentController.json');

const contracts = {
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

module.exports = contracts;