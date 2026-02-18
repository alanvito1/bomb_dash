// backend/routes/game.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const { Item, UserItem } = require('../database.js');
const admin = require('../admin.js');
const oracle = require('../oracle.js');
const { ethers } = require('ethers');
// const soloRewardService = require('../solo_reward_service.js'); // Removed

// Define hero upgrades logic (moved from external or previous inline)
const heroUpgrades = {
  damage: {
    cost: (hero) => 10 * hero.level, // Example cost formula
    effect: (hero) => ({ damage: hero.damage + 1 }),
  },
  health: {
    cost: (hero) => 10 * hero.level,
    effect: (hero) => ({ maxHp: hero.maxHp + 10, hp: hero.maxHp + 10 }),
  },
  speed: {
    cost: (hero) => 15 * hero.level,
    effect: (hero) => ({ speed: hero.speed + 5 }),
  },
};

router.get('/settings', async (req, res) => {
  try {
    const settings = await admin.getGameSettings();
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
    res.status(500).json({ success: false, message: 'Failed to fetch bestiary.' });
  }
});

router.post('/matches/complete', async (req, res) => {
  const { heroId, xpGained, coinsCollected, bestiary, proficiency, droppedItems } = req.body;

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
    const heroExists = heroes.some((h) => h.id === heroId);

    if (!heroExists) {
      return res.status(403).json({
        success: false,
        message:
          'The specified hero does not belong to the authenticated user.',
      });
    }

    // Award Hero XP
    await db.addXpToHero(heroId, xpGained);

    // Award User XP and Coins (Session Loot)
    // Note: grantRewards handles level-ups internally
    await db.grantRewards(req.user.userId, coins, xpGained);

    // --- Dropped Items Processing ---
    // If client sends dropped items (Option A: Client-Side Loot), verify and add them.
    // In a production secure env, we would validate RNG seeds here.
    if (droppedItems && Array.isArray(droppedItems) && droppedItems.length > 0) {
      for (const itemName of droppedItems) {
        // Find item by name (Client sends names like "Rusty Sword", "Scrap Metal")
        const itemDef = await Item.findOne({ where: { name: itemName } });
        if (itemDef) {
           const existingStack = await UserItem.findOne({
             where: { user_id: req.user.userId, item_id: itemDef.id }
           });
           if (existingStack) {
             existingStack.quantity += 1;
             await existingStack.save();
           } else {
             await UserItem.create({
               user_id: req.user.userId,
               item_id: itemDef.id,
               quantity: 1
             });
           }
        }
      }
    }

    // --- Phase 2: Infinite Grind ---
    // 1. Update Bestiary
    if (bestiary && typeof bestiary === 'object') {
      await db.updateBestiary(req.user.userId, bestiary);
    }

    // 2. Update Proficiency
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
           agilityXp: agilityXp
         });
      }
    }

    const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
    const updatedHero = updatedHeroes.find((h) => h.id === heroId);

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
  const { heroId, upgradeType, txHash } = req.body;

  if (!heroId || !upgradeType || !txHash) {
    return res.status(400).json({
      success: false,
      message: 'heroId, upgradeType, and txHash are required.',
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

    const expectedCost = heroUpgrades[upgradeType].cost(hero);

    await oracle.verifyUpgradeTransaction(
      txHash,
      req.user.address,
      expectedCost
    );

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
    console.error(
      `Error processing upgrade for hero ${heroId} with tx ${txHash}:`,
      error
    );
    if (
      error.message.includes('mismatch') ||
      error.message.includes('not found') ||
      error.message.includes('failed')
    ) {
      return res.status(400).json({
        success: false,
        message: `Transaction verification failed: ${error.message}`,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error during hero upgrade.',
    });
  }
});

router.post('/altar/donate', async (req, res) => {
  const { txHash, amount } = req.body;
  if (!txHash || !amount) {
    return res.status(400).json({
      success: false,
      message: 'txHash and amount are required',
    });
  }

  try {
    let provider = oracle.getProvider();
    if (!provider) {
      await oracle.initOracle();
      provider = oracle.getProvider();
    }

    if (!provider) {
      throw new Error('Blockchain provider not available');
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new Error('Transaction failed or not found');
    }

    // BCOIN Transfer Event Signature: Transfer(address indexed from, address indexed to, uint256 value)
    // Topic0: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef
    const TRANSFER_TOPIC =
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const ALTAR_ADDRESS = process.env.ALTAR_WALLET_ADDRESS;

    if (!ALTAR_ADDRESS) throw new Error('ALTAR_WALLET_ADDRESS not configured');

    // Normalize addresses for comparison (remove 0x, lowercase)
    const altarLower = ALTAR_ADDRESS.toLowerCase().replace('0x', '');
    const userLower = req.user.address.toLowerCase().replace('0x', '');

    // Find relevant log: Transfer to Altar
    // Topics: [Signature, From, To] (To is index 2)
    const log = receipt.logs.find(
      (l) =>
        l.topics[0] === TRANSFER_TOPIC &&
        l.topics[2].toLowerCase().includes(altarLower)
    );

    if (!log) {
      throw new Error('No transfer to Altar found in this transaction');
    }

    // Verify 'from' (topic 1) matches user
    if (!log.topics[1].toLowerCase().includes(userLower)) {
      throw new Error('Transaction sender does not match user address');
    }

    // Verify amount (data is hex)
    const value = BigInt(log.data);
    // Assume input 'amount' is sent as string representing Wei/Raw units
    // or verify logic based on game design. Let's assume input is BCOIN float for now?
    // User input is usually what they claimed to send.
    // If we expect "10" BCOIN, we check 10 * 10^18.

    const expectedWei = ethers.parseEther(amount.toString());

    if (value < expectedWei) {
      throw new Error(
        `Transfer amount ${ethers.formatEther(
          value
        )} is less than declared ${amount}`
      );
    }

    // Update DB (storing as Integer BCOIN)
    const bcoinAmount = Math.floor(parseFloat(ethers.formatEther(value)));
    await db.addDonationToAltar(bcoinAmount, txHash);

    res.json({
      success: true,
      message: 'Donation verified',
      donated: bcoinAmount,
    });
  } catch (error) {
    console.error('Altar donation error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
