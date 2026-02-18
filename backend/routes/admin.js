const express = require('express');
const router = express.Router();
const db = require('../database.js');

// Middleware to verify admin secret
function verifyAdmin(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'];

  // Use a fallback for local development if not set, or strictly enforce it.
  // Assuming .env is loaded.
  if (!process.env.ADMIN_SECRET) {
    console.warn(
      'ADMIN_SECRET not set in environment. Admin routes might be insecure or broken.'
    );
  }

  if (
    adminSecret &&
    adminSecret === (process.env.ADMIN_SECRET || 'avre-secret-key')
  ) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Invalid admin credentials.',
    });
  }
}

router.use(verifyAdmin);

// --- Settings ---
router.get('/settings', async (req, res) => {
  try {
    const keys = [
      'levelUpCost',
      'monsterScaleFactor',
      'pvpWinXp',
      'pvpCycleOpenHours',
      'pvpCycleClosedHours',
      'monsterXp',
      'xp_multiplier',
    ];
    const settings = {};
    for (const key of keys) {
      const val = await db.getGameSetting(key);
      if (val !== null) settings[key] = val;
    }
    // Handle monsterXp JSON parsing if stored as string
    if (settings.monsterXp) {
      try {
        settings.monsterXp = JSON.parse(settings.monsterXp);
      } catch {
        // Ignore JSON parse error
      }
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      let valToStore = value;
      if (typeof value === 'object') valToStore = JSON.stringify(value);
      await db.updateGameSetting(key, valToStore.toString());
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Players ---
router.get('/players', async (req, res) => {
  try {
    const players = await db.getAllPlayers();
    res.json({ success: true, players });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/player/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const stats = req.body;
    await db.updatePlayerStats(id, stats);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- News ---
router.get('/news', async (req, res) => {
  try {
    const news = await db.News.findAll({
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/news', async (req, res) => {
  try {
    const { title, category, content, image_url } = req.body;
    if (!title || !category || !content) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing required fields.' });
    }
    const news = await db.News.create({ title, category, content, image_url });
    res.json({ success: true, news });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.News.destroy({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
