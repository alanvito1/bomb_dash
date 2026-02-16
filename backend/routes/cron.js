const express = require('express');
const router = express.Router();
const matchmaking = require('../matchmaking');

router.get('/matchmaking', async (req, res) => {
  // Check for CRON_SECRET if it's set in the environment
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    await matchmaking.processQueue();
    res.json({ success: true, message: 'Matchmaking processed' });
  } catch (error) {
    console.error('Cron job failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
