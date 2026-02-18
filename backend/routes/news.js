const express = require('express');
const router = express.Router();
const db = require('../database.js');

// Public News Endpoint
router.get('/', async (req, res) => {
  try {
    const news = await db.News.findAll({
      order: [['created_at', 'DESC']],
      limit: 20,
    });
    res.json({ success: true, news });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch news.' });
  }
});

module.exports = router;
