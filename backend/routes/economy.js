const express = require('express');
const router = express.Router();
const { User, UserItem, Item, GameSetting } = require('../database');
const { verifyToken } = require('./auth');
const supabaseService = require('../supabase_service');

const RECIPES = {
  'Rusty Sword': 'Iron Katana',
  'Leather Vest': 'Nano Vest',
  // Future: Iron Katana -> Titanium Blade
  // Future: Nano Vest -> Cyber Armor
};

const CRAFT_COST = 50; // BCOIN or Gold

router.get('/inventory', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const inventory = await UserItem.findAll({
      where: { user_id: userId },
      include: [Item]
    });
    res.json({ success: true, inventory });
  } catch (error) {
    console.error('Inventory Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.post('/craft', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { item1Id, item2Id } = req.body; // UserItem IDs

    if (!item1Id || !item2Id) {
      return res.status(400).json({ success: false, message: 'Select items to craft.' });
    }

    const user = await User.findByPk(userId);
    if (user.coins < CRAFT_COST) {
      return res.status(400).json({ success: false, message: `Insufficient BCOIN (${CRAFT_COST} required).` });
    }

    let uItem1, uItem2;

    if (item1Id === item2Id) {
      // Same stack case
      uItem1 = await UserItem.findByPk(item1Id, { include: [Item] });
      if (!uItem1 || uItem1.user_id !== userId) {
        return res.status(400).json({ success: false, message: 'Item not found.' });
      }
      if (uItem1.quantity < 2) {
        return res.status(400).json({ success: false, message: 'Need at least 2 items in stack.' });
      }
      uItem2 = uItem1; // Reference same object
    } else {
      // Different stacks case
      [uItem1, uItem2] = await Promise.all([
        UserItem.findByPk(item1Id, { include: [Item] }),
        UserItem.findByPk(item2Id, { include: [Item] })
      ]);

      if (!uItem1 || !uItem2 || uItem1.user_id !== userId || uItem2.user_id !== userId) {
        return res.status(400).json({ success: false, message: 'Invalid items.' });
      }
      if (uItem1.Item.name !== uItem2.Item.name) {
        return res.status(400).json({ success: false, message: 'Items must be identical.' });
      }
    }

    const targetItemName = RECIPES[uItem1.Item.name];
    if (!targetItemName) {
      return res.status(400).json({ success: false, message: 'This item cannot be upgraded.' });
    }

    const targetItem = await Item.findOne({ where: { name: targetItemName } });
    if (!targetItem) {
      return res.status(500).json({ success: false, message: 'Target item definition missing.' });
    }

    // Deduct Cost
    user.coins -= CRAFT_COST;
    await user.save();

    // Update Reward Pool
    const pool = await GameSetting.findOne({ where: { key: 'global_reward_pool' } });
    if (pool) {
      pool.value = (parseInt(pool.value || '0') + CRAFT_COST).toString();
      await pool.save();
    }

    // Consumption Logic
    if (item1Id === item2Id) {
       uItem1.quantity -= 2;
       if (uItem1.quantity <= 0) await uItem1.destroy();
       else await uItem1.save();
    } else {
       // Decrement/Destroy Item 1
       uItem1.quantity -= 1;
       if (uItem1.quantity <= 0) await uItem1.destroy();
       else await uItem1.save();

       // Decrement/Destroy Item 2
       uItem2.quantity -= 1;
       if (uItem2.quantity <= 0) await uItem2.destroy();
       else await uItem2.save();
    }

    // RNG (70% Success)
    const success = Math.random() < 0.7;

    if (success) {
      // Grant New Item
      // Check if user already has a stack of the target item
      const existingStack = await UserItem.findOne({
          where: { user_id: userId, item_id: targetItem.id }
      });

      if (existingStack) {
          existingStack.quantity += 1;
          await existingStack.save();
      } else {
          await UserItem.create({
            user_id: userId,
            item_id: targetItem.id,
            quantity: 1
          });
      }

      // Broadcast High Tier
      if (targetItem.rarity === 'Legendary' || targetItem.rarity === 'Mythic') {
         supabaseService.broadcastMessage('system-message', {
             message: `${user.wallet_address.substring(0,6)}... crafted a ${targetItem.name}!`
         });
      }

      res.json({ success: true, result: 'success', itemName: targetItem.name, message: `Success! Crafted ${targetItem.name}` });
    } else {
      // Failure (Bricking) - Grant Scrap Metal
      const scrapItem = await Item.findOne({ where: { name: 'Scrap Metal' } });

      if (scrapItem) {
        const existingScrap = await UserItem.findOne({
            where: { user_id: userId, item_id: scrapItem.id }
        });

        if (existingScrap) {
            existingScrap.quantity += 1;
            await existingScrap.save();
        } else {
            await UserItem.create({
                user_id: userId,
                item_id: scrapItem.id,
                quantity: 1
            });
        }
      }

      res.json({ success: true, result: 'failure', message: 'Critical Failure! Items lost, but you salvaged some Scrap Metal.' });
    }

  } catch (error) {
    console.error('Crafting Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

router.get('/reward-pool', async (req, res) => {
  try {
    const pool = await GameSetting.findOne({ where: { key: 'global_reward_pool' } });
    res.json({ success: true, pool: parseInt(pool?.value || '0') });
  } catch (error) {
    console.error('Reward Pool Error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
