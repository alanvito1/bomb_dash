const { ethers } = require('ethers');

// --- Configuração do Oráculo ---
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const BSC_RPC_URL = process.env.TESTNET_RPC_URL;
const TOURNAMENT_CONTROLLER_ADDRESS = process.env.TOURNAMENT_CONTROLLER_ADDRESS;
const PERPETUAL_REWARD_POOL_ADDRESS = process.env.PERPETUAL_REWARD_POOL_ADDRESS;
const HERO_STAKING_ADDRESS = process.env.HERO_STAKING_ADDRESS;
const WAGER_ARENA_ADDRESS = process.env.WAGER_ARENA_ADDRESS;

const PERPETUAL_REWARD_POOL_ABI = require('./contracts/PerpetualRewardPool.json');
const HERO_STAKING_ABI = require('./contracts/HeroStaking.json');
const WAGER_ARENA_ABI = require('./contracts/WagerArena.json');

const TOURNAMENT_CONTROLLER_ABI = require('./contracts/TournamentController.json');

let provider;
let oracleWallet;
let tournamentControllerContract;
let perpetualRewardPoolContract;
let heroStakingContract;
let wagerArenaContract;
let isOracleInitialized = false;

async function initOracle() {
  if (
    !ORACLE_PRIVATE_KEY ||
    !BSC_RPC_URL ||
    !TOURNAMENT_CONTROLLER_ADDRESS ||
    !PERPETUAL_REWARD_POOL_ADDRESS ||
    !HERO_STAKING_ADDRESS
  ) {
    console.warn(
      'Variáveis de ambiente essenciais do Oráculo não estão configuradas. O serviço do Oráculo está desativado.'
    );
    isOracleInitialized = false;
    return false;
  }
  try {
    provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
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
    heroStakingContract = new ethers.Contract(
      HERO_STAKING_ADDRESS,
      HERO_STAKING_ABI,
      oracleWallet
    );

    if (WAGER_ARENA_ADDRESS) {
      wagerArenaContract = new ethers.Contract(
        WAGER_ARENA_ADDRESS,
        WAGER_ARENA_ABI,
        oracleWallet
      );
    } else {
      console.warn('[WARN] WAGER_ARENA_ADDRESS não configurado. Funcionalidades de Wager indisponíveis.');
    }

    isOracleInitialized = true;
    console.log(
      '[OK] Oráculo da blockchain inicializado para PvP e Recompensas.'
    );
    return true;
  } catch (error) {
    console.error('Falha ao inicializar o Oráculo:', error.message);
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
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');

  const entryFeeInWei = ethers.parseUnits(entryFee.toString(), 18);
  const tx = await tournamentControllerContract.createRankedMatch(
    player1,
    player2,
    tier,
    entryFeeInWei,
    { gasLimit: 300000 }
  );
  const receipt = await tx.wait();

  // Encontrar o evento MatchCreated para obter o ID da partida
  const matchCreatedEvent = receipt.logs
    .map((log) => {
      try {
        return tournamentControllerContract.interface.parseLog(log);
      } catch (_e) {
        return null;
      }
    })
    .find((decodedLog) => decodedLog && decodedLog.name === 'MatchCreated');

  if (!matchCreatedEvent) {
    throw new Error('Evento MatchCreated não encontrado na transação.');
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
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');

  console.log(
    `[Oracle] Reportando resultado para a partida ${matchId}. Vencedor: ${winnerAddress}`
  );
  const tx = await tournamentControllerContract.reportMatchResult(
    matchId,
    winnerAddress,
    { gasLimit: 250000 }
  );
  await tx.wait();

  console.log(
    `[Oracle] Resultado da partida ${matchId} reportado com sucesso. Tx: ${tx.hash}`
  );
  return { success: true, txHash: tx.hash };
}

/**
 * Reports the result of a wager match to the WagerArena smart contract.
 * @param {string|number} matchId The ID of the match.
 * @param {string} winnerAddress The address of the winner.
 * @returns {Promise<object>} The transaction result.
 */
async function reportWagerMatchResult(matchId, winnerAddress) {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');
  if (!wagerArenaContract) throw new Error('Contrato WagerArena não configurado.');

  console.log(
    `[Oracle] Reportando resultado de Wager para a partida ${matchId}. Vencedor: ${winnerAddress}`
  );

  const tx = await wagerArenaContract.reportWagerMatchResult(
    matchId,
    winnerAddress,
    { gasLimit: 300000 }
  );
  await tx.wait();

  console.log(
    `[Oracle] Resultado da partida Wager ${matchId} reportado com sucesso. Tx: ${tx.hash}`
  );
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
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw new Error('Transação falhou ou não foi encontrada.');
  }

  const entryEvent = receipt.logs
    .map((log) => {
      try {
        return tournamentControllerContract.interface.parseLog(log);
      } catch (_e) {
        return null;
      }
    })
    .find(
      (decodedLog) =>
        decodedLog && decodedLog.name === 'PlayerEnteredRankedQueue'
    );

  if (!entryEvent) {
    throw new Error(
      'Evento PlayerEnteredRankedQueue não encontrado na transação.'
    );
  }

  const { player, tier, entryFee } = entryEvent.args;
  const expectedFeeInWei = ethers.parseUnits(expectedFee.toString(), 18);

  if (player.toLowerCase() !== expectedPlayer.toLowerCase()) {
    throw new Error(
      `Endereço do jogador não corresponde. Esperado: ${expectedPlayer}, Recebido: ${player}`
    );
  }
  if (entryFee !== expectedFeeInWei) {
    throw new Error(
      `Taxa de entrada não corresponde. Esperado: ${expectedFeeInWei}, Recebido: ${entryFee}`
    );
  }

  console.log(
    `[Oracle] Taxa de entrada de ${expectedFee} BCOIN verificada para o jogador ${player} no tier ${tier}.`
  );
  return { success: true, tier: Number(tier) };
}

// Manter outras funções do oráculo se necessário, por exemplo, para level up.
async function verifyLevelUpTransaction(txHash, expectedPlayer, expectedFee) {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1)
    throw new Error('Transação de Level Up falhou.');
  const event = receipt.logs
    .map((log) => {
      try {
        return tournamentControllerContract.interface.parseLog(log);
      } catch (_e) {
        return null;
      }
    })
    .find((l) => l && l.name === 'HeroLeveledUp');
  if (!event) throw new Error('Evento HeroLeveledUp não encontrado.');
  const { player, feePaid } = event.args;
  const expectedFeeInWei = ethers.parseUnits(expectedFee.toString(), 18);
  if (player.toLowerCase() !== expectedPlayer.toLowerCase())
    throw new Error('Jogador do evento de Level Up não corresponde.');
  if (feePaid !== expectedFeeInWei)
    throw new Error('Taxa do evento de Level Up não corresponde.');
  return true;
}

