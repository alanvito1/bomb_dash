const express = require('express');
const cors = require('cors');
const path = require('path');

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
        'WAGER_ARENA_ADDRESS'
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
const db = require('./database.js');
const nft = require('./nft.js');
const oracle = require('./oracle.js');
const tournamentService = require('./tournament_service.js');
const admin = require('./admin.js'); // Importar o módulo admin
const gameState = require('./game_state.js'); // Importar o módulo de estado do jogo
const matchmaking = require('./matchmaking.js'); // Importar o módulo de matchmaking

const app = express();

// Defina um "replacer" global para o JSON.stringify que o Express usa
// Isso converte BigInts para strings, evitando o erro "TypeError: Do not know how to serialize a BigInt".
app.set('json replacer', (key, value) => {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
});

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

// =================================================================
// ROTAS DE HERÓI
// =================================================================

app.get('/api/heroes', verifyToken, async (req, res) => {
    try {
        const heroes = await db.getHeroesByUserId(req.user.userId);
        res.json({ success: true, heroes });
    } catch (error) {
        console.error(`Error fetching heroes for user ${req.user.userId}:`, error);
        res.status(500).json({ success: false, message: 'Failed to fetch heroes.' });
    }
});

// Helper object to manage upgrade logic and costs
const heroUpgrades = {
    damage: {
        cost: (stat) => 50 + (stat.damage - 1) * 20,
        effect: (stat) => ({ damage: stat.damage + 1 }),
    },
    speed: {
        cost: (stat) => 40 + ((stat.speed - 200) / 10) * 15,
        effect: (stat) => ({ speed: stat.speed + 10 }),
    },
    extraLives: {
        cost: (stat) => 30 + stat.extraLives * 30,
        effect: (stat) => ({ extraLives: stat.extraLives + 1 }),
    },
    fireRate: {
        cost: (stat) => 60 + ((600 - stat.fireRate) / 50) * 25,
        effect: (stat) => ({ fireRate: Math.max(100, stat.fireRate - 50) }),
    },
    bombSize: {
        cost: (stat) => 500 + (stat.bombSize - 1) * 100,
        effect: (stat) => ({ bombSize: Math.min(3, stat.bombSize + 1) }),
    },
    multiShot: {
        cost: (stat) => 500 + stat.multiShot * 200,
        effect: (stat) => ({ multiShot: Math.min(5, stat.multiShot + 1) }),
    }
};


app.post('/api/heroes/:heroId/purchase-upgrade', verifyToken, async (req, res) => {
    const { heroId } = req.params;
    const { upgradeType, cost } = req.body; // cost is sent from client

    if (!upgradeType || !heroUpgrades[upgradeType]) {
        return res.status(400).json({ success: false, message: "Invalid upgrade type." });
    }

    try {
        // 1. Get the hero and verify ownership
        const heroes = await db.getHeroesByUserId(req.user.userId);
        const hero = heroes.find(h => h.id.toString() === heroId);

        if (!hero) {
            return res.status(404).json({ success: false, message: "Hero not found or you don't own it." });
        }

        // 2. Calculate the authoritative cost on the backend
        const expectedCost = heroUpgrades[upgradeType].cost(hero);
        if (cost !== expectedCost) {
            return res.status(400).json({
                success: false,
                message: `Cost mismatch. Client sent ${cost}, but server expected ${expectedCost}.`
            });
        }

        // 3. Process the on-chain payment via the Oracle
        // The client must have already called `approve` on the BCOIN contract
        await oracle.processHeroUpgrade(req.user.address, expectedCost);

        // 4. If payment is successful, apply the stat upgrade
        const newStats = heroUpgrades[upgradeType].effect(hero);
        await db.updateHeroStats(heroId, newStats);

        // 5. Fetch the fully updated hero data to return to the client
        const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
        const updatedHero = updatedHeroes.find(h => h.id.toString() === heroId);

        res.json({
            success: true,
            message: `Hero ${upgradeType} upgraded successfully!`,
            hero: updatedHero
        });

    } catch (error) {
        console.error(`Error purchasing upgrade ${upgradeType} for hero ${heroId}:`, error);
        // Check for specific error messages from the oracle/blockchain
        if (error.message.includes("transfer failed") || error.message.includes("insufficient allowance")) {
            return res.status(402).json({ success: false, message: "Blockchain transaction failed. Check BCOIN balance and approval." });
        }
        res.status(500).json({ success: false, message: 'Internal server error during upgrade purchase.' });
    }
});


const { getExperienceForLevel } = require('./rpg');

