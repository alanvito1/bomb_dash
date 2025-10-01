const express = require('express');
const cors = require('cors');
const path = require('path'); // Importe o 'path' aqui no topo

// Carrega as variáveis de ambiente do arquivo .env que está na pasta raiz do projeto
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// --- FUNÇÃO DE VALIDAÇÃO (SEU CÓDIGO ESTÁ PERFEITO AQUI) ---
function validateEnvVariables() {
    const requiredEnvVars = [
        'PRIVATE_KEY',
        'JWT_SECRET',
        'ADMIN_SECRET',
        'TESTNET_RPC_URL',
        'ORACLE_PRIVATE_KEY',
        'TOURNAMENT_CONTROLLER_ADDRESS',
        'PERPETUAL_REWARD_POOL_ADDRESS',
        // 'WAGER_ARENA_ADDRESS' // Vamos deixar este comentado por enquanto, pois ainda não o implantamos
    ];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error(`[FATAL] As seguintes variáveis de ambiente críticas não foram definidas: ${missingVars.join(', ')}.`);
        console.error("Por favor, verifique se o seu arquivo .env está correto e na pasta raiz do projeto.");
        process.exit(1); // Encerra a aplicação se variáveis críticas estiverem faltando
    }
}

// Validar as variáveis de ambiente na inicialização
validateEnvVariables();
const jwt = require('jsonwebtoken');
const { SiweMessage } = require('siwe');
const { randomBytes } = require('crypto');
const path = require('path');
const db = require('./database.js');
const nft = require('./nft.js');
const oracle = require('./oracle.js');
const tournamentService = require('./tournament_service.js');
const admin = require('./admin.js'); // Importar o módulo admin
const gameState = require('./game_state.js'); // Importar o módulo de estado do jogo

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-for-web3';

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da raiz do projeto (para admin.html, etc.)
app.use(express.static(path.join(__dirname, '..')));

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

            // Helper to find the strongest NFT based on a scoring system
            const findStrongestNft = (nfts) => {
                return nfts.reduce((strongest, current) => {
                    const strongestScore = (strongest.bombPower * 5) + (strongest.speed * 2) + strongest.rarity;
                    const currentScore = (current.bombPower * 5) + (current.speed * 2) + current.rarity;
                    return currentScore > strongestScore ? current : strongest;
                });
            };

            if (userNfts && userNfts.length > 0) {
                const strongestNft = findStrongestNft(userNfts);
                console.log(`Encontrado(s) ${userNfts.length} NFT(s). Selecionando o mais forte: ID ${strongestNft.id}`);

                // Map NFT stats to game stats
                const initialStats = {
                    damage: strongestNft.bombPower,
                    speed: strongestNft.speed,
                    extraLives: 1, // Default value
                    fireRate: 600, // Default value
                    bombSize: 1.0, // Default value
                    multiShot: 0, // Default value
                    coins: 1000 // Starting coins
                };

                const result = await db.createUserByAddress(address, initialStats);
                user = { id: result.userId, wallet_address: address };

            } else {
                console.log('Nenhum NFT encontrado. Usando estatísticas padrão.');
                const result = await db.createUserByAddress(address); // Creates user with default stats
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

// Middleware de verificação de administrador (simples)
function verifyAdmin(req, res, next) {
    // Usando um header 'x-admin-secret' para autenticação simples.
    // Em produção, isso deveria ser uma verificação de role no JWT.
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret && adminSecret === (process.env.ADMIN_SECRET || 'supersecret')) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso negado. Requer privilégios de administrador.' });
    }
}

// =================================================================
// ROTAS DO PAINEL DE ADMIN
// =================================================================

// Obter as configurações globais do jogo
app.get('/api/admin/settings', verifyAdmin, async (req, res) => {
    try {
        const settings = await admin.getGameSettings();
        res.json({ success: true, settings });
    } catch (error) {
        console.error("Erro em /api/admin/settings:", error);
        res.status(500).json({ success: false, message: 'Erro ao buscar as configurações do jogo.' });
    }
});

