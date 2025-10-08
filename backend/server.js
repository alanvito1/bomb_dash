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
const pvpService = require('./pvp_service.js'); // Importar o novo serviço de PvP
const soloRewardService = require('./solo_reward_service.js'); // Importar o serviço de recompensa solo
const stakingListener = require('./staking_listener.js'); // Importar o novo listener de staking

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

// Configuração do CORS para permitir todas as origens (mais flexível para desenvolvimento)
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
        const { userId, address } = req.user;

        // 1. Sync with on-chain data
        const onChainNfts = await nft.getNftsForPlayer(address);
        if (onChainNfts && onChainNfts.length > 0) {
            const dbNfts = await db.Hero.findAll({ where: { user_id: userId, hero_type: 'nft' } });
            const dbNftIds = new Set(dbNfts.map(h => h.nft_id));

            for (const nftData of onChainNfts) {
                if (!dbNftIds.has(nftData.id)) {
                    // This is a new NFT not yet in our DB, create it.
                    console.log(`[Sync] Found new NFT (ID: ${nftData.id}) for user ${userId}. Adding to DB.`);
                    const heroStats = {
                        hero_type: 'nft',
                        nft_id: nftData.id,
                        level: nftData.level,
                        damage: nftData.bombPower,
                        speed: nftData.speed,
                        hp: 100 + (nftData.level * 10), // Example stat calculation
                        maxHp: 100 + (nftData.level * 10),
                        sprite_name: 'witch_hero', // Default sprite for now
                    };
                    await db.createHeroForUser(userId, heroStats);
                }
                // Future improvement: Update stats for existing NFTs if they changed on-chain.
            }
        }

        // 2. Get the definitive list from our DB (which is now synced)
        let heroes = await db.getHeroesByUserId(userId);

        // 3. Assign mocks ONLY if the user has NO heroes at all after the sync
        if (heroes.length === 0) {
             console.log(`[Sync] User ${userId} has no heroes. Assigning mocks.`);
             await nft.assignMockHeroes(userId);
             heroes = await db.getHeroesByUserId(userId); // Re-fetch after adding mocks
        }

        res.json({ success: true, heroes });
    } catch (error) {
        console.error(`Error fetching/syncing heroes for user ${req.user.userId}:`, error);
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

app.post('/api/heroes/:heroId/initiate-withdrawal', verifyToken, async (req, res) => {
    const { heroId } = req.params;

    try {
        // 1. Fetch hero and verify ownership
        const heroes = await db.getHeroesByUserId(req.user.userId);
        const hero = heroes.find(h => h.id.toString() === heroId);

        if (!hero) {
            return res.status(404).json({ success: false, message: "Hero not found or you don't own it." });
        }

        // 2. Check if the hero is an NFT and is staked
        if (hero.hero_type !== 'nft' || hero.status !== 'staked') {
            return res.status(400).json({ success: false, message: "This hero cannot be withdrawn. It must be a staked NFT." });
        }

        // 3. Generate the signature using the Oracle
        const signature = await oracle.signHeroWithdrawal(hero.nft_id, hero.level, hero.xp);

        // 4. Return the necessary data to the frontend
        res.json({
            success: true,
            message: 'Withdrawal signature generated successfully.',
            tokenId: hero.nft_id,
            level: hero.level,
            xp: hero.xp,
            signature: signature
        });

    } catch (error) {
        console.error(`Error initiating withdrawal for hero ${heroId}:`, error);
        if (error.message.includes("Oráculo não está inicializado")) {
             return res.status(503).json({ success: false, message: "The Oracle service is currently unavailable. Please try again later." });
        }
        res.status(500).json({ success: false, message: 'Internal server error during withdrawal initiation.' });
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

        // If ownership is confirmed, add XP to both the hero and the user's account.
        await db.addXpToHero(heroId, xpGained);
        await db.addXpToUser(req.user.address, xpGained);

        // Fetch the updated hero to return the latest data
        const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
        const updatedHero = updatedHeroes.find(h => h.id === heroId);


        res.json({
            success: true,
            message: `Successfully awarded ${xpGained} XP to hero ${heroId}.`,
            hero: updatedHero
        });
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

// Middleware para verificar se a requisição vem de uma fonte confiável (o Oráculo/backend)
function verifyOracle(req, res, next) {
    const oracleSecret = req.headers['x-oracle-secret'];
    // Em um ambiente de produção real, use um segredo mais robusto e não o mesmo do admin.
    if (oracleSecret && oracleSecret === (process.env.ADMIN_SECRET || 'supersecret')) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso negado. Requisição inválida do Oráculo.' });
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

app.post('/api/user/stats', verifyToken, async (req, res) => {
    const { heroId, upgradeType, txHash } = req.body;

    if (!heroId || !upgradeType || !txHash) {
        return res.status(400).json({ success: false, message: "heroId, upgradeType, and txHash are required." });
    }

    if (!heroUpgrades[upgradeType]) {
        return res.status(400).json({ success: false, message: "Invalid upgrade type provided." });
    }

    try {
        // 1. Fetch the hero to verify ownership and get current stats
        const heroes = await db.getHeroesByUserId(req.user.userId);
        const hero = heroes.find(h => h.id.toString() === heroId.toString());

        if (!hero) {
            return res.status(404).json({ success: false, message: "Hero not found or you don't own it." });
        }

        // 2. Calculate the expected cost based on the hero's current stats (server-side)
        const expectedCost = heroUpgrades[upgradeType].cost(hero);

        // 3. Verify the on-chain transaction using the Oracle
        await oracle.verifyUpgradeTransaction(txHash, req.user.address, expectedCost);

        // 4. If verification is successful, apply the stat upgrade
        const newStats = heroUpgrades[upgradeType].effect(hero);
        await db.updateHeroStats(heroId, newStats);

        // 5. Fetch the fully updated hero data to return to the client
        const updatedHeroes = await db.getHeroesByUserId(req.user.userId);
        const updatedHero = updatedHeroes.find(h => h.id.toString() === heroId.toString());

        res.json({
            success: true,
            message: `Hero ${upgradeType} upgraded successfully!`,
            hero: updatedHero
        });

    } catch (error) {
        console.error(`Error processing upgrade for hero ${heroId} with tx ${txHash}:`, error);
        if (error.message.includes("mismatch") || error.message.includes("not found") || error.message.includes("failed")) {
            return res.status(400).json({ success: false, message: `Transaction verification failed: ${error.message}` });
        }
        res.status(500).json({ success: false, message: 'Internal server error during hero upgrade.' });
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

// Rota de Debug completa para preparar um jogador de teste com BCOINs e Heróis
app.post('/api/debug/setup-test-player', verifyAdmin, async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) {
        return res.status(400).json({ success: false, message: 'O endereço da carteira (walletAddress) é obrigatório.' });
    }

    try {
        // 1. Find or create the user
        let user = await db.findUserByAddress(walletAddress);
        if (!user) {
            const newUser = await db.createUserByAddress(walletAddress, 0); // Create with 0 coins initially
            user = { id: newUser.userId, wallet_address: walletAddress };
        } else {
            user = await db.getUserByAddress(walletAddress); // Get full user object if they exist
        }

        // 2. Set BCOIN balance to 10,000
        await db.updatePlayerStats(user.id, { coins: 10000 });

        // 3. Assign mock heroes
        await nft.assignMockHeroes(user.id);

        // 4. Fetch the newly created heroes to find one to stake
        const heroes = await db.getHeroesByUserId(user.id);
        const mockHeroToStake = heroes.find(h => h.hero_type === 'mock');

        if (mockHeroToStake) {
            // 5. Update the hero's status to 'staked'
            await db.updateHeroStats(mockHeroToStake.id, { status: 'staked' });
            console.log(`[Debug] Mock hero ${mockHeroToStake.id} for user ${user.id} has been set to 'staked'.`);
        } else {
            console.warn(`[Debug] Could not find a mock hero to stake for user ${user.id}.`);
        }

        // 6. Fetch the final state of the user to confirm all changes
        const finalUser = await db.getUserByAddress(walletAddress);
        const finalHeroes = await db.getHeroesByUserId(user.id);

        res.json({
            success: true,
            message: `Jogador de teste ${walletAddress} configurado com sucesso.`,
            player: {
                ...finalUser.toJSON(),
                heroes: finalHeroes
            }
        });
    } catch (error) {
        console.error(`Erro ao configurar jogador de teste para ${walletAddress}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno ao configurar o jogador de teste.' });
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
// ROTAS DE RECOMPENSA SOLO (SOLO REWARD)
// =================================================================

app.post('/api/solo/game-completed', verifyToken, async (req, res) => {
    try {
        await db.logSoloGame(req.user.userId);
        res.json({ success: true, message: 'Partida solo registrada.' });
    } catch (error) {
        console.error(`Erro ao registrar partida solo para o usuário ${req.user.userId}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno ao registrar a partida.' });
    }
});

app.post('/api/solo/claim-reward', verifyToken, async (req, res) => {
    try {
        const cycleStartTime = soloRewardService.getLastCycleStartTime();
        if (!cycleStartTime) {
            return res.status(503).json({ success: false, message: 'O sistema de recompensas ainda está inicializando. Tente novamente em um minuto.' });
        }

        const gamesPlayed = await db.getUnclaimedGamesForUser(req.user.userId, cycleStartTime);

        if (gamesPlayed <= 0) {
            return res.status(400).json({ success: false, message: 'Você não tem recompensas de partidas solo para reivindicar neste ciclo.' });
        }

        // Generate the signature for the claim
        const { signature, nonce } = await oracle.signSoloRewardClaim(req.user.address, gamesPlayed);

        // Mark the games as claimed to prevent double-spending
        await db.markGamesAsClaimed(req.user.userId, cycleStartTime);

        res.json({
            success: true,
            message: 'Assinatura para reivindicação de recompensa gerada com sucesso!',
            signature,
            gamesPlayed,
            nonce
        });

    } catch (error) {
        console.error(`Erro ao processar reivindicação de recompensa para o usuário ${req.user.userId}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao processar a reivindicação.' });
    }
});


// =================================================================
// ROTAS DE PVP DE APOSTA (WAGER MODE)
// =================================================================

app.get('/api/pvp/wager/tiers', verifyToken, async (req, res) => {
    try {
        const tiers = await db.getWagerTiers();
        res.json({ success: true, tiers });
    } catch (error) {
        console.error("Error fetching wager tiers:", error);
        res.status(500).json({ success: false, message: 'Failed to fetch wager tiers.' });
    }
});

app.post('/api/pvp/wager/enter', verifyToken, async (req, res) => {
    const { heroId, tierId } = req.body;
    if (!heroId || !tierId) {
        return res.status(400).json({ success: false, message: 'heroId and tierId are required.' });
    }

    try {
        const result = await pvpService.enterWagerQueue(req.user.userId, heroId, tierId);
        res.json(result);
    } catch (error) {
        console.error(`Error entering wager queue for user ${req.user.userId}:`, error);
        // Provide specific user-facing error messages
        if (error.message.includes("does not have enough XP")) {
             return res.status(403).json({ success: false, message: error.message });
        }
        res.status(500).json({ success: false, message: 'Internal server error while entering wager queue.' });
    }
});

app.post('/api/pvp/wager/report', verifyOracle, async (req, res) => {
    const { matchId, winnerAddress, loserAddress, winnerHeroId, loserHeroId, tierId } = req.body;
    if (!matchId || !winnerAddress || !loserAddress || !winnerHeroId || !loserHeroId || !tierId) {
        return res.status(400).json({ success: false, message: 'matchId, winnerAddress, loserAddress, winnerHeroId, loserHeroId, and tierId are all required.' });
    }

    try {
        const result = await pvpService.reportWagerMatch(matchId, winnerAddress, loserAddress, winnerHeroId, loserHeroId, tierId);
        res.json(result);
    } catch (error) {
        console.error(`Error reporting wager match result for match ${matchId}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error while reporting wager match result.' });
    }
});

app.post('/api/pvp/bot-match/report', verifyToken, async (req, res) => {
    const { heroId, tier } = req.body;
    if (!heroId || !tier) {
        return res.status(400).json({ success: false, message: 'heroId and tier are required.' });
    }

    try {
        const result = await pvpService.reportBotMatch(req.user.userId, heroId, tier);
        res.json(result);
    } catch (error) {
        console.error(`Error reporting bot match result for user ${req.user.userId}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error while reporting bot match result.' });
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
// ROTAS DE PVP RANQUEADO (V2)
// =================================================================

app.post('/api/pvp/ranked/enter', verifyToken, async (req, res) => {
    const { heroId, txHash } = req.body;
    if (!heroId || !txHash) {
        return res.status(400).json({ success: false, message: 'heroId e txHash são obrigatórios.' });
    }

    try {
        const result = await pvpService.enterRankedQueue(req.user.userId, heroId, req.user.address, txHash);
        res.json(result);
    } catch (error) {
        console.error(`Erro ao entrar na fila ranqueada para o usuário ${req.user.userId}:`, error);
        // Personalizar mensagens de erro para o cliente
        if (error.message.includes("não corresponde")) {
            return res.status(400).json({ success: false, message: `Falha na verificação da transação: ${error.message}` });
        }
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao entrar na fila.' });
    }
});

// Esta rota seria chamada pelo nosso próprio sistema (ex: o processo de matchmaking)
// para reportar o vencedor e distribuir as recompensas.
app.post('/api/pvp/ranked/report', verifyOracle, async (req, res) => {
    const { matchId, winnerAddress } = req.body;
    if (!matchId || !winnerAddress) {
        return res.status(400).json({ success: false, message: 'matchId e winnerAddress são obrigatórios.' });
    }

    try {
        const result = await pvpService.reportRankedMatch(matchId, winnerAddress);
        res.json(result);
    } catch (error) {
        console.error(`Erro ao reportar resultado da partida ranqueada ${matchId}:`, error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor ao reportar o resultado.' });
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
        // await oracle.initOracle(); // Comentado para testes E2E que não dependem de uma conexão real com o blockchain.

        // 3. Iniciar Cron Jobs
        await gameState.startPvpCycleCron();
        console.log("[OK] Cron jobs (Ciclo de PvP, etc.) foram iniciados.");

        // 4. Iniciar o processador da fila de Matchmaking
        setInterval(matchmaking.processQueue, 5000); // Processa a cada 5 segundos
        console.log("[OK] Processador da fila de matchmaking iniciado.");

        // 4.5 Iniciar o Cron Job do Altar de Buffs
        setInterval(checkAltarAndActivateBuff, 60000); // Roda a cada minuto
        console.log("[OK] Cron job do Altar de Buffs iniciado.");

        // 4.6 Iniciar o Cron Job de Recompensas do Modo Solo
        soloRewardService.startSoloRewardCycleCron();

        // 4.7 Iniciar o Listener de Staking de Heróis
        await stakingListener.initStakingListener();
        console.log("[OK] Listener de staking de heróis iniciado.");

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