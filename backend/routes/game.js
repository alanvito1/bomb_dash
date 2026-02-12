// backend/routes/game.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const admin = require('../admin.js');
const oracle = require('../oracle.js');
const _soloRewardService = require('../solo_reward_service.js');

// Define upgrade costs and effects
const heroUpgrades = {
  speed: {
    cost: (hero) => 10 + hero.level * 2,
    effect: (hero) => ({ speed: hero.speed + 10 }),
  },
  power: {
    cost: (hero) => 20 + hero.level * 5,
    effect: (hero) => ({ damage: hero.damage + 2 }),
  },
  range: {
    cost: (hero) => 15 + hero.level * 3,
    effect: (hero) => ({ bombSize: hero.bombSize + 0.5 }),
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

router.post('/matches/complete', async (req, res) => {
  const { heroId, xpGained } = req.body;

  if (!heroId || typeof xpGained === 'undefined' || xpGained < 0) {
    return res.status(400).json({
      success: false,
      message:
        'Request must include a valid heroId and a non-negative xpGained.',
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

    await db.addXpToHero(heroId, xpGained);
    await db.addXpToUser(req.user.address, xpGained);

    const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
    const updatedHero = updatedHeroes.find((h) => h.id === heroId);

    res.json({
      success: true,
      message: `Successfully awarded ${xpGained} XP to hero ${heroId}.`,
      hero: updatedHero,
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

module.exports = router;
