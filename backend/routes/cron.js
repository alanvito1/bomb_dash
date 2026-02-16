const express = require('express');
const router = express.Router();
const matchmaking = require('../matchmaking');
const db = require('../database');
const oracle = require('../oracle');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');

// Middleware to secure Cron jobs (Vercel Cron Header)
function verifyCron(req, res, next) {
  // Vercel sets this header for cron jobs
  if (req.headers['x-vercel-cron'] === '1') {
    return next();
  }
  // Fallback for local testing or custom secret
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      return next();
    }
  }

  // In local development, we might want to allow it if no secret is set
  if (process.env.NODE_ENV !== 'production' && !process.env.CRON_SECRET) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

// 1. Matchmaking Cron (Existing)
router.get('/matchmaking', verifyCron, async (req, res) => {
  try {
    await matchmaking.processQueue();
    res.json({ success: true, message: 'Matchmaking processed' });
  } catch (error) {
    console.error('Matchmaking Cron failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Staking Sync Cron
router.get('/sync-staking', verifyCron, async (req, res) => {
  try {
    const isOracleReady = await oracle.initOracle();
    if (!isOracleReady) {
      throw new Error('Oracle initialization failed');
    }

    const provider = oracle.getProvider();
    if (!provider) throw new Error('Provider not initialized');

    const HERO_STAKING_ADDRESS = process.env.HERO_STAKING_ADDRESS;
    // Assuming the ABI file is in the contracts directory relative to this file
    const abiPath = path.join(__dirname, '../contracts', 'HeroStaking.json');
    const contractData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    // Handle Hardhat artifact format vs raw ABI
    const abi = contractData.abi || contractData;

    const stakingContract = new ethers.Contract(
      HERO_STAKING_ADDRESS,
      abi,
      provider
    );

    // Determine range
    let lastProcessedBlock = await db.getGameSetting('last_processed_block');

    if (!lastProcessedBlock) {
      if (process.env.START_BLOCK_NUMBER) {
        lastProcessedBlock = parseInt(process.env.START_BLOCK_NUMBER, 10);
      } else {
        throw new Error(
          'START_BLOCK_NUMBER env var is required for first sync'
        );
      }
    } else {
      lastProcessedBlock = parseInt(lastProcessedBlock, 10);
    }

    const latestBlock = await provider.getBlockNumber();
    // Safety limit to avoid RPC timeouts
    const MAX_BLOCKS = 1000;
    const toBlock = Math.min(lastProcessedBlock + MAX_BLOCKS, latestBlock);

    if (lastProcessedBlock >= latestBlock) {
      return res.json({
        success: true,
        message: 'Already up to date',
        block: latestBlock,
      });
    }

    console.log(
      `[Cron] Syncing Staking from ${lastProcessedBlock} to ${toBlock}`
    );

    // Fetch Events
    const depositedFilter = stakingContract.filters.HeroDeposited();
    const withdrawnFilter = stakingContract.filters.HeroWithdrawn();

    const [deposits, withdrawals] = await Promise.all([
      stakingContract.queryFilter(
        depositedFilter,
        lastProcessedBlock + 1,
        toBlock
      ),
      stakingContract.queryFilter(
        withdrawnFilter,
        lastProcessedBlock + 1,
        toBlock
      ),
    ]);

    // Process Deposits
    for (const event of deposits) {
      // args: owner, nftContract, tokenId
      const tokenId = Number(event.args[2]);
      await db.updateHeroStatus(tokenId, 'staked');
      console.log(`[Staking] Hero ${tokenId} staked.`);
    }

    // Process Withdrawals
    for (const event of withdrawals) {
      // args: owner, tokenId, level, xp
      const tokenId = Number(event.args[1]);
      await db.updateHeroStatus(tokenId, 'in_wallet');
      console.log(`[Staking] Hero ${tokenId} withdrawn.`);
    }

    // Update Checkpoint
    await db.updateGameSetting('last_processed_block', toBlock.toString());

    res.json({
      success: true,
      processed: deposits.length + withdrawals.length,
      fromBlock: lastProcessedBlock,
      toBlock: toBlock,
    });
  } catch (error) {
    console.error('Staking Sync Cron failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Perpetual Rewards Cron
router.get('/distribute-rewards', verifyCron, async (req, res) => {
  try {
    const isOracleReady = await oracle.initOracle();
    if (!isOracleReady) {
      // Log and return specific message so cron doesn't look like a hard crash
      console.warn('Oracle not ready for rewards distribution.');
      return res.json({ success: false, message: 'Oracle not ready' });
    }

    const provider = oracle.getProvider();
    // Re-create wallet since we need to read contract state that oracle.js might not expose directly
    // OR just use the contract instance if we could access it.
    // We'll create a read-only instance to get the timestamp.
    const PERPETUAL_REWARD_POOL_ADDRESS =
      process.env.PERPETUAL_REWARD_POOL_ADDRESS;
    const PERPETUAL_REWARD_POOL_ABI = require('../contracts/PerpetualRewardPool.json');

    const rewardPool = new ethers.Contract(
      PERPETUAL_REWARD_POOL_ADDRESS,
      PERPETUAL_REWARD_POOL_ABI,
      provider
    );

    // 1. Get start time of the cycle that is ending (from the contract)
    const lastCycleTimestampBigInt = await rewardPool.lastCycleTimestamp();
    const lastCycleStartTime = new Date(
      Number(lastCycleTimestampBigInt) * 1000
    );

    // 2. Count games locally since that time
    const gamesCount = await db.countGamesInCycle(lastCycleStartTime);
    console.log(
      `[Cron] Found ${gamesCount} games since ${lastCycleStartTime.toISOString()}`
    );

    // 3. Start New Cycle (Transaction)
    await oracle.startNewRewardCycle();

    // 4. Report Games (Transaction)
    await oracle.reportSoloGames(gamesCount);

    res.json({
      success: true,
      gamesProcessed: gamesCount,
      cycleStart: lastCycleStartTime,
    });
  } catch (error) {
    console.error('Rewards Cron failed:', error);
    // If it's just "too early", we consider it a success-ish (idempotent)
    if (error.message && error.message.includes('too early')) {
      return res.json({ success: false, message: 'Too early for new cycle' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Altar Check Cron
router.get('/check-altar', verifyCron, async (req, res) => {
  try {
    const altar = await db.getAltarStatus();
    if (!altar) {
      // Initialize if missing (should be done by seed, but safe-guard)
      await db.AltarStatus.findOrCreate({ where: { id: 1 } });
      return res.json({ success: true, message: 'Altar initialized' });
    }

    if (altar.current_donations >= altar.donation_goal) {
      console.log('[Cron] Altar goal met! Activating Global Buff.');

      await db.updateAltarStatus({
        current_donations: 0,
        active_buff_type: 'GLOBAL_BUFF',
        buff_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      return res.json({ success: true, activated: true });
    }

    res.json({
      success: true,
      activated: false,
      progress: `${altar.current_donations}/${altar.donation_goal}`,
    });
  } catch (error) {
    console.error('Altar Cron failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
