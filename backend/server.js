const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { SiweMessage } = require('siwe');
const { randomBytes } = require('crypto');
const db = require('./database.js'); // Nosso módulo de banco de dados
const oracle = require('./oracle.js'); // Importar o nosso serviço de Oráculo
const { getExperienceForLevel } = require('./rpg.js'); // Importar a lógica de XP

const app = express();
const PORT = process.env.PORT || 3000; // Porta do servidor
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-for-web3'; // Mude em produção!

// Middleware
app.use(cors()); // Habilita CORS para todas as rotas
app.use(express.json()); // Para parsear JSON no corpo das requisições

// Armazenamento de nonce em memória. Para produção, use uma solução mais robusta como Redis.
const nonceStore = new Map();

// Função de Middleware para verificar Token JWT
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1]; // Pega o token do formato "Bearer <token>"
        jwt.verify(bearerToken, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error("JWT verification error:", err.message);
                return res.status(403).json({ success: false, message: 'Token inválido ou expirado.' });
            }
            req.user = decoded; // Adiciona o payload decodificado (ex: { address: '0x...', userId: 1 }) à requisição
            next();
        });
    } else {
        res.status(401).json({ success: false, message: 'Token de autenticação não fornecido.' });
    }
}

// --- Endpoints de Autenticação Web3 (SIWE) ---

// GET /api/auth/nonce - Gerar um nonce para o cliente assinar
app.get('/api/auth/nonce', (req, res) => {
    const nonce = randomBytes(16).toString('hex');
    const expirationTime = Date.now() + (5 * 60 * 1000); // 5 minutos de validade
    nonceStore.set(nonce, expirationTime);
    res.json({ success: true, nonce });
});

// POST /api/auth/verify - Verificar a mensagem assinada e emitir um JWT
app.post('/api/auth/verify', async (req, res) => {
    const { message, signature } = req.body;
    if (!message || !signature) {
        return res.status(400).json({ success: false, message: 'Requisição inválida: message e signature são obrigatórios.' });
    }

    try {
        const siweMessage = new SiweMessage(message);

        // Validar o nonce
        const expirationTime = nonceStore.get(siweMessage.nonce);
        if (!expirationTime || Date.now() > expirationTime) {
            nonceStore.delete(siweMessage.nonce);
            return res.status(403).json({ success: false, message: 'Nonce inválido ou expirado.' });
        }

        // Verificar a assinatura
        const { success, data: { address } } = await siweMessage.verify({ signature });
        nonceStore.delete(siweMessage.nonce); // Nonce utilizado, deve ser removido

        if (!success) {
            return res.status(403).json({ success: false, message: 'A verificação da assinatura falhou.' });
        }

        // Usuário autenticado. Encontre ou crie no banco de dados.
        let user = await db.findUserByAddress(address);
        if (!user) {
            console.log(`Primeiro login de ${address}. Criando novo usuário.`);
            const result = await db.createUserByAddress(address);
            user = { id: result.userId, wallet_address: address, max_score: 0 };
        }

        // Gerar token JWT
        const tokenPayload = { userId: user.id, address: user.wallet_address };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            success: true,
            message: 'Login bem-sucedido!',
            token: token,
            user: {
                address: user.wallet_address,
                max_score: user.max_score
            }
        });
    } catch (error) {
        console.error("Erro em /api/auth/verify:", error);
        if (req.body.message) {
            try {
                const siweMessage = new SiweMessage(req.body.message);
                nonceStore.delete(siweMessage.nonce);
            } catch {}
        }
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// GET /api/auth/me - Validar token e retornar dados do usuário logado
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

// POST /api/scores - Submeter uma nova pontuação (protegido por JWT)
app.post('/api/scores', verifyToken, async (req, res) => {
    const { score } = req.body;
    const address = req.user.address;

    if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ success: false, message: 'Pontuação inválida.' });
    }

    try {
        const result = await db.updateUserScore(address, score);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("Erro em /api/scores:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao atualizar pontuação.' });
    }
});

