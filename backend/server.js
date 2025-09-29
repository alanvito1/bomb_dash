const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { SiweMessage } = require('siwe');
const { randomBytes } = require('crypto');
const db = require('./database.js');
const nft = require('./nft.js');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-for-web3';

app.use(cors());
app.use(express.json());

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

app.get('/api/auth/nonce', (req, res) => {
    const nonce = randomBytes(16).toString('hex');
    const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutes validity
    nonceStore.set(nonce, expirationTime);
    res.json({ success: true, nonce });
});

app.post('/api/auth/verify', async (req, res) => {
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
            console.log(`Primeiro login de ${address}. Verificando NFTs...`);
            const userNfts = await nft.getNftsForPlayer(address);

            if (userNfts && userNfts.length > 0) {
                console.log(`Encontrado(s) ${userNfts.length} NFT(s). Requer seleção do usuário.`);
                await db.createUserByAddress(address); // Creates user with default stats for now
                return res.json({
                    success: true,
                    selectionRequired: true,
                    nfts: userNfts,
                    message: "Bem-vindo! Por favor, selecione um herói para começar."
                });
            } else {
                console.log('Nenhum NFT encontrado. Usando estatísticas padrão.');
                const result = await db.createUserByAddress(address);
                user = { id: result.userId, wallet_address: address };
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

app.post('/api/user/select-nft', async (req, res) => {
    const { message, signature, nftId } = req.body;
    if (!message || !signature || !nftId) {
        return res.status(400).json({ success: false, message: 'Message, signature, e nftId são obrigatórios.' });
    }

    try {
        const siweMessage = new SiweMessage(message);
        const { success, data: { address } } = await siweMessage.verify({ signature });
        if (!success) {
            return res.status(403).json({ success: false, message: 'A verificação da assinatura falhou.' });
        }

        const user = await db.findUserByAddress(address);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        const userNfts = await nft.getNftsForPlayer(address);
        const selectedNft = userNfts.find(n => n.id === nftId);
        if (!selectedNft) {
            return res.status(403).json({ success: false, message: 'NFT não encontrado ou não pertence a este usuário.' });
        }

        await db.updatePlayerStatsFromNFT(user.id, selectedNft);

        const tokenPayload = { userId: user.id, address: user.wallet_address };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            message: `Herói ${nftId} selecionado! Login completo.`,
            token: token,
        });
    } catch (error) {
        console.error("Erro em /api/user/select-nft:", error);
        res.status(500).json({ success: false, message: 'Erro interno ao selecionar o NFT.' });
    }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = await db.findUserByAddress(req.user.address);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }
        res.json({
            success: true,
            user: { address: user.wallet_address, max_score: user.max_score }
        });
    } catch (error) {
        console.error("Erro em /api/auth/me:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

db.initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}).catch(err => {
    console.error("Falha ao inicializar o banco de dados. Servidor não iniciado.", err);
    process.exit(1);
});

module.exports = app;