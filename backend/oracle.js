const { ethers } = require('ethers');
const cron = require('node-cron');
const db = require('./database');

// --- Configuração do Oráculo ---
// Estas variáveis devem ser carregadas de um arquivo .env em produção
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/'; // BSC Testnet
const TOURNAMENT_CONTROLLER_ADDRESS = process.env.TOURNAMENT_CONTROLLER_ADDRESS;
const PERPETUAL_REWARD_POOL_ADDRESS = process.env.PERPETUAL_REWARD_POOL_ADDRESS;
const WAGER_ARENA_ADDRESS = process.env.WAGER_ARENA_ADDRESS; // Novo endereço do contrato

// ABIs (Application Binary Interface) dos contratos - construídas manualmente
const TOURNAMENT_CONTROLLER_ABI = [
    "function reportMatchResult(uint256 matchId, address winner)",
    "function reportTournamentResult(uint256 tournamentId, address[] calldata winners)",
    "function payLevelUpFee(address player)"
];
const PERPETUAL_REWARD_POOL_ABI = [
    "function reportSoloGamePlayed(uint256 gameCount)",
    "function startNewCycle()"
];
const WAGER_ARENA_ABI = [
    "function reportWagerMatchResult(uint256 matchId, address winner)",
    "event WagerMatchCreated(uint256 indexed matchId, uint256 indexed tierId, address player1, address player2, uint256 totalWager)"
];


// --- Inicialização do Oráculo ---
let provider;
let oracleWallet;
let tournamentControllerContract;
let perpetualRewardPoolContract;
let wagerArenaContract; // Novo contrato
let isOracleInitialized = false;

/**
 * Inicializa o serviço do Oráculo, conectando-se à blockchain e carregando os contratos.
 */
function initOracle() {
    if (!ORACLE_PRIVATE_KEY || !BSC_RPC_URL || !TOURNAMENT_CONTROLLER_ADDRESS || !PERPETUAL_REWARD_POOL_ADDRESS || !WAGER_ARENA_ADDRESS) {
        console.warn("Variáveis de ambiente do Oráculo não estão configuradas. O serviço do Oráculo está desativado.");
        isOracleInitialized = false;
        return false;
    }

    try {
        provider = new ethers.providers.JsonRpcProvider(BSC_RPC_URL);
        oracleWallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);

        tournamentControllerContract = new ethers.Contract(
            TOURNAMENT_CONTROLLER_ADDRESS,
            TOURNAMENT_CONTROLLER_ABI,
            oracleWallet
        );

        perpetualRewardPoolContract = new ethers.Contract(
            PERPETUAL_REWARD_POOL_ADDRESS,
            PERPETUAL_REWARD_POOL_ABI,
            oracleWallet
        );

        wagerArenaContract = new ethers.Contract(
            WAGER_ARENA_ADDRESS,
            WAGER_ARENA_ABI,
            oracleWallet
        );

        console.log(`Oráculo inicializado com sucesso. Endereço: ${oracleWallet.address}`);
        console.log(`Conectado ao TournamentController em: ${tournamentControllerContract.address}`);
        console.log(`Conectado ao PerpetualRewardPool em: ${perpetualRewardPoolContract.address}`);
        console.log(`Conectado à WagerArena em: ${wagerArenaContract.address}`);
        isOracleInitialized = true;
        return true;
    } catch (error) {
        console.error("Falha ao inicializar o Oráculo:", error.message);
        isOracleInitialized = false;
        return false;
    }
}

// --- Funções do Oráculo ---

async function reportMatchResult(matchId, winnerAddress) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");
    console.log(`Reportando resultado da partida ${matchId}. Vencedor: ${winnerAddress}`);

    const tx = await tournamentControllerContract.reportMatchResult(matchId, winnerAddress, { gasLimit: 300000 });
    console.log(`Transação on-chain enviada: ${tx.hash}`);

    // We await confirmation to ensure the result is locked in before awarding XP
    await tx.wait();
    console.log(`Transação confirmada. Vencedor ${winnerAddress} registrado no contrato.`);

    try {
        const xpAmount = 50; // Fixed XP for a win
        await db.addXpToUser(winnerAddress, xpAmount); // Corrected function call
        console.log(`Sucesso! Concedido ${xpAmount} de XP para ${winnerAddress}.`);
    } catch (error) {
        // Log the error, but don't let it crash the process. The on-chain part is the most critical.
        console.error(`Falha ao conceder XP (off-chain) para ${winnerAddress}:`, error.message);
    }

    return tx;
}

