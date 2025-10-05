const { ethers } = require('ethers');
const db = require('./database');

// --- Configuração do Oráculo ---
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const BSC_RPC_URL = process.env.TESTNET_RPC_URL;
const TOURNAMENT_CONTROLLER_ADDRESS = process.env.TOURNAMENT_CONTROLLER_ADDRESS;

// ABI atualizada para incluir as novas funções e eventos do PvP Ranqueado
const TOURNAMENT_CONTROLLER_ABI = [
    "function reportMatchResult(uint256 matchId, address winner)",
    "function payLevelUpFee(address player)",
    "function payUpgradeFee(address player, uint256 cost)",
    "function createRankedMatch(address player1, address player2, uint256 tier, uint256 entryFee)",
    "function enterRankedMatch(uint256 tier, uint256 entryFee)",
    "event PlayerEnteredRankedQueue(address indexed player, uint256 indexed tier, uint256 entryFee)",
    "event MatchCreated(uint256 indexed matchId, address[] players, uint256 entryFee, uint256 tier)",
    "event AltarDonationReceived(address indexed donor, uint256 amount)",
    "event HeroLeveledUp(address indexed player, uint256 feePaid)",
    "event HeroUpgradePaid(address indexed player, uint256 costPaid)"
];

let provider;
let oracleWallet;
let tournamentControllerContract;
let isOracleInitialized = false;

async function initOracle() {
    if (!ORACLE_PRIVATE_KEY || !BSC_RPC_URL || !TOURNAMENT_CONTROLLER_ADDRESS) {
        console.warn("Variáveis de ambiente essenciais do Oráculo não estão configuradas. O serviço do Oráculo está desativado.");
        isOracleInitialized = false;
        return false;
    }
    try {
        provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
        oracleWallet = new ethers.Wallet(ORACLE_PRIVATE_KEY, provider);
        tournamentControllerContract = new ethers.Contract(TOURNAMENT_CONTROLLER_ADDRESS, TOURNAMENT_CONTROLLER_ABI, oracleWallet);
        isOracleInitialized = true;
        console.log("[OK] Oráculo da blockchain inicializado para PvP.");
        return true;
    } catch (error) {
        console.error("Falha ao inicializar o Oráculo:", error.message);
        isOracleInitialized = false;
        return false;
    }
}

/**
 * Chama o contrato para criar uma partida ranqueada on-chain.
 * @param {string} player1 Address do jogador 1.
 * @param {string} player2 Address do jogador 2.
 * @param {number} tier O tier da partida.
 * @param {number} entryFee A taxa de entrada paga por cada jogador.
 * @returns {Promise<object>} O objeto da transação.
 */
async function createRankedMatch(player1, player2, tier, entryFee) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");

    const entryFeeInWei = ethers.parseUnits(entryFee.toString(), 18);
    const tx = await tournamentControllerContract.createRankedMatch(player1, player2, tier, entryFeeInWei, { gasLimit: 300000 });
    const receipt = await tx.wait();

    // Encontrar o evento MatchCreated para obter o ID da partida
    const matchCreatedEvent = receipt.logs
        .map(log => {
            try {
                return tournamentControllerContract.interface.parseLog(log);
            } catch (e) {
                return null;
            }
        })
        .find(decodedLog => decodedLog && decodedLog.name === 'MatchCreated');

    if (!matchCreatedEvent) {
        throw new Error("Evento MatchCreated não encontrado na transação.");
    }

    const matchId = matchCreatedEvent.args.matchId;
    console.log(`[Oracle] Partida ranqueada criada on-chain com ID: ${matchId}`);

    return { txHash: tx.hash, matchId: matchId.toString() };
}

/**
 * Reporta o resultado de uma partida ranqueada para o smart contract.
 * @param {number} matchId O ID da partida.
 * @param {string} winnerAddress O endereço do vencedor.
 * @returns {Promise<object>} O objeto da transação.
 */
async function reportRankedMatchResult(matchId, winnerAddress) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");

    console.log(`[Oracle] Reportando resultado para a partida ${matchId}. Vencedor: ${winnerAddress}`);
    const tx = await tournamentControllerContract.reportMatchResult(matchId, winnerAddress, { gasLimit: 250000 });
    await tx.wait();

    console.log(`[Oracle] Resultado da partida ${matchId} reportado com sucesso. Tx: ${tx.hash}`);
    return { success: true, txHash: tx.hash };
}

