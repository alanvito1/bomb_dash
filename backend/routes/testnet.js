const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { verifyToken } = require('./auth.js');

// Helper to generate random stats based on rarity
function generateHeroStats(rarity) {
  let multiplier = 1;
  let sprite = 'ninja_hero'; // Default

  // Assign different sprites/stats based on rarity
  // Note: Ensure these sprite names exist in the frontend assets or fallback logic
  switch (rarity) {
    case 'Common':
      multiplier = 1.0;
      sprite = 'ninja_hero';
      break;
    case 'Rare':
      multiplier = 1.2;
      sprite = 'frog_hero';
      break;
    case 'Super Rare':
      multiplier = 1.5;
      sprite = 'mask_hero';
      break;
    case 'Legend':
      multiplier = 2.0;
      sprite = 'knight_hero';
      break;
    default:
        sprite = 'ninja_hero';
  }

  // Basic stat generation logic
  return {
    hero_type: 'nft', // Treat as NFT so it shows up correctly in filters
    nft_id: Math.floor(Math.random() * 1000000000), // Generate a fake large ID
    rarity: rarity,
    nft_type: 'HERO',
    level: 1,
    hp: Math.floor(100 * multiplier),
    maxHp: Math.floor(100 * multiplier),
    damage: Math.floor(5 * multiplier), // Base damage 5
    speed: Math.floor(200 + (multiplier * 10)),
    sprite_name: sprite,
    status: 'in_wallet' // Mimic fresh mint state
  };
}

router.post('/mint-hero', verifyToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const { forcedRarity, forcedType } = req.body; // Allow forcing for testing purposes

        let rarity = 'Common';

        // RNG Logic
        if (!forcedRarity) {
            const rand = Math.random();
            if (rand > 0.98) rarity = 'Legend';      // 2%
            else if (rand > 0.90) rarity = 'Super Rare'; // 8%
            else if (rand > 0.70) rarity = 'Rare';       // 20%
            // else Common (70%)
        } else {
            rarity = forcedRarity;
        }

        let nftType = 'HERO';
        if (forcedType) nftType = forcedType;

        const stats = generateHeroStats(rarity);
        stats.nft_type = nftType;

        // Override sprite for House or specific types if needed
        if (nftType === 'HOUSE') {
            stats.sprite_name = 'house_blue'; // Example asset
            stats.rarity = 'Common'; // Houses might have rarities too, but let's keep it simple
        }

        // Create hero in DB
        const result = await db.createHeroForUser(userId, stats);

        // Fetch the created hero to return full object
        const hero = await db.Hero.findByPk(result.heroId);

        res.json({
            success: true,
            message: `Successfully minted a ${rarity} ${nftType}!`,
            hero: hero
        });

    } catch (error) {
        console.error('Minting error:', error);
        res.status(500).json({ success: false, message: 'Minting failed' });
    }
});

router.post('/mint-bcoin', verifyToken, async (req, res) => {
    try {
        const { userId } = req.user;
        const amount = 100;

        await db.grantRewards(userId, amount, 0); // Grant 100 BCOIN, 0 XP

        res.json({
            success: true,
            message: `Minted ${amount} BCOIN!`,
            amount: amount
        });
    } catch (error) {
        console.error('Mint BCOIN error:', error);
        res.status(500).json({ success: false, message: 'Failed to mint BCOIN' });
    }
});

module.exports = router;
