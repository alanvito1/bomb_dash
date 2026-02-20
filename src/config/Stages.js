/**
 * StageConfig.js
 *
 * "The Stage Manifest"
 * Defines the World Map nodes, their connections, and the gameplay configuration for each stage.
 * Generated programmatically to support 30 Stages.
 */

import { MOBS } from './MobConfig.js';

// Helper to filter mobs by tier
const getMobsByTier = (tier) => Object.values(MOBS).filter(m => m.tier === tier);

const tier1Mobs = getMobsByTier(1);
const tier2Bosses = getMobsByTier(2);
const tier3Bosses = getMobsByTier(3);

// Combined Boss Pool for rotation (Tier 2 -> Tier 3)
// We want to ramp up.
// Stages 1-10: Tier 2
// Stages 11-20: Tier 2 (Stronger)
// Stages 21-30: Tier 3
// Let's just create a pool that distributes them.
const bossPool = [
    ...tier2Bosses,
    ...tier2Bosses,
    ...tier3Bosses
];
// 5 T2 + 5 T2 + 4 T3 = 14. 30 Stages.
// Let's just use modulo on the full list of T2+T3 (9 total)?
// Or constructing a specific array of 30 bosses?
// Let's keep it simple: Cycle T2 for first half, T3 for second half?
// 1-15: T2 (5 bosses, 3 cycles)
// 16-30: T3 (4 bosses, ~3.75 cycles)

const generateStages = () => {
    const stages = [];
    const totalStages = 30;

    for (let i = 0; i < totalStages; i++) {
        const stageNum = i + 1;

        // Mob Rotation (Tier 1)
        const mobA = tier1Mobs[i % tier1Mobs.length];
        const mobB = tier1Mobs[(i + 1) % tier1Mobs.length];

        // Boss Rotation
        let boss;
        if (stageNum <= 15) {
             boss = tier2Bosses[i % tier2Bosses.length];
        } else {
             boss = tier3Bosses[i % tier3Bosses.length];
        }

        // Difficulty Scaling
        // Base 1.0, +0.1 per stage?
        // Stage 1: 1.0
        // Stage 30: 4.0
        const difficulty = 1.0 + (i * 0.1);

        // Map Position (Zig-Zag Logic for Visuals)
        // Center is 240. Width 480.
        // Zig-zag: Center -> Left -> Center -> Right -> Center
        // y decreases as we go up (Map usually goes bottom to top?)
        // Let's assume Stages flow from Bottom (Stage 1) to Top (Stage 30).
        // Y starts at 800 and goes to 0?
        // Let's map Y from 2000 down to 100?
        // Map scrolling might be needed if 30 nodes.
        // For now, let's just space them out.
        // If Y is fixed 800px screen, we need scrolling.
        // But WorldMapScene usually has a scrollable camera or paginated?
        // The prompt doesn't specify map mechanics, just "30 nodes".
        // I'll space them 100px apart vertically.
        const startY = 3000; // Start deep down
        const y = startY - (i * 100);

        const xOffset = 100;
        let x = 240;
        const zigzag = i % 4;
        if (zigzag === 1) x = 240 - xOffset; // Left
        if (zigzag === 3) x = 240 + xOffset; // Right

        // Background Rotation
        // bg1, bg2, bg3, bg4, bg5
        const bgIndex = (i % 5) + 1;

        stages.push({
            id: stageNum,
            name: `STAGE ${stageNum}`,
            x: x,
            y: y,
            req_stage: i, // Requires previous stage (Stage 1 reqs 0)
            background_asset: `bg${bgIndex}`,
            music_track: `world_${(i % 3) + 1}_music`, // Cycle 3 tracks
            difficulty_multiplier: parseFloat(difficulty.toFixed(2)),
            enemy_config: {
                wave_count: 30, // Fixed 30 waves
                wave_quota: 10 + Math.floor(i * 0.5), // Scaling quota? Or fixed? Let's scale slightly.
                mob_a: mobA,
                mob_b: mobB,
                boss: boss
            }
        });
    }
    return stages;
};

export const Stages = generateStages();

export const getStageById = (id) => Stages.find(s => s.id === id);
