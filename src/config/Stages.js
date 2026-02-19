/**
 * StageConfig.js
 *
 * "The Stage Manifest"
 * Defines the World Map nodes, their connections, and the gameplay configuration for each stage.
 */

export const Stages = [
    {
        id: 1,
        name: "FOREST",
        x: 240,
        y: 650,
        req_stage: 0, // No requirement, always unlocked
        background_asset: 'bg1', // Forest BG
        music_track: 'world_1_music',
        enemy_config: {
            wave_count: 3,
            enemies: ['enemy', 'enemy_2'], // Basic enemies
            boss: null
        }
    },
    {
        id: 2,
        name: "CAVE",
        x: 120, // Zig-zag left
        y: 450,
        req_stage: 1, // Requires beating Stage 1
        background_asset: 'bg2', // Cave BG
        music_track: 'world_2_music',
        enemy_config: {
            wave_count: 5,
            enemies: ['enemy_2', 'enemy_3'], // Harder enemies
            boss: null
        }
    },
    {
        id: 3,
        name: "VOLCANO",
        x: 360, // Zig-zag right
        y: 350,
        req_stage: 2,
        background_asset: 'bg3', // Volcano BG
        music_track: 'world_3_music',
        enemy_config: {
            wave_count: 5,
            enemies: ['enemy_3', 'enemy_4'],
            boss: null
        }
    },
    {
        id: 4,
        name: "BOSS",
        x: 240, // Center Top
        y: 150,
        req_stage: 3,
        background_asset: 'bg5', // Boss Room
        music_track: 'boss_music',
        enemy_config: {
            wave_count: 1,
            enemies: [], // No mobs, just boss? Or boss + minions
            boss: 'boss_1'
        }
    }
];

export const getStageById = (id) => Stages.find(s => s.id === id);
