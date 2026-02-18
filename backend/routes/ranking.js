// backend/routes/ranking.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

router.get('/', async (req, res) => {
  // STUB: Return empty ranking for UI/UX Task Force
  res.json({ success: true, ranking: [] });
});

module.exports = router;
