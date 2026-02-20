// src/config/MockData.js

export const MOCK_USER = {
  id: 1,
  username: 'OfflineHero',
  walletAddress: '0x1234...ABCD',
  isGuest: false,
  guildTag: 'DEV',
  xp: 1500,
  level: 5,
  gold: 5000,
  bcoin: 50000,
  account_level: 5,
  account_xp: 1500,
  coins: 50000,
};

export const MOCK_HEROES = [
  {
    id: 101,
    name: 'Neon Ninja',
    sprite_name: 'ninja_hero',
    level: 10,
    xp: 5000,
    rarity: 'Common',
    stats: {
      damage: 15,
      health: 100,
      speed: 12,
    },
    status: 'idle',
    bomb_mastery_xp: 500,
    agility_xp: 200,
  },
  {
    id: 102,
    name: 'Cyber Witch',
    sprite_name: 'witch_hero',
    level: 5,
    xp: 2000,
    rarity: 'Rare',
    stats: {
      damage: 25,
      health: 80,
      speed: 10,
    },
    status: 'idle',
    bomb_mastery_xp: 100,
    agility_xp: 100,
  },
];

export const MOCK_INVENTORY = [
  {
    id: 1,
    quantity: 1,
    Item: {
      id: 201,
      name: 'Rusty Sword',
      type: 'weapon',
      rarity: 'common',
      icon: 'item_rusty_sword',
    },
  },
  {
    id: 2,
    quantity: 1,
    Item: {
      id: 202,
      name: 'Iron Katana',
      type: 'weapon',
      rarity: 'uncommon',
      icon: 'item_iron_katana',
    },
  },
  {
    id: 3,
    quantity: 1,
    Item: {
      id: 203,
      name: 'Leather Vest',
      type: 'armor',
      rarity: 'common',
      icon: 'item_leather_vest',
    },
  },
  {
    id: 4,
    quantity: 1,
    Item: {
      id: 204,
      name: 'Nano Vest',
      type: 'armor',
      rarity: 'rare',
      icon: 'item_nano_vest',
    },
  },
  {
    id: 5,
    quantity: 1,
    Item: {
      id: 205,
      name: 'Neon Boots',
      type: 'boots',
      rarity: 'epic',
      icon: 'item_neon_boots',
    },
  },
  {
    id: 6,
    quantity: 5,
    Item: {
      id: 206,
      name: 'Health Potion',
      type: 'consumable',
      rarity: 'common',
      icon: 'item_health_potion',
    },
  },
  {
    id: 7,
    quantity: 15,
    Item: {
      id: 207,
      name: 'Scrap Metal',
      type: 'material',
      rarity: 'common',
      icon: 'item_scrap',
    },
  },
  {
    id: 8,
    quantity: 2,
    Item: {
      id: 208,
      name: 'Cyber Core',
      type: 'material',
      rarity: 'rare',
      icon: 'item_cyber_core',
    },
  },
];

export const MOCK_REWARD_POOL = 1000000;

export const MOCK_RANKING = [
  { rank: 1, name: 'Neo', score: 99999 },
  { rank: 2, name: 'Trinity', score: 88888 },
  { rank: 3, name: 'Morpheus', score: 77777 },
  { rank: 4, name: 'OfflineHero', score: 1500 },
];

export const MOCK_GUILDS = [
  { id: 1, name: 'The Matrix', tag: 'MTRX', members: 10 },
  { id: 2, name: 'Resistance', tag: 'RST', members: 5 },
];

export const MOCK_PVP_STATUS = {
  pvpEnabled: true,
  nextChangeIn: 3600,
};

export const MOCK_GLOBAL_BUFFS = [
  { name: 'Double XP Weekend', multiplier: 2.0, type: 'xp' },
];

export const MOCK_NEWS = [
  { title: 'Offline Mode Activated', content: 'Welcome to the local sandbox!' },
  { title: 'New Items', content: 'Check out the Forge!' },
];

export const MOCK_BESTIARY = {
  enemy: 50,
  boss: 2,
};
