const { ethers } = require('ethers');

// --- Configuração do Oráculo ---
// Estas variáveis devem ser carregadas de um arquivo .env em produção
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/'; // BSC Testnet
const TOURNAMENT_CONTROLLER_ADDRESS = process.env.TOURNAMENT_CONTROLLER_ADDRESS;
const PERPETUAL_REWARD_POOL_ADDRESS = process.env.PERPETUAL_REWARD_POOL_ADDRESS;

// ABIs (Application Binary Interface) dos contratos - construídas manualmente
const TOURNAMENT_CONTROLLER_ABI = [
    "function reportMatchResult(uint256 matchId, address winner)",
    "function reportTournamentResult(uint256 tournamentId, address[] calldata winners)"
];
const PERPETUAL_REWARD_POOL_ABI = [
    "function reportSoloGamePlayed(uint256 gameCount)"
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
    console.log(`Transação enviada: ${tx.hash}`);
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

module.exports = {
    initOracle,
    reportMatchResult,
    reportTournamentResult,
    reportSoloGamePlayed,
    signClaimReward
};