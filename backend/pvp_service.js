const db = require('./database');
const oracle = require('./oracle');
const matchmaking = require('./matchmaking');

const PVP_ENTRY_FEE = 10; // Taxa de entrada de 10 BCOIN

/**
 * Verifica se é domingo para aplicar o bônus de recompensa.
 * @returns {boolean} Verdadeiro se for domingo, falso caso contrário.
 */
function isSunday() {
  // O dia 0 corresponde a Domingo em JavaScript.
  return new Date().getDay() === 0;
}

/**
 * Calcula as recompensas para o vencedor da partida, aplicando bônus se aplicável.
 * @param {number} baseBcoin - A recompensa base em BCOIN.
 * @param {number} baseHeroXp - A recompensa base em XP de Herói.
 * @param {number} baseAccountXp - A recompensa base em XP de Conta.
 * @returns {{bcoin: number, heroXp: number, accountXp: number, bonusApplied: boolean}} As recompensas calculadas.
 */
function calculateRewards(baseBcoin, baseHeroXp, baseAccountXp) {
  const bonusApplied = isSunday();
  if (bonusApplied) {
    return {
      bcoin: Math.floor(baseBcoin * 1.1),
      heroXp: Math.floor(baseHeroXp * 1.1),
      accountXp: Math.floor(baseAccountXp * 1.1),
      bonusApplied: true,
    };
  }
  return {
    bcoin: baseBcoin,
    heroXp: baseHeroXp,
    accountXp: baseAccountXp,
    bonusApplied: false,
  };
}

/**
 * Lida com a entrada de um jogador na fila de PvP ranqueado.
 * @param {number} userId - O ID do usuário.
 * @param {number} heroId - O ID do herói selecionado.
 * @param {string} userAddress - O endereço da carteira do usuário.
 * @param {string} txHash - O hash da transação de pagamento da taxa.
 * @returns {Promise<object>} O resultado da operação.
 */
async function enterRankedQueue(userId, heroId, userAddress, txHash) {
  // 1. Verificar a transação de pagamento da taxa de entrada via Oráculo
  await oracle.verifyPvpEntryFee(txHash, userAddress, PVP_ENTRY_FEE);

  // 2. Obter o herói para determinar o tier
  const hero = await db.Hero.findByPk(heroId);
  if (!hero || hero.user_id !== userId) {
    throw new Error('Herói não encontrado ou não pertence ao usuário.');
  }

  // 3. Adicionar o jogador à fila de matchmaking com o tier do herói
  const tier = hero.level; // O tier é baseado no nível do herói
  const queueResult = await matchmaking.joinQueue(userId, heroId, tier);

  // 4. Tentar encontrar partida imediatamente (Hybrid Matchmaking)
  const immediateMatch = await matchmaking.findMatchForPlayer(userId);
  if (immediateMatch) {
    return {
      success: true,
      message: 'Partida encontrada!',
      queueId: queueResult.queueId,
      ...immediateMatch,
    };
  }

  return {
    success: true,
    message: 'Você entrou na fila ranqueada!',
    status: 'QUEUED',
    ...queueResult,
  };
}

/**
 * Processa a conclusão de uma partida ranqueada.
 * @param {number} matchId - O ID da partida.
 * @param {string} winnerAddress - O endereço da carteira do vencedor.
 * @returns {Promise<object>} O resultado da operação.
 */
