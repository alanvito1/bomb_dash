/* eslint-disable no-undef */
const express = require('express');
const router = express.Router();
const tournamentService = require('../tournament_service');

router.get('/active', async (req, res) => {
  try {
    const tournament = await tournamentService.getActiveTournament();
    res.json({ success: true, tournament });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/register', async (req, res) => {
  const { tournamentId, heroId } = req.body;
  const userAddress = req.user.address;

  try {
    const result = await tournamentService.registerPlayer(
      tournamentId,
      userAddress,
      heroId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bracket/:tournamentId', async (req, res) => {
  try {
    const bracket = await tournamentService.getBracket(req.params.tournamentId);
    res.json({ success: true, bracket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/match-result', async (req, res) => {
  // Only admin or oracle should call this in a real scenario
  // For now, we'll assume it's protected by the verifyToken middleware and some admin check
  const { tournamentId, matchId, winner } = req.body;
  try {
    // In a real implementation, this would likely involve verifying a signature
    // or checking that the caller is the authorized tournament controller.
    // For this MVP/refactor, we'll placeholder it.
    console.log(
      `Reporting match result: T=${tournamentId}, M=${matchId}, W=${winner}`
    );
    res.json({ success: true, message: 'Match result recorded (placeholder)' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/history', async (req, res) => {
  // Placeholder for past tournaments
  res.json({ success: true, history: [] });
});

module.exports = router;