async function verifyUpgradeTransaction(txHash, expectedPlayer, expectedCost) {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw new Error('Transação de upgrade falhou ou não foi encontrada.');
  }

  // Find the HeroUpgradePaid event in the transaction logs
  const upgradeEvent = receipt.logs
    .map((log) => {
      try {
        // Ensure the log is from the correct contract before parsing
        if (
          log.address.toLowerCase() ===
          TOURNAMENT_CONTROLLER_ADDRESS.toLowerCase()
        ) {
          return tournamentControllerContract.interface.parseLog(log);
        }
        return null;
      } catch (_e) {
        return null; // Ignore logs that are not from the target contract
      }
    })
    .find((decodedLog) => decodedLog && decodedLog.name === 'HeroUpgradePaid');

  if (!upgradeEvent) {
    throw new Error('Evento HeroUpgradePaid não encontrado na transação.');
  }

  const { player, costPaid } = upgradeEvent.args;
  const expectedCostInWei = ethers.parseUnits(expectedCost.toString(), 18);

  // Validate the event data
  if (player.toLowerCase() !== expectedPlayer.toLowerCase()) {
    throw new Error(
      `Endereço do jogador não corresponde. Esperado: ${expectedPlayer}, Recebido: ${player}`
    );
  }
  if (costPaid !== expectedCostInWei) {
    throw new Error(
      `Custo do upgrade não corresponde. Esperado: ${expectedCostInWei}, Recebido: ${costPaid}`
    );
  }

  console.log(
    `[Oracle] Upgrade de ${expectedCost} BCOIN verificado para o jogador ${player}.`
  );
  return true;
}

