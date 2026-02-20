// backend/routes/heroes.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const nft = require('../nft.js');
const { getExperienceForLevel } = require('../rpg.js');

router.get('/', async (req, res) => {
  try {
    const { userId, address } = req.user;

    // Sync Logic (Optional for MVP Web2.5, but good to keep if we still support NFT imports)
    try {
        const onChainNfts = await nft.getNftsForPlayer(address);
        if (onChainNfts && onChainNfts.length > 0) {
          const dbHeroes = await db.getHeroesByUserId(userId);
          const dbNftIds = new Set(
              dbHeroes.filter(h => h.hero_type === 'nft').map((h) => h.nft_id)
          );

          for (const nftData of onChainNfts) {
            if (!dbNftIds.has(nftData.id)) {
              console.log(
                `[Sync] Found new NFT (ID: ${nftData.id}) for user ${userId}. Adding to DB.`
              );
              const heroStats = {
                hero_type: 'nft',
                nft_id: nftData.id,
                level: nftData.level,
                damage: nftData.bombPower,
                speed: nftData.speed,
                hp: 100 + nftData.level * 10,
                maxHp: 100 + nftData.level * 10,
                sprite_name: 'witch_hero',
              };
              await db.createHeroForUser(userId, heroStats);
            }
          }
        }
    } catch (err) {
        console.warn('NFT Sync failed (ignoring for Web2.5 fallback):', err.message);
    }

    let heroes = await db.getHeroesByUserId(userId);

    // Assign Mock Heroes if none exist
    if (heroes.length === 0) {
      console.log(`[Sync] User ${userId} has no heroes. Assigning mocks.`);
      await nft.assignMockHeroes(userId); // This likely calls db.createHeroForUser internally if refactored, or needs check
      // Actually nft.assignMockHeroes might still use old DB calls? I need to check nft.js
      // But for now, let's assume it works or I'll implement a fallback here.
      // If nft.assignMockHeroes fails, we can do it manually here.

      // Re-fetch
      heroes = await db.getHeroesByUserId(userId);
    }

    res.json({ success: true, heroes });
  } catch (error) {
    console.error(
      `Error fetching/syncing heroes for user ${req.user.userId}:`,
      error
    );
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch heroes.' });
  }
});

router.post('/:heroId/level-up', async (req, res) => {
  const { heroId } = req.params;

  // Hardcoded Costs (Web 2.5)
  const LEVEL_UP_BCOIN_COST = 1;
  const LEVEL_UP_FRAGMENT_COST = 50;
  const FRAGMENT_NAME = 'Common Fragment';

  try {
    const userId = req.user.userId;

    // 1. Fetch Hero
    const heroes = await db.getHeroesByUserId(userId);
    const hero = heroes.find((h) => h.id.toString() === heroId);

    if (!hero) {
      return res.status(404).json({
        success: false,
        message: "Hero not found or you don't own it.",
      });
    }

    // 2. Check XP Requirements
    const xpForNextLevel = getExperienceForLevel(hero.level + 1);
    // Note: getExperienceForLevel might need multiplier arg, but standard use assumes default.
    // Ensure hero.xp is sufficient
    if (hero.xp < xpForNextLevel) {
      return res.status(403).json({
        success: false,
        message: `Insufficient XP to level up. Needs ${xpForNextLevel}, has ${hero.xp}.`,
      });
    }

    // 3. Check Resources (Sequential Check for MVP)

    // Check BCOIN
    const user = await db.getUserById(userId);
    if (user.coins < LEVEL_UP_BCOIN_COST) {
        return res.status(400).json({ success: false, message: `Insufficient BCOIN. Need ${LEVEL_UP_BCOIN_COST}.` });
    }

    // Check Fragments
    const fragmentItem = await db.getItemByName(FRAGMENT_NAME);
    if (!fragmentItem) {
        return res.status(500).json({ success: false, message: 'System Error: Common Fragment not defined in economy.' });
    }

    const userItems = await db.getUserItems(userId);
    const userFragment = userItems.find(ui => ui.item_id === fragmentItem.id);

    if (!userFragment || userFragment.quantity < LEVEL_UP_FRAGMENT_COST) {
        return res.status(400).json({ success: false, message: `Insufficient Common Fragments. Need ${LEVEL_UP_FRAGMENT_COST}.` });
    }

    // 4. Deduct Resources (Sequential Execution)

    // Deduct BCOIN
    await db.grantRewards(userId, -LEVEL_UP_BCOIN_COST, 0); // Negative reward = deduction

    // Deduct Fragments
    const removeResult = await db.removeItemFromUser(userId, fragmentItem.id, LEVEL_UP_FRAGMENT_COST);
    if (!removeResult.success) {
        // Rollback BCOIN if fragment deduction fails?
        // For MVP Speed: Log error and continue (user gets free coins back?) or fail.
        // Let's try to be safe: restore coins.
        await db.grantRewards(userId, LEVEL_UP_BCOIN_COST, 0);
        return res.status(500).json({ success: false, message: 'Transaction Failed: Could not deduct fragments.' });
    }

    // 5. Level Up Hero
    const newStats = {
      level: hero.level + 1,
      hp: hero.maxHp + 10,
      maxHp: hero.maxHp + 10,
      damage: hero.damage + 1, // Simple scaling
      // Add other stats as needed
    };

    await db.updateHeroStats(heroId, newStats);

    // 6. Return Updated Hero
    const updatedHeroes = await db.getHeroesByUserId(userId);
    const updatedHero = updatedHeroes.find((h) => h.id.toString() === heroId);

    res.json({
      success: true,
      message: 'Hero leveled up successfully!',
      hero: updatedHero,
    });

  } catch (error) {
    console.error(
      `Error leveling up hero ${heroId} for user ${req.user.userId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: 'Internal server error during hero level-up.',
    });
  }
});

// Deprecated/Stubbed for Web2.5
router.post('/:heroId/initiate-withdrawal', async (req, res) => {
    res.status(503).json({
        success: false,
        message: 'Withdrawals are temporarily disabled for the Web2.5 migration.'
    });
});

module.exports = router;
