// backend/routes/debug.js
const express = require('express');
const router = express.Router();
const db = require('../database.js');
const nft = require('../nft.js');

function verifyAdmin(req, res, next) {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret && adminSecret === (process.env.ADMIN_SECRET || 'supersecret')) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso negado. Requer privilégios de administrador.' });
    }
}

router.post('/assign-mock-hero', verifyAdmin, async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) {
        return res.status(400).json({ success: false, message: 'O endereço da carteira (walletAddress) é obrigatório.' });
    }

    try {
        let user = await db.findUserByAddress(walletAddress);
        if (!user) {
            const newUser = await db.createUserByAddress(walletAddress);
            user = { id: newUser.userId };
        }
        const result = await nft.assignMockHeroes(user.id);
        res.json({ success: true, message: 'Heróis mock atribuídos com sucesso!', data: result });
    } catch (error) {
        console.error(`Erro ao atribuir herói mock para ${walletAddress}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno ao atribuir o herói mock.' });
    }
});

router.post('/setup-test-player', verifyAdmin, async (req, res) => {
    const { walletAddress } = req.body;
    console.log(`[+] DEBUG: Received setup request for ${walletAddress}`);

    if (!walletAddress) {
        return res.status(400).json({ success: false, message: 'walletAddress is required.' });
    }

    try {
        console.log('[+] DEBUG 1: Finding or creating user...');
        let user = await db.findUserByAddress(walletAddress);
        if (!user) {
            console.log('[+] DEBUG 1a: User not found, creating...');
            const newUser = await db.createUserByAddress(walletAddress, 0);
            user = { id: newUser.userId, wallet_address: walletAddress };
            console.log(`[+] DEBUG 1b: User created with ID ${user.id}`);
        } else {
            console.log('[+] DEBUG 1a: User found, re-fetching full object...');
            user = await db.getUserByAddress(walletAddress);
             console.log(`[+] DEBUG 1b: Full user object fetched for ID ${user.id}`);
        }

        console.log(`[+] DEBUG 2: Setting BCOIN balance for user ${user.id}...`);
        await db.updatePlayerStats(user.id, { coins: 10000 });
        console.log('[+] DEBUG 2a: BCOIN balance set.');

        console.log(`[+] DEBUG 3: Assigning mock heroes to user ${user.id}...`);
        await nft.assignMockHeroes(user.id);
        console.log('[+] DEBUG 3a: Mock heroes assigned.');

        console.log(`[+] DEBUG 4: Fetching heroes for user ${user.id} to find one to stake...`);
        const heroes = await db.getHeroesByUserId(user.id);
        const mockHeroToStake = heroes.find(h => h.hero_type === 'mock');
        console.log(`[+] DEBUG 4a: Found hero to stake: ${mockHeroToStake ? mockHeroToStake.id : 'None'}`);

        if (mockHeroToStake) {
            console.log(`[+] DEBUG 5: Staking hero ${mockHeroToStake.id}...`);
            await db.updateHeroStats(mockHeroToStake.id, { status: 'staked' });
            console.log(`[+] DEBUG 5a: Hero ${mockHeroToStake.id} staked.`);
        } else {
            console.warn(`[!] DEBUG: Could not find a mock hero to stake for user ${user.id}.`);
        }

        console.log('[+] DEBUG 6: Fetching final user state...');
        const finalUser = await db.getUserByAddress(walletAddress);
        const finalHeroes = await db.getHeroesByUserId(user.id);
        console.log('[+] DEBUG 6a: Final state fetched.');

        const responsePayload = {
            success: true,
            message: `Test player ${walletAddress} configured successfully.`,
            player: { ...finalUser.toJSON(), heroes: finalHeroes }
        };

        console.log('[+] DEBUG 7: Sending final success response...');
        res.json(responsePayload);
        console.log('[+] DEBUG 7a: Final response sent.');

    } catch (error) {
        console.error(`[!] DEBUG ENDPOINT CRITICAL ERROR for ${walletAddress}:`);
        console.error(`[!] Message: ${error.message}`);
        console.error(`[!] Stack: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: 'An internal error occurred.',
            error: error.message
        });
    }
});

module.exports = router;