async function startNewRewardCycle() {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');
  console.log(
    '[Oracle] Chamando startNewCycle no contrato PerpetualRewardPool...'
  );
  const tx = await perpetualRewardPoolContract.startNewCycle({
    gasLimit: 150000,
  });
  await tx.wait();
  console.log(
    `[Oracle] Novo ciclo de recompensas iniciado com sucesso. Tx: ${tx.hash}`
  );
  return { success: true, txHash: tx.hash };
}

async function reportSoloGames(gameCount) {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');
  // The contract function is named `reportSoloGamePlayed` but we send a batch count.
  console.log(`[Oracle] Reportando ${gameCount} jogos solo para o contrato...`);
  const tx = await perpetualRewardPoolContract.reportSoloGamePlayed(gameCount, {
    gasLimit: 100000,
  });
  await tx.wait();
  console.log(
    `[Oracle] Contagem de jogos solo reportada com sucesso. Tx: ${tx.hash}`
  );
  return { success: true, txHash: tx.hash };
}

async function signSoloRewardClaim(playerAddress, gamesPlayed) {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');

  // 1. Get the player's current nonce from the contract
  const nonce = await perpetualRewardPoolContract.userNonces(playerAddress);

  // 2. Create the message hash, ensuring it matches the contract's hashing logic
  // keccak256(abi.encodePacked(address(this), player, gamesPlayed, nonce))
  const messageHash = ethers.solidityPackedKeccak256(
    ['address', 'address', 'uint256', 'uint256'],
    [PERPETUAL_REWARD_POOL_ADDRESS, playerAddress, gamesPlayed, nonce]
  );

  // 3. Sign the hash (Ethers automatically prefixes it with "\x19Ethereum Signed Message:\n32")
  const signature = await oracleWallet.signMessage(
    ethers.getBytes(messageHash)
  );

  console.log(
    `[Oracle] Assinatura de claim gerada para ${playerAddress} para ${gamesPlayed} jogos com nonce ${nonce}.`
  );

  return { signature, nonce: Number(nonce) };
}

/**
 * Signs a hero withdrawal message, creating a signature that verifies the hero's progress.
 * @param {number} tokenId The ID of the token being withdrawn.
 * @param {number} level The hero's level.
 * @param {number} xp The hero's experience points.
 * @returns {Promise<string>} The signature.
 */
async function signHeroWithdrawal(tokenId, level, xp) {
  if (!isOracleInitialized) {
    throw new Error('O Oráculo não está inicializado.');
  }

  // 1. Get the staker's address to fetch their nonce
  const stakerAddress = await heroStakingContract.getStaker(tokenId);
  if (stakerAddress === ethers.ZeroAddress) {
    throw new Error(`Token ${tokenId} não está em stake.`);
  }

  // 2. Get the current nonce from the contract
  const nonce = await heroStakingContract.nonces(stakerAddress);

  // 3. Create the message hash, ensuring it matches the contract's hashing logic:
  // keccak256(abi.encodePacked(tokenId, level, xp, nonce))
  const messageHash = ethers.solidityPackedKeccak256(
    ['uint256', 'uint256', 'uint256', 'uint256'],
    [tokenId, level, xp, nonce]
  );

  // 4. Sign the hash. Ethers wallet's signMessage will automatically prepend
  // the "\x19Ethereum Signed Message:\n32" prefix.
  const signature = await oracleWallet.signMessage(
    ethers.getBytes(messageHash)
  );

  console.log(
    `[Oracle] Assinatura de retirada gerada para Token ID: ${tokenId} com Nível: ${level}, XP: ${xp}, Nonce: ${nonce}.`
  );

  return signature;
}

/**
 * Reports the final result of a tournament to the smart contract.
 * @param {string} tournamentId The ID of the tournament.
 * @param {string[]} winners An array of winner addresses (1st, 2nd, 3rd, etc.).
 * @returns {Promise<{success: boolean, txHash: string}>}
 */
async function reportTournamentResult(tournamentId, winners) {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');

  console.log(
    `[Oracle] Reportando resultado final para o torneio ${tournamentId}. Vencedores: ${winners.join(
      ', '
    )}`
  );
  const tx = await tournamentControllerContract.reportTournamentResult(
    tournamentId,
    winners,
    { gasLimit: 300000 }
  );
  await tx.wait();

  console.log(
    `[Oracle] Resultado final do torneio ${tournamentId} reportado com sucesso. Tx: ${tx.hash}`
  );
  return { success: true, txHash: tx.hash };
}

