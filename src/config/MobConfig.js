/**
 * MobConfig.js
 * Central configuration for all enemies and bosses.
 *
 * Tiers:
 * 1 - Common Enemy (Spawn in waves)
 * 2 - Elite / Sub-Boss (Static sprites, mid-stage threats)
 * 3 - Major Boss (Animated sprites, end-stage threats)
 */

export const MOBS = {
    // --- TIER 1: COMMON ENEMIES ---
    'slime_green': {
        id: 'slime_green',
        name: 'Toxic Slime',
        asset_key: 'enemy1',
        base_hp: 10,
        base_speed: 60,
        tier: 1,
        xp_reward: 1
    },
    'bat_iron': {
        id: 'bat_iron',
        name: 'Iron Bat',
        asset_key: 'enemy2',
        base_hp: 15,
        base_speed: 80,
        tier: 1,
        xp_reward: 2
    },
    'skull_phantom': {
        id: 'skull_phantom',
        name: 'Phantom Skull',
        asset_key: 'enemy3',
        base_hp: 20,
        base_speed: 70,
        tier: 1,
        xp_reward: 2
    },
    'orc_grunt': {
        id: 'orc_grunt',
        name: 'Orc Grunt',
        asset_key: 'enemy4',
        base_hp: 25,
        base_speed: 50,
        tier: 1,
        xp_reward: 3
    },
    'void_beholder': {
        id: 'void_beholder',
        name: 'Void Beholder',
        asset_key: 'enemy5',
        base_hp: 30,
        base_speed: 60,
        tier: 1,
        xp_reward: 3
    },

    // --- TIER 2: ELITE / SUB-BOSSES (Static) ---
    'colossus_proto': {
        id: 'colossus_proto',
        name: 'Colossus Prototype',
        asset_key: 'boss1',
        base_hp: 500,
        base_speed: 40,
        tier: 2,
        xp_reward: 50
    },
    'magma_golem': {
        id: 'magma_golem',
        name: 'Magma Golem',
        asset_key: 'boss2',
        base_hp: 600,
        base_speed: 40,
        tier: 2,
        xp_reward: 60
    },
    'spectral_lich': {
        id: 'spectral_lich',
        name: 'Spectral Lich',
        asset_key: 'boss3',
        base_hp: 550,
        base_speed: 50,
        tier: 2,
        xp_reward: 55
    },
    'ogre_warlord': {
        id: 'ogre_warlord',
        name: 'Ogre Warlord',
        asset_key: 'boss4',
        base_hp: 700,
        base_speed: 45,
        tier: 2,
        xp_reward: 70
    },
    'eldritch_eye': {
        id: 'eldritch_eye',
        name: 'Eldritch Eye',
        asset_key: 'boss5',
        base_hp: 650,
        base_speed: 50,
        tier: 2,
        xp_reward: 65
    },

    // --- TIER 3: MAJOR BOSSES (Animated) ---
    'mecha_sentinel': {
        id: 'mecha_sentinel',
        name: 'Mecha Sentinel',
        asset_key: 'robot',
        base_hp: 1000,
        base_speed: 35,
        tier: 3,
        xp_reward: 200
    },
    'kaiju_alpha': {
        id: 'kaiju_alpha',
        name: 'Kaiju Alpha',
        asset_key: 'golzilla',
        base_hp: 1200,
        base_speed: 30,
        tier: 3,
        xp_reward: 250
    },
    'steel_legionnaire': {
        id: 'steel_legionnaire',
        name: 'Steel Legionnaire',
        asset_key: 'soldier',
        base_hp: 900,
        base_speed: 45,
        tier: 3,
        xp_reward: 180
    },
    'heavy_panzer': {
        id: 'heavy_panzer',
        name: 'Heavy Panzer',
        asset_key: 'boss_tank',
        base_hp: 1500,
        base_speed: 20,
        tier: 3,
        xp_reward: 300
    }
};