app.post('/api/heroes/:heroId/level-up', verifyToken, async (req, res) => {
    const { heroId } = req.params;
    const { txHash } = req.body;
    const LEVEL_UP_BCOIN_FEE = 1;

    if (!txHash) {
        return res.status(400).json({ success: false, message: "Transaction hash (txHash) is required." });
    }

    try {
        // 1. Fetch hero and verify ownership
        const heroes = await db.getHeroesByUserId(req.user.userId);
        const hero = heroes.find(h => h.id.toString() === heroId);

        if (!hero) {
            return res.status(404).json({ success: false, message: "Hero not found or you don't own it." });
        }

        // 2. Check if the hero has enough XP to level up
        const xpForNextLevel = getExperienceForLevel(hero.level + 1);
        if (hero.xp < xpForNextLevel) {
            return res.status(403).json({
                success: false,
                message: `Insufficient XP to level up. Needs ${xpForNextLevel}, has ${hero.xp}.`
            });
        }

        // 3. Verify the on-chain transaction via the Oracle
        await oracle.verifyLevelUpTransaction(txHash, req.user.address, LEVEL_UP_BCOIN_FEE);

        // 4. If verification is successful, apply the level-up logic
        const newStats = {
            level: hero.level + 1,
            hp: hero.maxHp + 10, // Refill HP to the new max
            maxHp: hero.maxHp + 10, // Increase max HP
            // Note: We do not subtract the XP here. The frontend will display progress
            // towards the *next* level based on the total accumulated XP.
            // The getExperienceForLevel function calculates total XP needed, not incremental.
        };

        await db.updateHeroStats(heroId, newStats);

        // 5. Fetch the fully updated hero data to return
        const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
        const updatedHero = updatedHeroes.find(h => h.id.toString() === heroId);

        res.json({
            success: true,
            message: 'Hero leveled up successfully!',
            hero: updatedHero
        });

    } catch (error) {
        console.error(`Error leveling up hero ${heroId} for user ${req.user.userId}:`, error);
        if (error.message.includes("mismatch") || error.message.includes("not found")) {
            return res.status(400).json({ success: false, message: `Transaction verification failed: ${error.message}` });
        }
        res.status(500).json({ success: false, message: 'Internal server error during hero level-up.' });
    }
});

// =================================================================
// ROTAS DE JOGO
// =================================================================

