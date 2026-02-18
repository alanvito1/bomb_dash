const express = require('express');
const router = express.Router();
const { User, Guild, GuildMember } = require('../database');
const { verifyToken } = require('./auth');

// Create a Guild
router.post('/create-guild', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, tag } = req.body;

    if (!name || !tag) {
      return res.status(400).json({ success: false, message: 'Name and Tag are required.' });
    }

    // Validate Tag (3-4 uppercase alphanumeric)
    if (!/^[A-Z0-9]{3,4}$/.test(tag)) {
      return res.status(400).json({ success: false, message: 'Tag must be 3-4 uppercase alphanumeric characters.' });
    }

    // Check if user is already in a guild
    const existingMember = await GuildMember.findOne({ where: { user_id: userId } });
    if (existingMember) {
      return res.status(400).json({ success: false, message: 'You are already in a guild.' });
    }

    // Check cost (100 BCOIN)
    const user = await User.findByPk(userId);
    if (user.coins < 100) {
      return res.status(400).json({ success: false, message: 'Insufficient BCOIN (100 required).' });
    }

    // Create Guild
    const guild = await Guild.create({ name, tag, owner_id: userId });

    // Add owner as member (leader)
    await GuildMember.create({ guild_id: guild.id, user_id: userId, role: 'leader' });

    // Deduct coins
    user.coins -= 100;
    await user.save();

    res.json({ success: true, guild });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
       return res.status(400).json({ success: false, message: 'Guild name or tag already taken.' });
    }
    console.error('Create Guild Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Join a Guild
router.post('/join-guild', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { guildId } = req.body;

    if (!guildId) {
      return res.status(400).json({ success: false, message: 'Guild ID required.' });
    }

    const existingMember = await GuildMember.findOne({ where: { user_id: userId } });
    if (existingMember) {
      return res.status(400).json({ success: false, message: 'You are already in a guild.' });
    }

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ success: false, message: 'Guild not found.' });
    }

    await GuildMember.create({ guild_id: guild.id, user_id: userId, role: 'member' });

    res.json({ success: true, message: `Joined guild ${guild.name}` });
  } catch (error) {
    console.error('Join Guild Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// List Guilds
router.get('/guilds', async (req, res) => {
  try {
    const guilds = await Guild.findAll({
      include: [{ model: GuildMember, attributes: ['id'] }] // Count members roughly
    });

    const result = guilds.map(g => ({
      id: g.id,
      name: g.name,
      tag: g.tag,
      memberCount: g.GuildMembers.length
    }));

    res.json({ success: true, guilds: result });
  } catch (error) {
    console.error('List Guilds Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Get My Guild
router.get('/my-guild', verifyToken, async (req, res) => {
  // STUB: Return null guild for UI/UX Task Force
  res.json({ success: true, guild: null });
});

module.exports = router;