async function reportRankedMatch(matchId, winnerAddress) {
  // 1. Chamar o Oráculo para reportar o resultado no smart contract
  // O Oráculo cuidará da transferência on-chain do prêmio (pote das taxas)
  const onChainResult = await oracle.reportRankedMatchResult(
    matchId,
    winnerAddress
  );

  // 2. Calcular e conceder recompensas off-chain (XP, etc.)
  const winner = await db.findUserByAddress(winnerAddress);
  if (!winner) {
    throw new Error(
      `Vencedor com endereço ${winnerAddress} não encontrado no banco de dados.`
    );
  }

  // Suponha que temos uma partida registrada no DB para obter os detalhes
  const match = await db.getPvpMatchById(matchId);
  if (!match) {
    throw new Error(`Partida com ID ${matchId} não encontrada.`);
  }

  const {
    bcoin: _bcoinReward,
    heroXp: heroXpReward,
    accountXp: accountXpReward,
    bonusApplied,
  } = calculateRewards(15, 50, 20); // Recompensas base

  await db.addXpToHero(match.winner_hero_id, heroXpReward);
  await db.addXpToUser(winner.id, accountXpReward);
  // A recompensa em BCOIN é o prêmio do pote, já tratado on-chain.
  // Poderíamos adicionar um bônus de BCOIN aqui se as regras permitissem.

  let message = `Partida finalizada! Você ganhou ${heroXpReward} XP para o herói e ${accountXpReward} XP para a conta.`;
  if (bonusApplied) {
    message += ' (Bônus de Domingo de +10% aplicado!)';
  }

  return { success: true, message, onChainResult };
}

/**
 * Handles a player's entry into the wager-based PvP queue.
 * @param {number} userId - The ID of the user.
 * @param {number} heroId - The ID of the hero selected for the wager.
 * @param {number} tierId - The ID of the selected wager tier.
 * @returns {Promise<object>} The result of the queueing operation.
 */
async function enterWagerQueue(userId, heroId, tierId) {
  // 1. Fetch tier and hero details
  const [tier, hero] = await Promise.all([
    db.getWagerTier(tierId),
    db
      .getHeroesByUserId(userId)
      .then((heroes) => heroes.find((h) => h.id === heroId)),
  ]);

  if (!tier) {
    throw new Error('Wager tier not found.');
  }
  if (!hero) {
    throw new Error('Hero not found or does not belong to the user.');
  }

  // 2. Validate that the hero has enough XP to cover the wager
  // This is a "soft" check. The actual deduction happens upon loss.
  if (hero.xp < tier.xp_cost) {
    throw new Error(
      `Hero does not have enough XP. Requires ${tier.xp_cost}, but has ${hero.xp}.`
    );
  }

  // 3. Add player to the specific wager tier queue in the matchmaking service
  // The matchmaking service will use the tierId to match players.
  const queueResult = await matchmaking.joinQueue(
    userId,
    heroId,
    `wager_${tierId}`
  );

  // 4. Try to find match immediately (Hybrid Matchmaking)
  const immediateMatch = await matchmaking.findMatchForPlayer(userId);
  if (immediateMatch) {
    return {
      success: true,
      message: `Match found for ${tier.name} wager!`,
      queueId: queueResult.queueId,
      ...immediateMatch,
    };
  }

  return {
    success: true,
    message: `Entered ${tier.name} wager queue!`,
    status: 'QUEUED',
    ...queueResult,
  };
}

/**
 * Processes the conclusion of a wager match, handling XP and on-chain rewards.
 * @param {number} matchId - The ID of the match from the WagerArena contract.
 * @param {string} winnerAddress - The wallet address of the winner.
 * @param {string} loserAddress - The wallet address of the loser.
 * @param {number} winnerHeroId - The ID of the winner's hero.
 * @param {number} loserHeroId - The ID of the loser's hero.
 * @param {number} tierId - The ID of the wager tier for this match.
 * @returns {Promise<object>} The result of the operation.
 */
async function reportWagerMatch(
  matchId,
  winnerAddress,
  loserAddress,
  winnerHeroId,
  loserHeroId,
  tierId
) {
  // 1. Get Wager Tier details to determine the XP at stake
  const tier = await db.getWagerTier(tierId);
  if (!tier) {
    throw new Error(`Wager tier ${tierId} not found.`);
  }

  // 2. Process off-chain Hero XP transfer and de-leveling via the database function
  const offChainResult = await db.processHeroWagerResult(
    winnerHeroId,
    loserHeroId,
    tier.xp_cost
  );

  // 3. Trigger the on-chain BCOIN transfer by calling the oracle
  const onChainResult = await oracle.reportWagerMatchResult(
    matchId,
    winnerAddress
  );

  return {
    success: true,
    message: 'Wager match result reported successfully.',
    offChainResult,
    onChainResult,
  };
}

