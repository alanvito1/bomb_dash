// This file centralizes all smart contract addresses and ABIs for the frontend.
import addresses from '../../backend/contracts/contract-addresses.json';
import heroStakingAbi from '../../backend/contracts/HeroStaking.json';
import mockHeroNFTAbi from '../../backend/contracts/MockHeroNFT.json';
import bcoinAbi from '../../backend/contracts/IBEP20.json';
import tournamentControllerAbi from '../../backend/contracts/TournamentController.json';
import wagerArenaAbi from '../../backend/contracts/WagerArena.json';

// Note: Vite can handle the .json imports automatically.

const contracts = {
    wagerArena: {
        address: addresses.wagerArenaAddress,
        abi: wagerArenaAbi
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
        abi: tournamentControllerAbi
    },
    perpetualRewardPool: {
        address: addresses.perpetualRewardPoolAddress,
        abi: require('../../backend/contracts/PerpetualRewardPool.json') // ABI is not exported by default, so we require it here
    }
};

export const WAGER_ARENA_ABI = contracts.wagerArena.abi;
export const WAGER_ARENA_ADDRESS = contracts.wagerArena.address;

export const HERO_STAKING_ABI = contracts.heroStaking.abi;
export const HERO_STAKING_ADDRESS = contracts.heroStaking.address;

export const MOCK_HERO_NFT_ABI = contracts.mockHeroNFT.abi;
export const MOCK_HERO_NFT_ADDRESS = contracts.mockHeroNFT.address;

export const BCOIN_ABI = contracts.bcoin.abi;
export const BCOIN_ADDRESS = contracts.bcoin.address;

export const TOURNAMENT_CONTROLLER_ABI = contracts.tournamentController.abi;
export const TOURNAMENT_CONTROLLER_ADDRESS = contracts.tournamentController.address;

export default contracts;