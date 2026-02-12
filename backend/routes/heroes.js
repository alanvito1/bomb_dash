// backend/routes/heroes.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const nft = require('../nft.js');
const oracle = require('../oracle.js');
const { getExperienceForLevel } = require('../rpg.js');

router.get('/', async (req, res) => {
  try {
    const { userId, address } = req.user;

    const onChainNfts = await nft.getNftsForPlayer(address);
    if (onChainNfts && onChainNfts.length > 0) {
      const dbNfts = await db.Hero.findAll({
        where: { user_id: userId, hero_type: 'nft' },
      });
      const dbNftIds = new Set(dbNfts.map((h) => h.nft_id));

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

    let heroes = await db.getHeroesByUserId(userId);
    if (heroes.length === 0) {
      console.log(`[Sync] User ${userId} has no heroes. Assigning mocks.`);
      await nft.assignMockHeroes(userId);
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
  const { txHash } = req.body;
  const LEVEL_UP_BCOIN_FEE = 1;

  if (!txHash) {
    return res.status(400).json({
      success: false,
      message: 'Transaction hash (txHash) is required.',
    });
  }

  try {
    const heroes = await db.getHeroesByUserId(req.user.userId);
    const hero = heroes.find((h) => h.id.toString() === heroId);

    if (!hero) {
      return res.status(404).json({
        success: false,
        message: "Hero not found or you don't own it.",
      });
    }

    const xpForNextLevel = getExperienceForLevel(hero.level + 1);
    if (hero.xp < xpForNextLevel) {
      return res.status(403).json({
        success: false,
        message: `Insufficient XP to level up. Needs ${xpForNextLevel}, has ${hero.xp}.`,
      });
    }

    await oracle.verifyLevelUpTransaction(
      txHash,
      req.user.address,
      LEVEL_UP_BCOIN_FEE
    );

    const newStats = {
      level: hero.level + 1,
      hp: hero.maxHp + 10,
      maxHp: hero.maxHp + 10,
    };

    await db.updateHeroStats(heroId, newStats);

    const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
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
    if (
      error.message.includes('mismatch') ||
      error.message.includes('not found')
    ) {
      return res.status(400).json({
        success: false,
        message: `Transaction verification failed: ${error.message}`,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during hero level-up.',
    });
  }
});

router.post('/:heroId/initiate-withdrawal', async (req, res) => {
  const { heroId } = req.params;

  try {
    const heroes = await db.getHeroesByUserId(req.user.userId);
    const hero = heroes.find((h) => h.id.toString() === heroId);

    if (!hero) {
      return res.status(404).json({
        success: false,
        message: "Hero not found or you don't own it.",
      });
    }

    if (hero.hero_type !== 'nft' || hero.status !== 'staked') {
      return res.status(400).json({
        success: false,
        message: 'This hero cannot be withdrawn. It must be a staked NFT.',
      });
    }

    const signature = await oracle.signHeroWithdrawal(
      hero.nft_id,
      hero.level,
      hero.xp
    );

    res.json({
      success: true,
      message: 'Withdrawal signature generated successfully.',
      tokenId: hero.nft_id,
      level: hero.level,
      xp: hero.xp,
      signature: signature,
    });
  } catch (error) {
    console.error(`Error initiating withdrawal for hero ${heroId}:`, error);
    if (error.message.includes('Oráculo não está inicializado')) {
      return res.status(503).json({
        success: false,
        message:
          'The Oracle service is currently unavailable. Please try again later.',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during withdrawal initiation.',
    });
  }
});

module.exports = router;