async function reportWagerMatchResult(matchId, winnerAddress, loserAddress, tierId) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");
    console.log(`Reportando resultado da partida de aposta ${matchId}. Vencedor: ${winnerAddress}, Perdedor: ${loserAddress}`);

    // 1. On-chain settlement of BCOIN
    console.log(`Iniciando liquidação on-chain para a partida ${matchId}...`);
    const tx = await wagerArenaContract.reportWagerMatchResult(matchId, winnerAddress, { gasLimit: 300000 });
    console.log(`Transação on-chain enviada: ${tx.hash}`);
    await tx.wait();
    console.log(`Transação on-chain confirmada. Vencedor ${winnerAddress} recebeu o prêmio em BCOIN.`);

    // 2. Off-chain settlement of XP and de-level check
    try {
        console.log(`Iniciando liquidação off-chain para a partida ${matchId}...`);
        const tier = await db.getWagerTier(tierId);
        if (!tier) {
            throw new Error(`Tier com ID ${tierId} não encontrado no banco de dados.`);
        }

        const result = await db.processWagerMatchResult(winnerAddress, loserAddress, tier);
        console.log(`Sucesso! Liquidação off-chain completa.`);
        console.log(`Vencedor: +${tier.xp_cost} XP, +${tier.bcoin_cost} BCOIN.`);
        console.log(`Perdedor: -${tier.xp_cost} XP, -${tier.bcoin_cost} BCOIN. Novo nível: ${result.loser.newLevel}`);
    } catch (error) {
        // Critical error: The on-chain part succeeded but off-chain failed.
        // This requires manual intervention or a retry mechanism.
        console.error(`ERRO CRÍTICO: Falha na liquidação off-chain para a partida ${matchId} após sucesso on-chain.`, error.message);
        // In a real system, this would trigger an alert.
    }

    return tx;
}


async function reportTournamentResult(tournamentId, winnerAddresses) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");
    console.log(`Reportando resultado do torneio ${tournamentId}. Vencedores: ${winnerAddresses.join(', ')}`);
    const tx = await tournamentControllerContract.reportTournamentResult(tournamentId, winnerAddresses);
    console.log(`Transação enviada: ${tx.hash}`);
    return tx;
}

async function reportSoloGamePlayed(gameCount) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");
    console.log(`Reportando ${gameCount} partidas solo jogadas.`);
    const tx = await perpetualRewardPoolContract.reportSoloGamePlayed(gameCount);
    console.log(`Transação enviada: ${tx.hash}`);
    return tx;
}

async function signClaimReward(playerAddress, gamesPlayed) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");

    // O hash deve corresponder exatamente ao que é gerado no smart contract:
    // keccak256(abi.encodePacked(player, gamesPlayed, address(this)))
    const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'uint256', 'address'],
        [playerAddress, gamesPlayed, PERPETUAL_REWARD_POOL_ADDRESS]
    );

    // ethers.js signMessage irá automaticamente prefixar o hash com "\x19Ethereum Signed Message:\n32"
    const signature = await oracleWallet.signMessage(ethers.utils.arrayify(messageHash));
    return signature;
}

async function triggerLevelUpPayment(playerAddress) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");
    console.log(`Iniciando pagamento da taxa de level-up para: ${playerAddress}`);

    // The oracle calls the contract, which in turn pulls the fee from the player's wallet
    const tx = await tournamentControllerContract.payLevelUpFee(playerAddress, { gasLimit: 200000 });
    console.log(`Transação de pagamento de taxa enviada: ${tx.hash}`);

    // We await confirmation to ensure the fee was processed before returning
    await tx.wait();
    console.log(`Transação de pagamento de taxa confirmada para ${playerAddress}.`);

    return tx;
}

// --- Cron Jobs ---

/**
 * Tenta iniciar um novo ciclo de recompensas no contrato PerpetualRewardPool.
 */
async function triggerNewRewardCycle() {
    if (!isOracleInitialized) {
        console.log("Cron job: Oráculo não inicializado, pulando o início do novo ciclo.");
        return;
    }
    try {
        console.log("Cron job: Tentando iniciar um novo ciclo de recompensas...");
        const tx = await perpetualRewardPoolContract.startNewCycle({ gasLimit: 150000 });
        await tx.wait();
        console.log(`Cron job: Novo ciclo de recompensas iniciado com sucesso. Tx: ${tx.hash}`);
    } catch (error) {
        // É normal que isso falhe se o tempo mínimo não tiver passado.
        // Apenas logamos erros "reais" para evitar poluir os logs.
        if (!error.message.includes("A new cycle can only be started every 10 minutes")) {
            console.error("Cron job: Erro ao tentar iniciar novo ciclo:", error.message);
        }
    }
}