/**
 * Verifies a tournament creation transaction.
 * @param {string} txHash The hash of the transaction.
 * @param {string} expectedCreator The address of the player who should have created the tournament.
 * @param {number} expectedCapacity The expected capacity (4 or 8).
 * @param {number} expectedEntryFee The expected entry fee in BCOIN.
 * @returns {Promise<string>} The ID of the created tournament.
 */
async function verifyTournamentCreation(
  txHash,
  expectedCreator,
  expectedCapacity,
  expectedEntryFee
) {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw new Error(
      'Transação de criação de torneio falhou ou não foi encontrada.'
    );
  }

  const event = receipt.logs
    .map((log) => {
      try {
        return tournamentControllerContract.interface.parseLog(log);
      } catch (_e) {
        return null;
      }
    })
    .find((l) => l && l.name === 'TournamentCreated');

  if (!event) {
    throw new Error('Evento TournamentCreated não encontrado na transação.');
  }

  const { tournamentId, creator, capacity, entryFee } = event.args;
  const expectedFeeInWei = ethers.parseUnits(expectedEntryFee.toString(), 18);

  if (creator.toLowerCase() !== expectedCreator.toLowerCase()) {
    throw new Error(
      `Criador do torneio não corresponde. Esperado: ${expectedCreator}, Recebido: ${creator}`
    );
  }
  if (parseInt(capacity.toString()) !== expectedCapacity) {
    throw new Error(
      `Capacidade do torneio não corresponde. Esperado: ${expectedCapacity}, Recebido: ${capacity}`
    );
  }
  if (entryFee.toString() !== expectedFeeInWei.toString()) {
    throw new Error(
      `Taxa de entrada do torneio não corresponde. Esperado: ${expectedFeeInWei}, Recebido: ${entryFee}`
    );
  }

  console.log(
    `[Oracle] Criação do torneio ${tournamentId} verificada para o jogador ${creator}.`
  );
  return tournamentId.toString();
}

/**
 * Verifies a transaction for a player joining a tournament.
 * @param {string} txHash The hash of the transaction.
 * @param {string} expectedPlayer The address of the player who should have joined.
 * @param {string} expectedTournamentId The ID of the tournament joined.
 * @returns {Promise<boolean>} True if the verification is successful.
 */
async function verifyTournamentJoin(
  txHash,
  expectedPlayer,
  expectedTournamentId
) {
  if (!isOracleInitialized) throw new Error('O Oráculo não está inicializado.');

  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1) {
    throw new Error(
      'Transação para entrar no torneio falhou ou não foi encontrada.'
    );
  }

  const event = receipt.logs
    .map((log) => {
      try {
        return tournamentControllerContract.interface.parseLog(log);
      } catch (_e) {
        return null;
      }
    })
    .find((l) => l && l.name === 'PlayerJoinedTournament');

  if (!event) {
    throw new Error(
      'Evento PlayerJoinedTournament não encontrado na transação.'
    );
  }

  const { tournamentId, player } = event.args;

  if (player.toLowerCase() !== expectedPlayer.toLowerCase()) {
    throw new Error(
      `Jogador que entrou no torneio não corresponde. Esperado: ${expectedPlayer}, Recebido: ${player}`
    );
  }
  if (tournamentId.toString() !== expectedTournamentId) {
    throw new Error(
      `ID do torneio não corresponde. Esperado: ${expectedTournamentId}, Recebido: ${tournamentId}`
    );
  }

  console.log(
    `[Oracle] Entrada do jogador ${player} no torneio ${tournamentId} verificada.`
  );
  return true;
}

function getProvider() {
  if (!isOracleInitialized) return null;
  return provider;
}

module.exports = {
  initOracle,
  getProvider,
  getTournamentControllerContract,
  createRankedMatch,
  reportRankedMatchResult,
  reportWagerMatchResult,
  verifyPvpEntryFee,
  verifyLevelUpTransaction,
  verifyUpgradeTransaction,
  startNewRewardCycle,
  reportSoloGames,
  signSoloRewardClaim,
  signHeroWithdrawal,
  verifyTournamentCreation,
  verifyTournamentJoin,
  reportTournamentResult,
};

function getTournamentControllerContract() {
  if (!isOracleInitialized) return null;
  return tournamentControllerContract;
}
