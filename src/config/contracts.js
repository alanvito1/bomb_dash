// This file centralizes all smart contract addresses and ABIs for the frontend.
import addresses from '../../backend/contracts/contract-addresses.json';
import heroStakingAbi from '../../backend/contracts/HeroStaking.json';
import mockHeroNFTAbi from '../../backend/contracts/MockHeroNFT.json';
import bcoinAbi from '../../backend/contracts/IBEP20.json';
import tournamentControllerAbi from '../../backend/contracts/TournamentController.json';
import wagerArenaAbi from '../../backend/contracts/WagerArena.json';
import perpetualRewardPoolAbi from '../../backend/contracts/PerpetualRewardPool.json';

// Note: Vite can handle the .json imports automatically.

const contracts = {
    wagerArena: {
        address: addresses.wagerArenaAddress,
        abi: wagerArenaAbi.abi
    },
    heroStaking: {
        address: addresses.heroStakingAddress,
        abi: heroStakingAbi.abi
    },
    mockHeroNFT: {
        address: addresses.mockHeroNFTAddress,
        abi: mockHeroNFTAbi.abi
    },
    bcoin: {
        address: addresses.bcoinTokenAddress,
        abi: bcoinAbi // HYDRA-FIX: Correctly reference the imported JSON ABI array
    },
    tournamentController: {
        address: addresses.tournamentControllerAddress,
        abi: tournamentControllerAbi.abi
    },
    perpetualRewardPool: {
        address: addresses.perpetualRewardPoolAddress,
        abi: perpetualRewardPoolAbi.abi
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