// backend/routes/ranking.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');

router.get('/', async (req, res) => {
    try {
        const rankingData = await db.getRanking(10); // Pega o Top 10
        const formattedRanking = rankingData.map((entry, index) => ({
            rank: index + 1,
            address: entry.User.wallet_address,
            wave: entry.highest_wave_reached,
        }));
        res.json({ success: true, ranking: formattedRanking });
    } catch (error) {
        console.error("Error fetching ranking:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch ranking data.' });
    }
});

module.exports = router;
