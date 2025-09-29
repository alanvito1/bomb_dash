const { ethers } = require('ethers');
const cron = require('node-cron');
const { addXpToUser } = require('./database'); // Importar a função de XP

// --- Configuração do Oráculo ---
// Estas variáveis devem ser carregadas de um arquivo .env em produção
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/'; // BSC Testnet
const TOURNAMENT_CONTROLLER_ADDRESS = process.env.TOURNAMENT_CONTROLLER_ADDRESS;
const PERPETUAL_REWARD_POOL_ADDRESS = process.env.PERPETUAL_REWARD_POOL_ADDRESS;

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


// --- Inicialização do Oráculo ---
let provider;
let oracleWallet;
let tournamentControllerContract;
let perpetualRewardPoolContract;
let isOracleInitialized = false;

/**
 * Inicializa o serviço do Oráculo, conectando-se à blockchain e carregando os contratos.
 */
function initOracle() {
    if (!ORACLE_PRIVATE_KEY || !BSC_RPC_URL || !TOURNAMENT_CONTROLLER_ADDRESS || !PERPETUAL_REWARD_POOL_ADDRESS) {
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

        console.log(`Oráculo inicializado com sucesso. Endereço: ${oracleWallet.address}`);
        console.log(`Conectado ao TournamentController em: ${tournamentControllerContract.address}`);
        console.log(`Conectado ao PerpetualRewardPool em: ${perpetualRewardPoolContract.address}`);
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
        await addXpToUser(winnerAddress, xpAmount);
        console.log(`Sucesso! Concedido ${xpAmount} de XP para ${winnerAddress}.`);
    } catch (error) {
        // Log the error, but don't let it crash the process. The on-chain part is the most critical.
        console.error(`Falha ao conceder XP (off-chain) para ${winnerAddress}:`, error.message);
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
function startCronJobs() {
    if (!isOracleInitialized) {
        console.warn("Cron jobs não iniciados porque o Oráculo está desativado.");
        return;
    }

    // Agendado para rodar a cada 10 minutos.
    cron.schedule('*/10 * * * *', triggerNewRewardCycle);

    console.log("Cron job para o ciclo de recompensas agendado para rodar a cada 10 minutos.");
}


/**
 * Busca informações públicas do ciclo de recompensas diretamente do contrato.
 * @returns {Promise<{rewardPerGame: BigNumber, lastCycleTimestamp: BigNumber}>}
 */
async function getRewardCycleInfo() {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");

    // O Ethers.js permite chamar funções `public view` diretamente.
    const rewardPerGame = await perpetualRewardPoolContract.rewardPerGameThisCycle();
    const lastCycleTimestamp = await perpetualRewardPoolContract.lastCycleTimestamp();

    return { rewardPerGame, lastCycleTimestamp };
}

module.exports = {
    initOracle,
    reportMatchResult,
    reportTournamentResult,
    reportSoloGamePlayed,
    signClaimReward,
    triggerLevelUpPayment,
    startCronJobs,
    getRewardCycleInfo
};