// GET /api/ranking - Obter o top 10 do ranking
app.get('/api/ranking', async (req, res) => {
    try {
        const ranking = await db.getTop10Players();
        res.json({ success: true, ranking });
    } catch (error) {
        console.error("Erro em /api/ranking:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// GET /api/user/stats - Obter estatísticas do jogador logado
app.get('/api/user/stats', verifyToken, async (req, res) => {
    try {
        const stats = await db.getPlayerStats(req.user.userId);
        if (stats) {
            res.json({ success: true, stats });
        } else {
            res.status(404).json({ success: false, message: 'Nenhuma estatística encontrada para este usuário.' });
        }
    } catch (error) {
        console.error(`Erro em /api/user/stats for user ${req.user.userId}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// PUT /api/user/stats - Salvar/atualizar estatísticas do jogador logado
app.put('/api/user/stats', verifyToken, async (req, res) => {
    const { userId } = req.user;
    try {
        const result = await db.savePlayerStats(userId, req.body);
        res.json({ success: true, message: 'Estatísticas salvas com sucesso.', stats: result.stats });
    } catch (error) {
        console.error(`Erro em /api/user/stats for user ${userId}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao salvar estatísticas.' });
    }
});

// POST /api/user/levelup - Processar o level-up de um jogador
app.post('/api/user/levelup', verifyToken, async (req, res) => {
    const { address, userId } = req.user;

    try {
        // 1. Buscar dados atuais do usuário (nível e XP)
        const user = await db.findUserByAddress(address);
        if (!user) {
            return res.status(404).json({ success: false, message: "Usuário não encontrado." });
        }

        // 2. Verificar se o jogador tem XP suficiente
        const xpForNextLevel = getExperienceForLevel(user.level + 1);
        if (user.xp < xpForNextLevel) {
            return res.status(400).json({
                success: false,
                message: "XP insuficiente para o próximo nível.",
                currentXp: user.xp,
                requiredXp: xpForNextLevel,
            });
        }

        // 3. Verificar se o jogador tem 1 BCOIN (verificação off-chain para feedback rápido)
        // A verificação final e real é feita pelo contrato `transferFrom`.
        // Esta parte do código assume que o frontend já verificou o saldo e a aprovação.
        // Em uma implementação mais robusta, o backend poderia verificar o saldo aqui.

        // 4. Iniciar a transação on-chain via Oráculo
        await oracle.triggerLevelUpPayment(address);

        // 5. Atualizar nível e HP no banco de dados
        const newLevel = user.level + 1;
        const newHp = user.hp + 10; // Aumenta 10 de HP a cada nível
        await db.levelUpUser(userId, newLevel, newHp);

        res.json({
            success: true,
            message: `Parabéns! Você alcançou o nível ${newLevel}!`,
            newLevel,
            newHp,
        });

    } catch (error) {
        console.error(`Falha no processo de level-up para ${address}:`, error.message);
        // Pode ser um erro de transação (saldo/aprovação insuficiente) ou de banco de dados
        res.status(500).json({ success: false, message: "Ocorreu um erro durante o processo de level-up. Verifique seu saldo de BCOIN e a aprovação do contrato." });
    }
});

// --- Exemplo de Endpoint que utiliza o Oráculo ---
// Em um cenário real, isso seria chamado pela lógica interna do servidor de jogo.
app.post('/api/admin/report-match', verifyToken, async (req, res) => {
    // Adicionar verificação se o usuário é um admin, se necessário
    const { matchId, winnerAddress } = req.body;
    if (!matchId || !winnerAddress) {
        return res.status(400).json({ success: false, message: 'matchId e winnerAddress são obrigatórios.' });
    }
    try {
        const tx = await oracle.reportMatchResult(matchId, winnerAddress);
        res.json({ success: true, message: 'Resultado da partida reportado com sucesso.', transactionHash: tx.hash });
    } catch (error) {
        console.error("Erro ao reportar resultado da partida:", error);
        res.status(500).json({ success: false, message: 'Falha ao reportar resultado da partida.' });
    }
});


// Inicializar o BD, depois o Oráculo, e então iniciar o servidor
db.initDb()
    .then(() => {
        // Após o BD estar pronto, inicializar o Oráculo
        if (oracle.initOracle()) {
            // Se o oráculo inicializou com sucesso, inicie os cron jobs
            oracle.startCronJobs();
        }

        app.listen(PORT, () => {
            console.log(`Servidor Bomb Dash (Web3) rodando na porta ${PORT}`);
            console.log(`JWT_SECRET está configurado como: ${JWT_SECRET.startsWith('your-very-strong') ? 'CHAVE PADRÃO (INSEGURA!)' : 'CHAVE PERSONALIZADA'}`);
        });
    })
    .catch(err => {
        console.error("Falha ao inicializar o banco de dados. Servidor não iniciado.", err);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGINT', () => { db.closeDb(); process.exit(0); });
process.on('SIGTERM', () => { db.closeDb(); process.exit(0); });

module.exports = app;