// Atualizar as configurações globais do jogo
app.post('/api/admin/settings', verifyAdmin, async (req, res) => {
    try {
        await admin.saveGameSettings(req.body);
        res.json({ success: true, message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error("Erro em /api/admin/settings:", error);
        res.status(500).json({ success: false, message: 'Erro ao salvar as configurações do jogo.' });
    }
});

// Obter todos os jogadores
app.get('/api/admin/players', verifyAdmin, async (req, res) => {
    try {
        const players = await db.getAllPlayers();
        res.json({ success: true, players });
    } catch (error) {
        console.error("Erro em /api/admin/players:", error);
        res.status(500).json({ success: false, message: 'Erro ao buscar jogadores.' });
    }
});

// Atualizar estatísticas de um jogador específico
app.post('/api/admin/player/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const stats = req.body; // Espera um objeto com as estatísticas a serem atualizadas
    try {
        await db.updatePlayerStats(id, stats);
        res.json({ success: true, message: `Estatísticas do jogador ${id} atualizadas com sucesso.` });
    } catch (error) {
        console.error(`Erro ao atualizar jogador ${id}:`, error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar estatísticas do jogador.' });
    }
});

app.post('/api/game/checkpoint', verifyToken, async (req, res) => {
    const { waveNumber } = req.body;
    if (typeof waveNumber === 'undefined' || waveNumber < 0) {
        return res.status(400).json({ success: false, message: 'O número da onda (waveNumber) é obrigatório e não pode ser negativo.' });
    }

    try {
        const userId = req.user.userId;
        const result = await db.savePlayerCheckpoint(userId, waveNumber);
        if (result.updated) {
            res.json({ success: true, message: `Checkpoint salvo com sucesso na onda ${waveNumber}.` });
        } else {
            res.json({ success: true, message: `Progresso atual (${waveNumber}) não é maior que o checkpoint salvo.` });
        }
    } catch (error) {
        console.error(`Erro ao salvar checkpoint:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao salvar o checkpoint.' });
    }
});

app.get('/api/auth/me', verifyToken, async (req, res) => {
    try {
        const user = await db.getUserByAddress(req.user.address);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }
        // Also fetch the user's checkpoint
        const checkpoint = await db.getPlayerCheckpoint(user.id);

        res.json({
            success: true,
            user: {
                address: user.wallet_address,
                level: user.level,
                xp: user.xp,
                coins: user.coins,
                highest_wave_reached: checkpoint
            }
        });
    } catch (error) {
        console.error("Erro em /api/auth/me:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

app.post('/api/pvp/wager/enter', verifyToken, async (req, res) => {
    const { tierId } = req.body;
    if (!tierId) {
        return res.status(400).json({ success: false, message: 'O ID do tier de aposta é obrigatório.' });
    }

    try {
        const user = await db.getUserByAddress(req.user.address);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        const tier = await db.getWagerTier(tierId);
        if (!tier) {
            return res.status(404).json({ success: false, message: 'Tier de aposta não encontrado.' });
        }

        // Check if the user has enough BCOIN (coins) and XP
        if (user.coins < tier.bcoin_cost) {
            return res.status(403).json({ success: false, message: `BCOINs insuficientes. Necessário: ${tier.bcoin_cost}, Você tem: ${user.coins}.` });
        }
        if (user.xp < tier.xp_cost) {
            return res.status(403).json({ success: false, message: `XP insuficiente. Necessário: ${tier.xp_cost}, Você tem: ${user.xp}.` });
        }

        // If checks pass, the client is now responsible for calling the smart contract
        res.json({
            success: true,
            message: 'Você é elegível para esta aposta. Prossiga com a transação no contrato.',
            tier: tier
        });

    } catch (error) {
        console.error("Erro em /api/pvp/wager/enter:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao entrar na fila de aposta.' });
    }
});

app.post('/api/pvp/wager/report', verifyToken, async (req, res) => {
    const { matchId } = req.body;
    if (!matchId) {
        return res.status(400).json({ success: false, message: 'O ID da partida é obrigatório.' });
    }

    try {
        const match = await db.getWagerMatch(matchId);
        if (!match) {
            return res.status(404).json({ success: false, message: 'Partida não encontrada.' });
        }

        if (match.status !== 'pending') {
            return res.status(403).json({ success: false, message: `Esta partida já foi finalizada. Vencedor: ${match.winner_address}` });
        }

        const winnerAddress = req.user.address;
        let loserAddress;

        if (winnerAddress === match.player1_address) {
            loserAddress = match.player2_address;
        } else if (winnerAddress === match.player2_address) {
            loserAddress = match.player1_address;
        } else {
            return res.status(403).json({ success: false, message: 'Você não é um participante desta partida.' });
        }

        console.log(`Reportando resultado da partida ${matchId}. Vencedor (auto-reportado): ${winnerAddress}`);

        // Acionar o oráculo para a liquidação on-chain e off-chain
        await oracle.reportWagerMatchResult(match.match_id, winnerAddress, loserAddress, match.tier_id);

        // Atualizar o status da partida no banco de dados
        await db.updateWagerMatch(match.match_id, 'completed', winnerAddress);

        res.json({ success: true, message: 'Resultado da partida reportado e processado com sucesso!' });

    } catch (error) {
        console.error(`Erro ao reportar resultado da partida ${matchId}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao reportar o resultado.' });
    }
});

app.post('/api/tournaments/report-match', verifyToken, async (req, res) => {
    const { tournamentId, matchId, winnerAddress } = req.body;
    if (!tournamentId || !matchId || !winnerAddress) {
        return res.status(400).json({ success: false, message: 'tournamentId, matchId, e winnerAddress são obrigatórios.' });
    }

    // In a real application, you'd have more validation here to ensure
    // that the reporting user (from the JWT) is authorized to report this match.
    // For V1, we trust the authenticated user.

    try {
        await tournamentService.reportTournamentMatchWinner(tournamentId, matchId, winnerAddress);
        res.json({ success: true, message: `Resultado para a partida ${matchId} do torneio ${tournamentId} reportado com sucesso.` });
    } catch (error) {
        console.error(`Erro ao reportar resultado do torneio:`, error);
        // Provide a more specific error message if available
        res.status(500).json({ success: false, message: error.message || 'Erro interno do servidor ao reportar o resultado do torneio.' });
    }
});

app.post('/api/rewards/generate-claim-signature', verifyToken, async (req, res) => {
    const { gamesPlayed } = req.body;
    if (typeof gamesPlayed === 'undefined' || gamesPlayed <= 0) {
        return res.status(400).json({ success: false, message: 'O número de jogos jogados (gamesPlayed) é obrigatório e deve ser positivo.' });
    }

    try {
        const playerAddress = req.user.address;
        console.log(`Gerando assinatura de claim para ${playerAddress} por ${gamesPlayed} jogos.`);

        const signature = await oracle.signClaimReward(playerAddress, gamesPlayed);

        res.json({
            success: true,
            message: 'Assinatura gerada com sucesso.',
            signature: signature,
            gamesPlayed: gamesPlayed,
            playerAddress: playerAddress
        });
    } catch (error) {
        console.error(`Erro ao gerar assinatura de claim:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao gerar a assinatura.' });
    }
});

// Rota para verificar o status atual do PvP
app.get('/api/pvp/status', (req, res) => {
    res.json({ success: true, status: gameState.getPvpStatus() });
});

// Rota para obter o ranking dos top 10 jogadores
app.get('/api/ranking', async (req, res) => {
    try {
        const ranking = await db.getTop10Ranking();
        res.json({ success: true, ranking });
    } catch (error) {
        console.error("Erro ao buscar ranking:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao buscar o ranking.' });
    }
});


async function startServer() {
    console.log("=============================================");
    console.log("     INICIALIZANDO O SERVIDOR DO JOGO      ");
    console.log("=============================================");

    try {
        // 1. Inicializar o Banco de Dados
        await db.initDb();
        console.log("[OK] Conexão com o banco de dados estabelecida com sucesso.");

        // 2. Inicializar o Oráculo
        const oracleInitialized = oracle.initOracle();
        if (oracleInitialized) {
            console.log("[OK] Oráculo da blockchain inicializado.");
            console.log(` - Wallet do Oráculo: ${process.env.ORACLE_WALLET_ADDRESS}`); // Supondo que você tenha a wallet
            console.log(" - Contratos Utilizados:");
            console.log(`   - TournamentController: ${process.env.TOURNAMENT_CONTROLLER_ADDRESS}`);
            console.log(`   - PerpetualRewardPool: ${process.env.PERPETUAL_REWARD_POOL_ADDRESS}`);
            console.log(`   - WagerArena: ${process.env.WAGER_ARENA_ADDRESS}`);
        } else {
            console.warn("[AVISO] Oráculo da blockchain não foi inicializado. Verifique as variáveis de ambiente.");
        }

        // 3. Iniciar Cron Jobs
        await gameState.startPvpCycleCron();
        console.log("[OK] Cron jobs (Ciclo de PvP, etc.) foram iniciados.");

        // 4. Iniciar o Servidor Express
        app.listen(PORT, () => {
            console.log("---------------------------------------------");
            console.log(`[OK] Servidor HTTP iniciado e escutando na porta ${PORT}.`);
            console.log("=============================================");
            console.log("      O SERVIDOR ESTÁ TOTALMENTE OPERACIONAL      ");
            console.log("=============================================");
        });

    } catch (error) {
        console.error("[FATAL] Falha crítica durante a inicialização do servidor:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;