/**
 * Inicia todos os cron jobs agendados para o Oráculo.
 */
/**
 * Tarefa agendada que aumenta a dificuldade do jogo anualmente (o "Halving").
 */
async function triggerDifficultyHalving() {
    if (!isOracleInitialized) {
        console.log("Cron job: Oráculo não inicializado, pulando o Halving de Dificuldade.");
        return;
    }
    try {
        console.log("Cron job: Verificando o Halving Anual de Dificuldade...");
        const currentMultiplierStr = await db.getGameSetting('xp_multiplier');
        const currentMultiplier = parseFloat(currentMultiplierStr || '1.0');

        // A lógica de quando o halving deve ocorrer seria mais complexa em produção
        // (ex: verificar a data). Para este exemplo, vamos apenas incrementar.
        const newMultiplier = currentMultiplier + 0.1;

        await db.updateGameSetting('xp_multiplier', newMultiplier.toFixed(1));
        console.log(`HALVING DE DIFICULDADE COMPLETO! Novo multiplicador de XP é ${newMultiplier.toFixed(1)}.`);

    } catch (error) {
        console.error("Cron job: Erro ao executar o Halving de Dificuldade:", error.message);
    }
}


/**
 * Inicia o listener para eventos `WagerMatchCreated` do contrato WagerArena.
 */
function startWagerMatchListener() {
    if (!isOracleInitialized || !wagerArenaContract) {
        console.warn("Listener de partidas de aposta não iniciado porque o Oráculo não está pronto.");
        return;
    }

    console.log("Iniciando listener para eventos de criação de partidas de aposta...");

    wagerArenaContract.on("WagerMatchCreated", async (matchId, tierId, player1, player2, totalWager, event) => {
        console.log("--- Evento WagerMatchCreated Recebido ---");
        console.log(`Match ID: ${matchId.toString()}`);
        console.log(`Tier ID: ${tierId.toString()}`);
        console.log(`Player 1: ${player1}`);
        console.log(`Player 2: ${player2}`);
        console.log(`Total Wager: ${ethers.utils.formatEther(totalWager)} BCOIN`);
        console.log("-----------------------------------------");

        try {
            const matchData = {
                matchId: matchId.toNumber(),
                tierId: tierId.toNumber(),
                player1: player1,
                player2: player2
            };
            await db.createWagerMatch(matchData);
            console.log(`Partida de aposta ${matchId} registrada no banco de dados.`);
        } catch (error) {
            console.error(`Erro ao registrar a partida de aposta ${matchId} no banco de dados:`, error.message);
            // Em um sistema de produção, isso deveria acionar um alerta.
        }
    });

    wagerArenaContract.provider.on("error", (error) => {
        console.error("Erro no provedor do listener de eventos:", error);
        // Tentar reiniciar o listener ou a conexão pode ser uma estratégia aqui.
    });
}


function startCronJobs() {
    if (!isOracleInitialized) {
        console.warn("Cron jobs não iniciados porque o Oráculo está desativado.");
        return;
    }

    // Agendado para rodar a cada 10 minutos.
    cron.schedule('*/10 * * * *', triggerNewRewardCycle);
    console.log("Cron job para o ciclo de recompensas agendado para rodar a cada 10 minutos.");

    // Agendado para rodar anualmente à meia-noite de 1º de janeiro.
    // cron.schedule('*/5 * * * *', triggerDifficultyHalving); // Para teste: a cada 5 minutos
    cron.schedule('0 0 1 1 *', triggerDifficultyHalving);
    console.log("Cron job para o Halving de Dificuldade agendado para rodar anualmente.");
}

// Sobrescrevendo a função initOracle para incluir o listener
const originalInitOracle = initOracle;
function initOracleAndListeners() {
    if (originalInitOracle()) { // Se a inicialização do oráculo for bem-sucedida
        startWagerMatchListener();
        startCronJobs();
        return true;
    }
    return false;
}


module.exports = {
    initOracle: initOracleAndListeners, // Expor a nova função de inicialização
    reportMatchResult,
    reportTournamentResult,
    reportSoloGamePlayed,
    signClaimReward,
    triggerLevelUpPayment,
    reportWagerMatchResult
};