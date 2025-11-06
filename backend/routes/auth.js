// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { SiweMessage } = require('siwe');
const { randomBytes } = require('crypto');
const db = require('../database.js');
const nft = require('../nft.js');

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-for-web3';
const nonceStore = new Map();

function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1];
        jwt.verify(bearerToken, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ success: false, message: 'Token inválido ou expirado.' });
            }
            req.user = decoded;
            next();
        });
    } else {
        res.status(401).json({ success: false, message: 'Token de autenticação não fornecido.' });
    }
}

router.get('/nonce', (req, res) => {
    const nonce = randomBytes(16).toString('hex');
    const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes validity
    nonceStore.set(nonce, expirationTime);
    res.json({ success: true, nonce });
});

router.post('/verify', async (req, res) => {
    const { message, signature } = req.body;
    if (!message || !signature) {
        return res.status(400).json({ success: false, message: 'Requisição inválida: message e signature são obrigatórios.' });
    }

    try {
        const siweMessage = new SiweMessage(message);

        const expirationTime = nonceStore.get(siweMessage.nonce);
        if (!expirationTime || Date.now() > expirationTime) {
            nonceStore.delete(siweMessage.nonce);
            return res.status(403).json({ success: false, message: 'Nonce inválido ou expirado.' });
        }

        const { success, data: { address } } = await siweMessage.verify({ signature });
        nonceStore.delete(siweMessage.nonce);

        if (!success) {
            return res.status(403).json({ success: false, message: 'A verificação da assinatura falhou.' });
        }

        let user = await db.findUserByAddress(address);
        if (!user) {
            // This block handles the first login for a new user.
            console.log(`First login for ${address}. Creating user and assigning heroes...`);
            // 1. Create the user record first.
            const newUserResult = await db.createUserByAddress(address);
            user = { id: newUserResult.userId, wallet_address: address };
            console.log(`User created with ID: ${user.id}`);

            // 2. Fetch their NFTs from the blockchain.
            const userNfts = await nft.getNftsForPlayer(address);

            if (userNfts && userNfts.length > 0) {
                console.log(`Found ${userNfts.length} NFT(s). Creating hero records for them.`);
                for (const nftData of userNfts) {
                    const heroStats = {
                        hero_type: 'nft',
                        nft_id: nftData.id,
                        level: nftData.level,
                        hp: 100, // Default values, can be adjusted
                        maxHp: 100,
                        damage: nftData.bombPower,
                        speed: nftData.speed,
                        // ... map other relevant stats
                    };
                    await db.createHeroForUser(user.id, heroStats);
                }
            } else {
                // 3. If no NFTs, assign the default mock heroes.
                console.log('No NFTs found. Assigning default mock heroes.');
                await nft.assignMockHeroes(user.id);
            }
        }

        const tokenPayload = { userId: user.id, address: user.wallet_address };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            message: 'Login bem-sucedido!',
            token: token,
        });
    } catch (error) {
        console.error("Erro em /api/auth/verify:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

router.get('/me', verifyToken, async (req, res) => {
    try {
        // 1. Fetch user account data
        const user = await db.getUserByAddress(req.user.address);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        // 2. Fetch user's heroes
        const heroes = await db.getHeroesByUserId(user.id);

        // 3. Fetch user's checkpoint
        const checkpoint = await db.getPlayerCheckpoint(user.id);

        // 4. Combine all data into a single response object
        res.json({
            success: true,
            user: {
                id: user.id,
                address: user.wallet_address,
                account_level: user.account_level,
                account_xp: user.account_xp,
                coins: user.coins,
                highest_wave_reached: checkpoint,
                heroes: heroes // Include the list of heroes
            }
        });
    } catch (error) {
        console.error("Erro em /api/auth/me:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

module.exports = { router, verifyToken };