app.post('/api/matches/complete', verifyToken, async (req, res) => {
    const { heroId, xpGained } = req.body;

    if (!heroId || typeof xpGained === 'undefined' || xpGained < 0) {
        return res.status(400).json({ success: false, message: 'Request must include a valid heroId and a non-negative xpGained.' });
    }

    try {
        // First, verify that the hero belongs to the authenticated user.
        const heroes = await db.getHeroesByUserId(req.user.userId);
        const heroExists = heroes.some(h => h.id === heroId);

        if (!heroExists) {
            return res.status(403).json({ success: false, message: 'The specified hero does not belong to the authenticated user.' });
        }

        // If ownership is confirmed, add the XP.
        const result = await db.addXpToHero(heroId, xpGained);

        if (result.success) {
            res.json({
                success: true,
                message: `Successfully awarded ${xpGained} XP to hero ${heroId}.`,
                hero: result.hero
            });
        } else {
            // This case might be redundant due to the error handling below, but it's good practice.
            res.status(500).json({ success: false, message: 'An unexpected error occurred while awarding XP.' });
        }
    } catch (error) {
        console.error(`Error completing match for hero ${heroId}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error while completing match.' });
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

// Rota de Debug para atribuir um herói mock a uma carteira (para fins de teste)
app.post('/api/debug/assign-mock-hero', verifyAdmin, async (req, res) => {
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

// Rota pública para obter as configurações do jogo (ex: monster scaling factor)
app.get('/api/game/settings', async (req, res) => {
    try {
        const settings = await admin.getGameSettings();
        res.json({ success: true, settings });
    } catch (error) {
        console.error("Erro em /api/game/settings:", error);
        res.status(500).json({ success: false, message: 'Erro ao buscar as configurações do jogo.' });
    }
});


// =================================================================
// ROTAS DO ALTAR DE BUFFS
// =================================================================

app.get('/api/altar/status', async (req, res) => {
    try {
        const status = await db.getAltarStatus();
        res.json({ success: true, status });
    } catch (error) {
        console.error("Error fetching altar status:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch altar status.' });
    }
});

app.post('/api/altar/donate', verifyToken, async (req, res) => {
    const { amount, txHash } = req.body;

    if (!amount || amount <= 0 || !txHash) {
        return res.status(400).json({ success: false, message: "Invalid request. Amount and txHash are required." });
    }

    try {
        // 1. Verify the transaction on the blockchain using the Oracle
        await oracle.verifyAltarDonation(txHash, req.user.address, amount);

        // 2. If verification is successful, update the database
        await db.addDonationToAltar(amount);

        // 3. Fetch the latest status to return to the client
        const newStatus = await db.getAltarStatus();

        res.json({
            success: true,
            message: `Successfully verified donation of ${amount} BCOIN! Thank you!`,
            altarStatus: newStatus
        });

    } catch (error) {
        console.error(`Error verifying donation from ${req.user.address} with txHash ${txHash}:`, error);
        // Provide specific feedback if verification fails
        if (error.message.includes("mismatch") || error.message.includes("not found")) {
            return res.status(400).json({ success: false, message: `Transaction verification failed: ${error.message}` });
        }
        res.status(500).json({ success: false, message: 'Internal server error during donation verification.' });
    }
});


// =================================================================
// ROTAS DE MATCHMAKING
// =================================================================

app.post('/api/matchmaking/join', verifyToken, async (req, res) => {
    const { heroId } = req.body;
    if (!heroId) {
        return res.status(400).json({ success: false, message: 'O ID do herói (heroId) é obrigatório.' });
    }
    try {
        const result = await matchmaking.joinQueue(req.user.userId, heroId);
        res.json(result);
    } catch (error) {
        console.error(`Erro ao adicionar usuário ${req.user.userId} à fila:`, error);
        res.status(500).json({ success: false, message: 'Erro interno ao entrar na fila.' });
    }
});

app.post('/api/matchmaking/leave', verifyToken, async (req, res) => {
    try {
        const result = await matchmaking.leaveQueue(req.user.userId);
        res.json(result);
    } catch (error) {
        console.error(`Erro ao remover usuário ${req.user.userId} da fila:`, error);
        res.status(500).json({ success: false, message: 'Erro interno ao sair da fila.' });
    }
});

app.get('/api/matchmaking/status', verifyToken, async (req, res) => {
    try {
        const result = await matchmaking.getQueueStatus(req.user.userId);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error(`Erro ao obter status da fila para o usuário ${req.user.userId}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno ao obter status da fila.' });
    }
});


// =================================================================
// LÓGICA DO ALTAR DE BUFFS (CRON JOB)
// =================================================================

const BUFFS = [
    { type: 'XP_BOOST', description: '+10% XP for 24 hours', duration_hours: 24 },
    { type: 'RARE_ITEM_DROP', description: '+5% chance to find rare items for 12 hours', duration_hours: 12 },
    { type: 'COIN_BONANZA', description: '+15% BCOIN from matches for 6 hours', duration_hours: 6 }
];

async function checkAltarAndActivateBuff() {
    try {
        const status = await db.getAltarStatus();

        // Check if a buff is already active or if the goal hasn't been met
        if (status.active_buff_type || status.current_donations < status.donation_goal) {
            return;
        }

        console.log(`[ALTAR] Donation goal reached! Activating a new global buff.`);

        // Select a random buff
        const buff = BUFFS[Math.floor(Math.random() * BUFFS.length)];
        const expirationTime = new Date(Date.now() + buff.duration_hours * 60 * 60 * 1000);

        // Update the database
        await db.updateAltarStatus({
            current_donations: 0, // Reset donations
            active_buff_type: buff.type,
            buff_expires_at: expirationTime.toISOString()
        });

        console.log(`[ALTAR] Activated Buff: ${buff.description}. Expires at ${expirationTime.toISOString()}`);

    } catch (error) {
        console.error("[ALTAR CRON] Error checking or activating altar buff:", error);
    }
}


async function startServer() {
    console.log("=============================================");
    console.log("     INICIALIZANDO O SERVIDOR DO JOGO      ");
    console.log("=============================================");

    try {
        // 1. Inicializar o Banco de Dados
        await db.initDb();
        console.log("[OK] Conexão com o banco de dados estabelecida com sucesso.");

        // 2. Inicializar o Oráculo
        const oracleInitialized = await oracle.initOracle();
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

        // 4. Iniciar o processador da fila de Matchmaking
        setInterval(matchmaking.processQueue, 5000); // Processa a cada 5 segundos
        console.log("[OK] Processador da fila de matchmaking iniciado.");

        // 4.5 Iniciar o Cron Job do Altar de Buffs
        setInterval(checkAltarAndActivateBuff, 60000); // Roda a cada minuto
        console.log("[OK] Cron job do Altar de Buffs iniciado.");

        // 5. Iniciar o Servidor Express
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