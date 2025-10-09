// This file is the central point of access for contract data (addresses and ABIs).
// It acts as an abstraction layer over the ContractProvider.
import contractProvider from '../web3/ContractProvider.js';

// IMPORTANT: This file no longer stores addresses OR ABIs directly. It retrieves them
// at runtime from the ContractProvider, which is initialized in LoadingScene.
// All exports are now functions to defer execution until the provider is ready.

export const WAGER_ARENA_ABI = () => contractProvider.getAbi('wagerArena');
export const WAGER_ARENA_ADDRESS = () => contractProvider.getAddress('wagerArena');

export const HERO_STAKING_ABI = () => contractProvider.getAbi('heroStaking');
export const HERO_STAKING_ADDRESS = () => contractProvider.getAddress('heroStaking');

export const MOCK_HERO_NFT_ABI = () => contractProvider.getAbi('mockHeroNFT');
export const MOCK_HERO_NFT_ADDRESS = () => contractProvider.getAddress('mockHeroNFT');

export const BCOIN_ABI = () => contractProvider.getAbi('bcoin');
export const BCOIN_ADDRESS = () => contractProvider.getAddress('bcoin');

export const TOURNAMENT_CONTROLLER_ABI = () => contractProvider.getAbi('tournamentController');
export const TOURNAMENT_CONTROLLER_ADDRESS = () => contractProvider.getAddress('tournamentController');

export const PERPETUAL_REWARD_POOL_ABI = () => contractProvider.getAbi('perpetualRewardPool');
export const PERPETUAL_REWARD_POOL_ADDRESS = () => contractProvider.getAddress('perpetualRewardPool');

// The default export provides a convenient way to get a contract's address and ABI together.
const contracts = {
    wagerArena: {
        get address() { return WAGER_ARENA_ADDRESS(); },
        get abi() { return WAGER_ARENA_ABI(); }
    },
    heroStaking: {
        get address() { return HERO_STAKING_ADDRESS(); },
        get abi() { return HERO_STAKING_ABI(); }
    },
    mockHeroNFT: {
        get address() { return MOCK_HERO_NFT_ADDRESS(); },
        get abi() { return MOCK_HERO_NFT_ABI(); }
    },
    bcoin: {
        get address() { return BCOIN_ADDRESS(); },
        get abi() { return BCOIN_ABI(); }
    },
    tournamentController: {
        get address() { return TOURNAMENT_CONTROLLER_ADDRESS(); },
        get abi() { return TOURNAMENT_CONTROLLER_ABI(); }
    },
    perpetualRewardPool: {
        get address() { return PERPETUAL_REWARD_POOL_ADDRESS(); },
        get abi() { return PERPETUAL_REWARD_POOL_ABI(); }
    }
};

export default contracts;