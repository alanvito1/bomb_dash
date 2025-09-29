const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { SiweMessage } = require('siwe');
const { randomBytes } = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('./database.js'); // Nosso módulo de banco de dados
const oracle = require('./oracle.js'); // Importar o nosso serviço de Oráculo
const { getExperienceForLevel } = require('./rpg.js'); // Importar a lógica de XP
const tournament = require('./tournament.js'); // Importar o nosso serviço de Torneio

const app = express();
const PORT = process.env.PORT || 3000; // Porta do servidor
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-for-web3'; // Mude em produção!

// Middleware
app.use(cors()); // Habilita CORS para todas as rotas
app.use(express.json()); // Para parsear JSON no corpo das requisições

// Rate Limiting para proteger contra ataques de força bruta e DoS
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limita cada IP a 100 requisições por janela
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas requisições deste IP, por favor, tente novamente após 15 minutos.',
});

app.use('/api/', apiLimiter); // Aplica o rate limiting a todas as rotas da API

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

// POST /api/solo/game-over - Conceder XP por uma partida solo (protegido por JWT)
app.post('/api/solo/game-over', verifyToken, async (req, res) => {
    const { address } = req.user;
    const { minionsDefeated, bossesDefeated } = req.body;

    // Input validation
    if (typeof minionsDefeated !== 'number' || minionsDefeated < 0 || typeof bossesDefeated !== 'number' || bossesDefeated < 0) {
        return res.status(400).json({ success: false, message: 'Valores de minions e bosses derrotados são inválidos.' });
    }

    try {
        // Calcular XP ganho
        const xpFromMinions = minionsDefeated * 1; // 1 XP por minion
        const xpFromBosses = bossesDefeated * 10; // 10 XP por boss
        const totalXpGained = xpFromMinions + xpFromBosses;

        if (totalXpGained > 0) {
            await db.addXpToUser(address, totalXpGained);
        }

        res.json({
            success: true,
            message: `Você ganhou ${totalXpGained} de XP!`,
            xpGained: totalXpGained,
        });

    } catch (error) {
        console.error(`Falha ao conceder XP para ${address} após partida solo:`, error.message);
        res.status(500).json({ success: false, message: "Ocorreu um erro ao registrar o resultado da partida." });
    }
});

// POST /api/solo/claim-rewards - Obter assinatura para resgatar recompensas
app.post('/api/solo/claim-rewards', verifyToken, async (req, res) => {
    const { address } = req.user;
    const { gamesPlayed } = req.body;

    if (typeof gamesPlayed !== 'number' || gamesPlayed <= 0 || !Number.isInteger(gamesPlayed)) {
        return res.status(400).json({ success: false, message: 'O número de jogos jogados deve ser um inteiro positivo.' });
    }

    try {
        const signature = await oracle.signClaimReward(address, gamesPlayed);

        res.json({
            success: true,
            message: 'Assinatura gerada com sucesso. Use-a para chamar o contrato `claimReward`.',
            signature: signature,
            gamesPlayed: gamesPlayed,
        });

    } catch (error) {
        console.error(`Falha ao gerar assinatura para ${address}:`, error.message);
        res.status(500).json({ success: false, message: "Ocorreu um erro ao gerar a assinatura para o resgate." });
    }
});

// GET /api/solo/reward-info - Obter informações sobre o ciclo de recompensas atual
app.get('/api/solo/reward-info', async (req, res) => {
    try {
        const { rewardPerGame, lastCycleTimestamp } = await oracle.getRewardCycleInfo();

        const cycleDuration = 10 * 60; // 10 minutos em segundos
        const currentTime = Math.floor(Date.now() / 1000);
        const timeElapsed = currentTime - lastCycleTimestamp.toNumber();
        const timeRemaining = Math.max(0, cycleDuration - timeElapsed);

        res.json({
            success: true,
            // O Ethers.js retorna BigNumber, então formatamos para uma string legível.
            // Assumindo que o token tem 18 decimais, como é padrão.
            estimatedRewardPerGame: require('ethers').utils.formatEther(rewardPerGame),
            cycleTimeRemaining: timeRemaining, // em segundos
        });

    } catch (error) {
        console.error("Falha ao buscar informações do ciclo de recompensas:", error.message);
        // Retornar um estado padrão se o oráculo não estiver pronto, por exemplo
        res.status(503).json({
            success: false,
            message: "Não foi possível obter as informações do ciclo de recompensas no momento.",
            estimatedRewardPerGame: "0.0",
            cycleTimeRemaining: 0,
        });
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

        // 3. Iniciar a transação on-chain via Oráculo
        await oracle.triggerLevelUpPayment(address);

        // 4. Atualizar nível, HP e Dano no banco de dados
        const newLevel = user.level + 1;
        const newHp = user.hp + 10; // Aumenta 10 de HP a cada nível
        await db.levelUpUserAndStats(userId, newLevel, newHp);

        // 5. Buscar as novas estatísticas para retornar ao cliente
        const newStats = await db.getPlayerStats(userId);

        res.json({
            success: true,
            message: `Parabéns! Você alcançou o nível ${newLevel}!`,
            newLevel,
            newHp,
            newDamage: newStats.damage,
        });

    } catch (error) {
        console.error(`Falha no processo de level-up para ${address}:`, error.message);
        // Pode ser um erro de transação (saldo/aprovação insuficiente) ou de banco de dados
        res.status(500).json({ success: false, message: "Ocorreu um erro durante o processo de level-up. Verifique seu saldo de BCOIN e a aprovação do contrato." });
    }
});

