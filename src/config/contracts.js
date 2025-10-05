// This file contains the configuration for the smart contracts used in the application.

// BCOIN Testnet Address
export const BCOIN_TESTNET_ADDRESS = '0xb8B71994A25F816d5b3232f24Ce5ea0135cf3106';

// BCOIN Standard ABI (ERC20)
export const BCOIN_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address recipient, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// BSC Testnet Chain ID
export const BOMB_CRYPTO_CHAIN_ID = 97;

// Tournament Controller Contract
export const TOURNAMENT_CONTROLLER_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
export const TOURNAMENT_CONTROLLER_ABI = [
    "function reportMatchResult(uint256 matchId, address winner)",
    "function reportTournamentResult(uint256 tournamentId, address[] calldata winners)",
    "function payLevelUpFee(address player)",
    "function payUpgradeFee(address player, uint256 cost)",
    "function donateToAltar(uint256 amount)",
    "function setBcoinLevelUpCost(uint256 newCost)",
    "function levelUpCost() view returns (uint256)",
    "function createRankedMatch(address player1, address player2, uint256 tier, uint256 entryFee)",
    "function enterRankedMatch(uint256 tier, uint256 entryFee)",
    "event TournamentStarted(uint256 indexed tournamentId)",
    "event AltarDonationReceived(address indexed donor, uint256 amount)",
    "event HeroLeveledUp(address indexed player, uint256 feePaid)",
    "event PlayerEnteredRankedQueue(address indexed player, uint256 indexed tier, uint256 entryFee)",
    "event MatchCreated(uint256 indexed matchId, address[] players, uint256 entryFee, uint256 tier)"
];

// Wager Arena Contract
export const WAGER_ARENA_ADDRESS = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
export const WAGER_ARENA_ABI = [
    "function enterWagerQueue(uint256 _tierId) external",
    "event WagerMatchCreated(uint256 indexed matchId, uint256 indexed tierId, address player1, address player2, uint256 totalWager)"
];

// Bombcrypto Hero NFT Contract
export const BOMB_CRYPTO_NFT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with the actual address
export const BOMB_CRYPTO_NFT_ABI = [
  // A minimal ABI for the functionality required:
  // 1. Check balance: balanceOf(address)
  // 2. Get token ID: tokenOfOwnerByIndex(address, index)
  // 3. Get hero stats: getHeroStats(tokenId) - This is a placeholder, the actual function name might be different.

  {
    "constant": true,
    "inputs": [{ "name": "owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "index", "type": "uint256" }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "tokenId", "type": "uint256" }],
    "name": "getHeroStats", // Placeholder: Replace with the actual function name from the contract
    "outputs": [
      { "name": "damage", "type": "uint8" },
      { "name": "health", "type": "uint8" },
      { "name": "speed", "type": "uint8" },
      { "name": "stamina", "type": "uint8" },
      { "name": "bomb_skin", "type": "string" }
    ],
    "type": "function"
  }
];