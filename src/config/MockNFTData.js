/**
 * MockNFTData.js
 *
 * This file provides a mocked layer of the BombCrypto NFT data structure.
 * Use this to simulate "reading" the blockchain in your offline game environment.
 */

// ==========================================
// CONSTANTS (Decoders)
// ==========================================

export const RARITY = {
  0: "Common",
  1: "Rare",
  2: "Super Rare",
  3: "Epic",
  4: "Legend",
  5: "SP Legend"
};

export const ATTRIBUTES = {
  POWER: "bomb_power",
  SPEED: "speed",
  STAMINA: "stamina",
  BOMB_NUM: "bomb_count",
  RANGE: "bomb_range"
};

export const SPELLS = {
  1: { name: "Treasure Hunter", desc: "+02 DMG to Chests" },
  2: { name: "Jail Breaker", desc: "+05 DMG to Prisons" },
  3: { name: "Pierce Block", desc: "Explode through Blocks" },
  4: { name: "Save Battery", desc: "20% chance not to lose Stamina" },
  5: { name: "Fast Charge", desc: "+0.5 Stamina/Min Rest" },
  6: { name: "Bomb Pass", desc: "Walk through Bombs" },
  7: { name: "Block Pass", desc: "Walk through Blocks" }
};

export const HOUSE_TYPES = {
  0: { name: "Tiny House", slots: 4, charge: 2 },
  1: { name: "Mini House", slots: 6, charge: 5 },
  2: { name: "Lux House", slots: 8, charge: 8 },
  3: { name: "PentHouse", slots: 10, charge: 11 },
  4: { name: "Villa", slots: 12, charge: 14 },
  5: { name: "Super Villa", slots: 14, charge: 17 }
};

// ==========================================
// MOCK DATA GENERATOR
// ==========================================

/**
 * Simulates a fetched Hero NFT object.
 * Corresponds to the 'BHeroDetails.decode()' result.
 */
export const MockHeroes = [
  {
    id: 1001,
    name: 'Froggy',
    rarity: 0, // Common
    rarity_name: RARITY[0],
    level: 1,
    stats: {
      power: 3,
      speed: 2,
      stamina: 5,
      bomb_num: 1,
      range: 1
    },
    visuals: {
      skin: 1, // Frog
      color: 2 // Green
    },
    sprite_name: 'ninja_hero', // Placeholder
    spells: []
  },
  {
    id: 1002,
    name: 'Sir Knight',
    rarity: 1, // Rare
    rarity_name: RARITY[1],
    level: 2,
    stats: {
      power: 6,
      speed: 4,
      stamina: 8,
      bomb_num: 2,
      range: 2
    },
    visuals: {
      skin: 2, // Knight
      color: 1 // Blue
    },
    sprite_name: 'witch_hero', // Placeholder
    spells: [1] // Treasure Hunter
  },
  {
    id: 1003,
    name: 'Cyber Man',
    rarity: 2, // Super Rare
    rarity_name: RARITY[2],
    level: 3,
    stats: {
      power: 9,
      speed: 6,
      stamina: 10,
      bomb_num: 3,
      range: 2
    },
    visuals: {
      skin: 3, // Man
      color: 3 // Cyan
    },
    sprite_name: 'ninja_hero', // Placeholder
    spells: [1, 2] // Treasure Hunter, Jail Breaker
  },
  {
    id: 1004,
    name: 'Crimson Lady',
    rarity: 3, // Epic
    rarity_name: RARITY[3],
    level: 4,
    stats: {
      power: 12,
      speed: 8,
      stamina: 12,
      bomb_num: 3,
      range: 3
    },
    visuals: {
      skin: 4, // Lady
      color: 5 // Red
    },
    sprite_name: 'witch_hero', // Placeholder
    spells: [1, 2, 4] // TH, JB, Save Battery
  },
  {
    id: 1005,
    name: 'Void Witch',
    rarity: 4, // Legend
    rarity_name: RARITY[4],
    level: 5,
    stats: {
      power: 15,
      speed: 10,
      stamina: 15,
      bomb_num: 4,
      range: 4
    },
    visuals: {
      skin: 5, // Witch
      color: 4 // Purple
    },
    sprite_name: 'ninja_hero', // Placeholder
    spells: [3, 5, 7] // Pierce, Fast Charge, Block Pass
  },
  {
    id: 1006,
    name: 'Golden God',
    rarity: 5, // SP Legend
    rarity_name: RARITY[5],
    level: 10,
    stats: {
      power: 20,
      speed: 15,
      stamina: 20,
      bomb_num: 5,
      range: 5
    },
    visuals: {
      skin: 6, // Special
      color: 6 // Gold
    },
    sprite_name: 'witch_hero', // Placeholder
    spells: [3, 5, 6, 7] // Pierce, Fast Charge, Bomb Pass, Block Pass
  }
];

/**
 * Simulates a fetched House NFT object.
 */
export const MockHouses = [
  {
    id: 5001,
    type: 0, // Tiny House
    name: HOUSE_TYPES[0].name,
    stats: {
      slots: HOUSE_TYPES[0].slots,
      recovery_rate: HOUSE_TYPES[0].charge
    }
  },
  {
    id: 5002,
    type: 4, // Villa
    name: HOUSE_TYPES[4].name,
    stats: {
      slots: HOUSE_TYPES[4].slots,
      recovery_rate: HOUSE_TYPES[4].charge
    }
  }
];

// Helper to calculate final damage with level bonus
export const calculatePower = (hero) => {
    const levelBonuses = {1:0, 2:1, 3:2, 4:3, 5:5, 10:10};
    return hero.stats.power + (levelBonuses[hero.level] || 0);
};
