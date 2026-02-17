// backend/routes/pvp.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const pvpService = require('../pvp_service.js');
const gameState = require('../game_state.js');
const matchmaking = require('../matchmaking.js');

function verifyOracle(req, res, next) {
  const oracleSecret = req.headers['x-oracle-secret'];
  if (oracleSecret && oracleSecret === process.env.ADMIN_SECRET) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Acesso negado. Requisição inválida do Oráculo.',
    });
  }
}

router.get('/status', (req, res) => {
  res.json({ success: true, status: gameState.getPvpStatus() });
});

router.get('/queue/status', async (req, res) => {
  try {
    const status = await matchmaking.getQueueStatus(req.user.userId);
    res.json({ success: true, ...status });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to get queue status' });
  }
});

router.get('/wager/tiers', async (req, res) => {
  try {
    const tiers = await db.getWagerTiers();
    res.json({ success: true, tiers });
  } catch (error) {
    console.error('Error fetching wager tiers:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch wager tiers.' });
  }
});

router.post('/wager/enter', async (req, res) => {
  const { heroId, tierId } = req.body;
  if (!heroId || !tierId) {
    return res
      .status(400)
      .json({ success: false, message: 'heroId and tierId are required.' });
  }

  try {
    const result = await pvpService.enterWagerQueue(
      req.user.userId,
      heroId,
      tierId
    );
    res.json(result);
  } catch (error) {
    console.error(
      `Error entering wager queue for user ${req.user.userId}:`,
      error
    );
    if (
      error.message.includes('does not have enough XP') ||
      error.message.includes('BETA RESTRICTION')
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error while entering wager queue.',
    });
  }
});

router.post('/wager/report', verifyOracle, async (req, res) => {
  const {
    matchId,
    winnerAddress,
    loserAddress,
    winnerHeroId,
    loserHeroId,
    tierId,
  } = req.body;
  if (
    !matchId ||
    !winnerAddress ||
    !loserAddress ||
    !winnerHeroId ||
    !loserHeroId ||
    !tierId
  ) {
    return res.status(400).json({
      success: false,
      message:
        'matchId, winnerAddress, loserAddress, winnerHeroId, loserHeroId, and tierId are all required.',
    });
  }

  try {
    const result = await pvpService.reportWagerMatch(
      matchId,
      winnerAddress,
      loserAddress,
      winnerHeroId,
      loserHeroId,
      tierId
    );
    res.json(result);
  } catch (error) {
    console.error(
      `Error reporting wager match result for match ${matchId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: 'Internal server error while reporting wager match result.',
    });
  }
});

router.post('/bot-match/report', async (req, res) => {
  const { heroId, tier } = req.body;
  if (!heroId || !tier) {
    return res
      .status(400)
      .json({ success: false, message: 'heroId and tier are required.' });
  }

  try {
    const result = await pvpService.reportBotMatch(
      req.user.userId,
      heroId,
      tier
    );
    res.json(result);
  } catch (error) {
    console.error(
      `Error reporting bot match result for user ${req.user.userId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: 'Internal server error while reporting bot match result.',
    });
  }
});

router.post('/ranked/enter', async (req, res) => {
  const { heroId, txHash } = req.body;
  if (!heroId || !txHash) {
    return res
      .status(400)
      .json({ success: false, message: 'heroId e txHash são obrigatórios.' });
  }

  try {
    const result = await pvpService.enterRankedQueue(
      req.user.userId,
      heroId,
      req.user.address,
      txHash
    );
    res.json(result);
  } catch (error) {
    console.error(
      `Erro ao entrar na fila ranqueada para o usuário ${req.user.userId}:`,
      error
    );
    if (error.message.includes('não corresponde')) {
      return res.status(400).json({
        success: false,
        message: `Falha na verificação da transação: ${error.message}`,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao entrar na fila.',
    });
  }
});

router.post('/ranked/report', verifyOracle, async (req, res) => {
  const { matchId, winnerAddress } = req.body;
  if (!matchId || !winnerAddress) {
    return res.status(400).json({
      success: false,
      message: 'matchId e winnerAddress são obrigatórios.',
    });
  }

  try {
    const result = await pvpService.reportRankedMatch(matchId, winnerAddress);
    res.json(result);
  } catch (error) {
    console.error(
      `Erro ao reportar resultado da partida ranqueada ${matchId}:`,
      error
    );
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao reportar o resultado.',
    });
  }
});

router.post('/submit', async (req, res) => {
  const {
    matchId,
    score,
    damageDealt,
    durationSeconds,
    enemiesKilled,
    heroId,
  } = req.body;

  if (
    !matchId ||
    typeof score !== 'number' ||
    typeof damageDealt !== 'number' ||
    typeof durationSeconds !== 'number' ||
    typeof heroId === 'undefined'
  ) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  try {
    const result = await pvpService.submitMatchResult(
      matchId,
      req.user.userId,
      heroId,
      score,
      damageDealt,
      durationSeconds,
      enemiesKilled
    );
    res.json(result);
  } catch (error) {
    console.error(`PvP Submit Error: ${error.message}`);
    if (
      error.message.includes('Security Violation') ||
      error.message.includes('flagged')
    ) {
      return res.status(403).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