/**
 * Verifica a transação de pagamento da taxa de entrada do PvP.
 * @param {string} txHash O hash da transação.
 * @param {string} expectedPlayer O endereço do jogador esperado.
 * @param {number} expectedFee A taxa de entrada esperada em BCOIN.
 * @returns {Promise<{success: boolean, tier: number}>} Sucesso e o tier do jogador.
 */
async function verifyPvpEntryFee(txHash, expectedPlayer, expectedFee) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
        throw new Error("Transação falhou ou não foi encontrada.");
    }

    const entryEvent = receipt.logs
        .map(log => {
            try {
                return tournamentControllerContract.interface.parseLog(log);
            } catch (e) {
                return null;
            }
        })
        .find(decodedLog => decodedLog && decodedLog.name === 'PlayerEnteredRankedQueue');

    if (!entryEvent) {
        throw new Error("Evento PlayerEnteredRankedQueue não encontrado na transação.");
    }

    const { player, tier, entryFee } = entryEvent.args;
    const expectedFeeInWei = ethers.parseUnits(expectedFee.toString(), 18);

    if (player.toLowerCase() !== expectedPlayer.toLowerCase()) {
        throw new Error(`Endereço do jogador não corresponde. Esperado: ${expectedPlayer}, Recebido: ${player}`);
    }
    if (entryFee !== expectedFeeInWei) {
        throw new Error(`Taxa de entrada não corresponde. Esperado: ${expectedFeeInWei}, Recebido: ${entryFee}`);
    }

    console.log(`[Oracle] Taxa de entrada de ${expectedFee} BCOIN verificada para o jogador ${player} no tier ${tier}.`);
    return { success: true, tier: Number(tier) };
}

// Manter outras funções do oráculo se necessário, por exemplo, para level up.
async function verifyLevelUpTransaction(txHash, expectedPlayer, expectedFee) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) throw new Error("Transação de Level Up falhou.");
    const event = receipt.logs.map(log => {
        try { return tournamentControllerContract.interface.parseLog(log); } catch(e) { return null; }
    }).find(l => l && l.name === 'HeroLeveledUp');
    if (!event) throw new Error("Evento HeroLeveledUp não encontrado.");
    const { player, feePaid } = event.args;
    const expectedFeeInWei = ethers.parseUnits(expectedFee.toString(), 18);
    if (player.toLowerCase() !== expectedPlayer.toLowerCase()) throw new Error("Jogador do evento de Level Up não corresponde.");
    if (feePaid !== expectedFeeInWei) throw new Error("Taxa do evento de Level Up não corresponde.");
    return true;
}


async function verifyUpgradeTransaction(txHash, expectedPlayer, expectedCost) {
    if (!isOracleInitialized) throw new Error("O Oráculo não está inicializado.");

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
        throw new Error("Transação de upgrade falhou ou não foi encontrada.");
    }

    // Find the HeroUpgradePaid event in the transaction logs
    const upgradeEvent = receipt.logs
        .map(log => {
            try {
                // Ensure the log is from the correct contract before parsing
                if (log.address.toLowerCase() === TOURNAMENT_CONTROLLER_ADDRESS.toLowerCase()) {
                    return tournamentControllerContract.interface.parseLog(log);
                }
                return null;
            } catch (e) {
                return null; // Ignore logs that are not from the target contract
            }
        })
        .find(decodedLog => decodedLog && decodedLog.name === 'HeroUpgradePaid');

    if (!upgradeEvent) {
        throw new Error("Evento HeroUpgradePaid não encontrado na transação.");
    }

    const { player, costPaid } = upgradeEvent.args;
    const expectedCostInWei = ethers.parseUnits(expectedCost.toString(), 18);

    // Validate the event data
    if (player.toLowerCase() !== expectedPlayer.toLowerCase()) {
        throw new Error(`Endereço do jogador não corresponde. Esperado: ${expectedPlayer}, Recebido: ${player}`);
    }
    if (costPaid !== expectedCostInWei) {
        throw new Error(`Custo do upgrade não corresponde. Esperado: ${expectedCostInWei}, Recebido: ${costPaid}`);
    }

    console.log(`[Oracle] Upgrade de ${expectedCost} BCOIN verificado para o jogador ${player}.`);
    return true;
}


module.exports = {
    initOracle,
    createRankedMatch,
    reportRankedMatchResult,
    verifyPvpEntryFee,
    verifyLevelUpTransaction,
    verifyUpgradeTransaction
};