/**
 * Processes the result of a match against a bot, granting appropriate rewards.
 * @param {number} userId - The ID of the winning user.
 * @param {number} heroId - The ID of the hero used in the match.
 * @param {string} tier - The tier string (e.g., "ranked", "wager_2").
 * @returns {Promise<object>} The result of the operation.
 */
async function reportBotMatch(userId, heroId, tier) {
  const [mode, tierId] = tier.split('_');

  if (mode === 'ranked') {
    // Grant standard ranked rewards for beating a bot
    const { bcoin, heroXp, accountXp } = calculateRewards(15, 50, 20); // Standard base rewards

    await db.addXpToHero(heroId, heroXp);
    await db.grantRewards(userId, bcoin, accountXp);

    return {
      success: true,
      message: `Victory against Bot! You earned ${bcoin} BCOIN, ${heroXp} Hero XP, and ${accountXp} Account XP.`,
    };
  } else if (mode === 'wager') {
    const wagerTier = await db.getWagerTier(parseInt(tierId, 10));
    if (!wagerTier) {
      throw new Error(`Wager tier ${tierId} not found for bot match report.`);
    }

    // Refund the entry fee (off-chain)
    const entryFee = wagerTier.bcoin_cost;
    await db.grantRewards(userId, entryFee, 0); // Grant BCOIN, no account XP

    // Grant a reduced, fixed amount of Hero XP (25% of wager)
    const reducedHeroXp = Math.floor(wagerTier.xp_cost * 0.25);
    await db.addXpToHero(heroId, reducedHeroXp);

    return {
      success: true,
      message: `Wager against Bot cancelled. Your ${entryFee} BCOIN entry fee has been refunded, and you earned a bonus of ${reducedHeroXp} Hero XP.`,
    };
  }

  throw new Error(`Invalid mode "${mode}" specified for bot match report.`);
}

/**
 * Submits the result of a PvP match, performing anti-exploit validation.
 * @param {string|number} matchId - The ID of the match.
 * @param {number} userId - The ID of the user submitting the result.
 * @param {number} heroId - The ID of the hero used.
 * @param {number} score - The score achieved.
 * @param {number} damageDealt - The damage dealt.
 * @param {number} durationSeconds - The duration of the match in seconds.
 * @param {number} enemiesKilled - The number of enemies killed.
 * @returns {Promise<object>} The result of the submission.
 */
