// backend/routes/ranking.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

router.get('/', async (req, res) => {
  // STUB: Return fake ranking for UI/UX Task Force
  res.json({
    success: true,
    ranking: [
      { name: 'AlphaUser', score: 1000 },
      { name: 'BetaTester', score: 850 },
      { name: 'OmegaPlayer', score: 720 },
    ],
  });
});

module.exports = router;