// --- Tournament Endpoints ---

// POST /api/tournaments/join - Entrar em um torneio
app.post('/api/tournaments/join', verifyToken, async (req, res) => {
    const { userId } = req.user;
    // O onchainTournamentId é o ID do contrato, que o backend não conhece a priori.
    // O cliente o obtém do evento TournamentCreated do contrato.
    const { capacity, entryFee, onchainTournamentId } = req.body;

    if (![4, 8].includes(capacity) || typeof entryFee !== 'string' || !onchainTournamentId) {
        return res.status(400).json({ success: false, message: 'Capacidade, taxa de entrada e ID on-chain do torneio são obrigatórios.' });
    }

    try {
        // 1. Encontrar ou criar o torneio no banco de dados local
        let t = await db.findOpenTournament(capacity, entryFee);
        if (!t) {
            console.log(`Nenhum torneio aberto encontrado. Criando um novo para ${capacity} jogadores com taxa de ${entryFee}.`);
            t = await db.createTournament(onchainTournamentId, capacity, entryFee);
        }

        // 2. Adicionar o jogador como participante
        await db.addParticipantToTournament(t.id, userId);
        console.log(`Usuário ${userId} adicionado ao torneio ${t.id}.`);

        // 3. Verificar se o torneio está cheio
        const participants = await db.getTournamentParticipants(t.id);
        if (participants.length === t.capacity) {
            console.log(`Torneio ${t.id} está cheio. Criando as chaves (brackets).`);
            // Iniciar a criação do bracket de forma assíncrona, não bloquear a resposta.
            tournament.createBracket(t.id, participants);
            res.json({ success: true, message: 'Você entrou no torneio! O torneio está cheio e vai começar em breve.' });
        } else {
            res.json({
                success: true,
                message: `Você entrou na fila do torneio. (${participants.length}/${t.capacity})`,
                playersWaiting: participants.length,
                capacity: t.capacity
            });
        }
    } catch (error) {
        console.error(`Erro ao entrar no torneio para o usuário ${userId}:`, error);
        // Lidar com erro de chave única se o usuário tentar entrar duas vezes
        if (error.message.includes('SQLITE_CONSTRAINT: UNIQUE constraint failed')) {
            return res.status(409).json({ success: false, message: 'Você já está neste torneio.' });
        }
        res.status(500).json({ success: false, message: 'Erro interno ao entrar no torneio.' });
    }
});

// POST /api/tournaments/report-match - Reportar o resultado de uma partida de torneio
app.post('/api/tournaments/report-match', verifyToken, async (req, res) => {
    // Em um cenário real, isso seria protegido (ex: apenas pelo servidor de jogo dedicado)
    const { matchId, winnerId } = req.body;

    if (!matchId || !winnerId) {
        return res.status(400).json({ success: false, message: 'ID da partida e ID do vencedor são obrigatórios.' });
    }

    try {
        const match = await db.getMatchById(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: 'Partida não encontrada.' });
        }

        // Lógica para avançar o vencedor
        const result = await tournament.advanceWinner(match.tournament_id, matchId, winnerId);

        res.json({
            success: true,
            message: `Resultado da partida ${matchId} reportado.`,
            tournamentComplete: result.tournamentComplete,
            winners: result.winners
        });

    } catch (error) {
        console.error(`Erro ao reportar resultado da partida ${matchId}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno ao reportar partida.' });
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