async function submitMatchResult(
  matchId,
  userId,
  heroId,
  score,
  damageDealt,
  durationSeconds,
  _enemiesKilled
) {
  // 1. Fetch user and match
  const user = await db.User.findByPk(userId);
  if (!user) throw new Error('User not found');
  if (user.flagged_cheater) {
    throw new Error(
      'Account flagged for suspicious activity. Submission rejected.'
    );
  }

  const match = await db.getWagerMatch(matchId);
  if (!match) throw new Error('Match not found');

  // 2. Identify Player Role (Player 1 or Player 2)
  let isPlayer1 = false;
  let opponentAddress = '';

  if (
    match.player1_address.toLowerCase() === user.wallet_address.toLowerCase()
  ) {
    isPlayer1 = true;
    opponentAddress = match.player2_address;
  } else if (
    match.player2_address.toLowerCase() === user.wallet_address.toLowerCase()
  ) {
    isPlayer1 = false;
    opponentAddress = match.player1_address;
  } else {
    throw new Error('User is not a participant in this match');
  }

  // Check if already submitted
  if (isPlayer1 && match.player1_score !== null)
    throw new Error('Result already submitted');
  if (!isPlayer1 && match.player2_score !== null)
    throw new Error('Result already submitted');

  // 3. Anti-Exploit Validation
  const hero = await db.Hero.findByPk(heroId);
  if (!hero || hero.user_id !== userId)
    throw new Error('Hero validation failed');

  const fireRateMs = hero.fireRate || 600; // Default 600ms
  const damage = hero.damage || 10;

  // Formula: Max Damage = (Duration * 1000 / FireRate) * Damage
  // If FireRate is 0 (impossible but safe), default to 1 shot
  const shotsPerSecond = fireRateMs > 0 ? 1000 / fireRateMs : 1;
  const theoreticalMaxShots = Math.ceil(durationSeconds * shotsPerSecond);
  const theoreticalMaxDamage = theoreticalMaxShots * damage;

  // Add 20% Buffer
  const maxAllowedDamage = theoreticalMaxDamage * 1.2;

  if (damageDealt > maxAllowedDamage) {
    // Flag Cheater
    console.warn(
      `[ANTI-EXPLOIT] User ${userId} flagged. Dealt ${damageDealt}, Max Allowed ${maxAllowedDamage}`
    );
    user.flagged_cheater = true;
    await user.save();
    throw new Error(
      'Security Violation: Abnormal damage detected. Account flagged.'
    );
  }

  // 4. Update Stats & Match Record
  // Update High Score
  if (score > user.max_score) {
    user.max_score = score;
    user.last_score_timestamp = new Date();
    await user.save();
  }

  // Update Match
  if (isPlayer1) {
    match.player1_score = score;
    match.player1_hero_id = heroId;
  } else {
    match.player2_score = score;
    match.player2_hero_id = heroId;
  }
  await match.save();

  // 5. Check if Opponent has submitted (Match Completion Logic)
  const opponentScore = isPlayer1 ? match.player2_score : match.player1_score;
  const opponentHeroId = isPlayer1
    ? match.player2_hero_id
    : match.player1_hero_id;

  if (opponentScore !== null) {
    // Both players have submitted. Determine winner.
    let winnerAddress = '';
    let loserAddress = '';
    let winnerHeroId = 0;
    let loserHeroId = 0;

    // Tie-breaker: If scores are equal, P1 wins (or use time/random? let's stick to P1 priority or random)
    // For simplicity: P1 wins ties.
    if (score > opponentScore) {
      winnerAddress = user.wallet_address;
      winnerHeroId = heroId;
      loserAddress = opponentAddress;
      loserHeroId = opponentHeroId;
    } else if (opponentScore > score) {
      winnerAddress = opponentAddress;
      winnerHeroId = opponentHeroId;
      loserAddress = user.wallet_address;
      loserHeroId = heroId;
    } else {
      // Draw: Refund? Or P1 wins?
      // Let's implement P1 wins on draw for now as per "Score Attack" usually having tie-breakers.
      // Better: Refund or Split?
      // User didn't specify. I will assume standard "Higher Score Wins", tie = P1 (Host) advantage.
      winnerAddress = isPlayer1 ? user.wallet_address : opponentAddress;
      winnerHeroId = isPlayer1 ? heroId : opponentHeroId;
      loserAddress = isPlayer1 ? opponentAddress : user.wallet_address;
      loserHeroId = isPlayer1 ? opponentHeroId : heroId;
    }

    console.log(`[PvP] Match ${matchId} Complete. Winner: ${winnerAddress}`);

    // Call existing report logic
    const result = await reportWagerMatch(
      matchId,
      winnerAddress,
      loserAddress,
      winnerHeroId,
      loserHeroId,
      match.tier_id
    );

    // Update Match Status Final
    match.status = 'completed';
    match.winner_address = winnerAddress;
    await match.save();

    return {
      success: true,
      status: 'completed',
      message: 'Match complete. Results processed.',
      result: result,
    };
  } else {
    // Waiting for opponent
    return {
      success: true,
      status: 'waiting_for_opponent',
      message: 'Score submitted. Waiting for opponent result.',
    };
  }
}

module.exports = {
  isSunday,
  calculateRewards,
  enterRankedQueue,
  reportRankedMatch,
  enterWagerQueue,
  reportWagerMatch,
  reportBotMatch,
  submitMatchResult,
  PVP_ENTRY_FEE,
};
