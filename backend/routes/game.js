// backend/routes/game.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { ethers } = require('ethers');

// Define hero upgrades logic (moved from external or previous inline)
const heroUpgrades = {
  damage: {
    cost: (hero) => 10 * hero.level, // Example cost formula
    effect: (hero) => ({ damage: (hero.damage || 0) + 1 }),
  },
  health: {
    cost: (hero) => 10 * hero.level,
    effect: (hero) => ({
      maxHp: (hero.max_hp || hero.maxHp || 100) + 10,
      hp: (hero.max_hp || hero.maxHp || 100) + 10,
    }),
  },
  speed: {
    cost: (hero) => 15 * hero.level,
    effect: (hero) => ({ speed: (hero.speed || 0) + 5 }),
  },
};

router.get('/settings', async (req, res) => {
  try {
    // Basic settings stub
    const settings = [
      { key: 'xp_multiplier', value: '1.0' },
      { key: 'global_reward_pool', value: '1000000' },
    ];
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Erro em /api/game/settings:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar as configurações do jogo.',
    });
  }
});

router.post('/checkpoint', async (req, res) => {
  const { waveNumber } = req.body;
  if (typeof waveNumber === 'undefined' || waveNumber < 0) {
    return res.status(400).json({
      success: false,
      message:
        'O número da onda (waveNumber) é obrigatório e não pode ser negativo.',
    });
  }

  try {
    const userId = req.user.userId;
    const result = await db.savePlayerCheckpoint(userId, waveNumber);
    if (result.updated) {
      res.json({
        success: true,
        message: `Checkpoint salvo com sucesso na onda ${waveNumber}.`,
      });
    } else {
      res.json({
        success: true,
        message: `Progresso atual (${waveNumber}) não é maior que o checkpoint salvo.`,
      });
    }
  } catch (error) {
    console.error(`Erro ao salvar checkpoint:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao salvar o checkpoint.',
    });
  }
});

router.get('/bestiary', async (req, res) => {
  try {
    const bestiary = await db.getBestiary(req.user.userId);
    res.json({ success: true, bestiary });
  } catch (error) {
    console.error('Error fetching bestiary:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch bestiary.' });
  }
});

router.post('/matches/complete', async (req, res) => {
  const {
    heroId,
    xpGained,
    coinsCollected,
    bestiary,
    proficiency,
    droppedItems,
  } = req.body;

  if (!heroId || typeof xpGained === 'undefined' || xpGained < 0) {
    return res.status(400).json({
      success: false,
      message:
        'Request must include a valid heroId and a non-negative xpGained.',
    });
  }

  const coins = coinsCollected || 0;
  if (coins < 0) {
    return res.status(400).json({
      success: false,
      message: 'Coins collected cannot be negative.',
    });
  }

  try {
    const heroes = await db.getHeroesByUserId(req.user.userId);
    // Note: getHeroesByUserId returns camelCase props now
    const heroExists = heroes.some(
      (h) => h.id.toString() === heroId.toString()
    );

    if (!heroExists) {
      return res.status(403).json({
        success: false,
        message:
          'The specified hero does not belong to the authenticated user.',
      });
    }

    // 1. Award Hero XP
    await db.addXpToHero(heroId, xpGained);

    // 2. Award User XP and Coins (Session Loot)
    // Note: grantRewards handles level-ups internally
    await db.grantRewards(req.user.userId, coins, xpGained);

    // 3. Process Dropped Items
    if (
      droppedItems &&
      Array.isArray(droppedItems) &&
      droppedItems.length > 0
    ) {
      for (const itemName of droppedItems) {
        // Find item by name (Client sends names like "Rusty Sword", "Scrap Metal")
        const itemDef = await db.getItemByName(itemName);
        if (itemDef) {
          await db.addItemToUser(req.user.userId, itemDef.id, 1);
        }
      }
    }

    // 4. Update Bestiary
    if (bestiary && typeof bestiary === 'object') {
      await db.updateBestiary(req.user.userId, bestiary);
    }

    // 5. Update Proficiency
    if (proficiency) {
      const { bombHits = 0, distance = 0 } = proficiency;

      // Conversion Rates:
      // 1 Hit = 1 XP
      // 100 Distance Units = 1 XP
      const bombXp = Math.floor(bombHits);
      const agilityXp = Math.floor(distance / 100);

      if (bombXp > 0 || agilityXp > 0) {
        await db.updateHeroProficiency(heroId, {
          bombMasteryXp: bombXp,
          agilityXp: agilityXp,
        });
      }
    }

    const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
    const updatedHero = updatedHeroes.find(
      (h) => h.id.toString() === heroId.toString()
    );

    res.json({
      success: true,
      message: `Successfully awarded ${xpGained} XP and ${coins} Coins to hero ${heroId}.`,
      hero: updatedHero,
      coinsEarned: coins,
    });
  } catch (error) {
    console.error(`Error completing match for hero ${heroId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while completing match.',
    });
  }
});

router.post('/user/stats', async (req, res) => {
  const { heroId, upgradeType } = req.body; // Removed txHash for Web2.5

  if (!heroId || !upgradeType) {
    return res.status(400).json({
      success: false,
      message: 'heroId and upgradeType are required.',
    });
  }

  if (!heroUpgrades[upgradeType]) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid upgrade type provided.' });
  }

  try {
    const heroes = await db.getHeroesByUserId(req.user.userId);
    const hero = heroes.find((h) => h.id.toString() === heroId.toString());

    if (!hero) {
      return res.status(404).json({
        success: false,
        message: "Hero not found or you don't own it.",
      });
    }

    // Web 2.5 Logic: Pay with BCOIN directly
    const expectedCost = heroUpgrades[upgradeType].cost(hero);
    const user = await db.getUserById(req.user.userId);

    if (user.coins < expectedCost) {
      return res
        .status(400)
        .json({
          success: false,
          message: `Insufficient BCOIN. Need ${expectedCost}.`,
        });
    }

    // Deduct Cost
    await db.grantRewards(req.user.userId, -expectedCost, 0);

    // Apply Upgrade
    const newStats = heroUpgrades[upgradeType].effect(hero);
    await db.updateHeroStats(heroId, newStats);

    const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
    const updatedHero = updatedHeroes.find(
      (h) => h.id.toString() === heroId.toString()
    );

    res.json({
      success: true,
      message: `Hero ${upgradeType} upgraded successfully!`,
      hero: updatedHero,
    });
  } catch (error) {
    console.error(`Error processing upgrade for hero ${heroId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during hero upgrade.',
    });
  }
});

router.post('/altar/donate', async (req, res) => {
  // Stubbed for Web 2.5 - Accepting any donation as a simulation or disabled
  // If we want to simulate:
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ success: false, message: 'Amount required' });
  }

  try {
    // Logic: Deduct BCOIN from user instead of verifying on-chain tx
    const user = await db.getUserById(req.user.userId);
    if (user.coins < amount) {
      return res
        .status(400)
        .json({ success: false, message: 'Insufficient BCOIN' });
    }

    await db.grantRewards(req.user.userId, -amount, 0);
    await db.addDonationToAltar(amount, 'offchain_donation_' + Date.now());

    res.json({
      success: true,
      message: 'Donation verified (Web2.5)',
      donated: amount,
    });
  } catch (error) {
    console.error('Altar donation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
