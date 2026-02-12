// backend/routes/tournaments.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const oracle = require('../oracle.js');
const tournamentService = require('../tournament_service.js');

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

router.get('/open', async (req, res) => {
  try {
    const contract = oracle.getTournamentControllerContract();
    if (!contract) {
      return res.status(503).json({
        success: false,
        message: 'Tournament service is not available.',
      });
    }

    const openTournaments = [];
    const capacities = [4, 8];

    for (const capacity of capacities) {
      const tournamentId = await contract.openTournaments(capacity, 0);

      if (tournamentId && tournamentId.toString() !== '0') {
        const t = await contract.tournaments(tournamentId);
        if (t.isActive && t.participants.length < t.capacity) {
          openTournaments.push({
            id: t.id.toString(),
            creator: t.creator,
            capacity: parseInt(t.capacity.toString()),
            participantCount: t.participants.length,
            entryFee: ethers.utils.formatEther(t.entryFee),
            isActive: t.isActive,
          });
        }
      }
    }
    res.json({ success: true, tournaments: openTournaments });
  } catch (error) {
    console.error('Error fetching open tournaments:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch open tournaments.' });
  }
});

router.post('/', async (req, res) => {
  const { capacity, entryFee, txHash } = req.body;
  if (!capacity || !entryFee || !txHash) {
    return res.status(400).json({
      success: false,
      message: 'capacity, entryFee, and txHash are required.',
    });
  }

  try {
    const tournamentId = await oracle.verifyTournamentCreation(
      txHash,
      req.user.address,
      parseInt(capacity),
      parseFloat(entryFee)
    );
    res.json({
      success: true,
      message: 'Tournament created successfully!',
      tournamentId,
    });
  } catch (error) {
    console.error(
      `Error verifying tournament creation for user ${req.user.address}:`,
      error
    );
    res.status(400).json({
      success: false,
      message: `Transaction verification failed: ${error.message}`,
    });
  }
});

router.post('/:id/join', async (req, res) => {
  const { id } = req.params;
  const { txHash } = req.body;
  if (!txHash) {
    return res
      .status(400)
      .json({ success: false, message: 'txHash is required.' });
  }

  try {
    await oracle.verifyTournamentJoin(txHash, req.user.address, id);
    res.json({
      success: true,
      message: `Successfully joined tournament ${id}.`,
    });
  } catch (error) {
    console.error(
      `Error verifying tournament join for user ${req.user.address}:`,
      error
    );
    res.status(400).json({
      success: false,
      message: `Transaction verification failed: ${error.message}`,
    });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const tournamentId = parseInt(id, 10);
  if (isNaN(tournamentId)) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid tournament ID.' });
  }

  try {
    const state = tournamentService.getTournamentState(tournamentId);
    if (state) {
      res.json({ success: true, tournament: state });
    } else {
      res.status(404).json({
        success: false,
        message: 'Tournament not found or is not active.',
      });
    }
  } catch (error) {
    console.error(
      `Error fetching state for tournament ${tournamentId}:`,
      error
    );
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.post('/report-match', verifyOracle, async (req, res) => {
  const { tournamentId, matchId, winnerAddress } = req.body;
  if (!tournamentId || !matchId || !winnerAddress) {
    return res.status(400).json({
      success: false,
      message: 'tournamentId, matchId, and winnerAddress are required.',
    });
  }

  try {
    await tournamentService.reportTournamentMatchWinner(
      tournamentId,
      matchId,
      winnerAddress
    );
    res.json({
      success: true,
      message: `Match ${matchId} in tournament ${tournamentId} reported successfully.`,
    });
  } catch (error) {
    console.error(`Error reporting tournament match winner:`, error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to report tournament match winner.',
    });
  }
});

module.exports = router;
