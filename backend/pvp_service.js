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
    const hero = await db.getHeroById(heroId);
    if (!hero || hero.user_id !== userId) {
        throw new Error("Herói não encontrado ou não pertence ao usuário.");
    }

    // 3. Adicionar o jogador à fila de matchmaking com o tier do herói
    const tier = hero.level; // O tier é baseado no nível do herói
    const queueResult = await matchmaking.joinQueue(userId, heroId, tier);

    return { success: true, message: "Você entrou na fila ranqueada!", ...queueResult };
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
    const onChainResult = await oracle.reportRankedMatchResult(matchId, winnerAddress);

    // 2. Calcular e conceder recompensas off-chain (XP, etc.)
    const winner = await db.findUserByAddress(winnerAddress);
    if (!winner) {
        throw new Error(`Vencedor com endereço ${winnerAddress} não encontrado no banco de dados.`);
    }

    // Suponha que temos uma partida registrada no DB para obter os detalhes
    const match = await db.getPvpMatchById(matchId);
    if (!match) {
        throw new Error(`Partida com ID ${matchId} não encontrada.`);
    }

    const {
        bcoin: bcoinReward,
        heroXp: heroXpReward,
        accountXp: accountXpReward,
        bonusApplied
    } = calculateRewards(15, 50, 20); // Recompensas base

    await db.addXpToHero(match.winner_hero_id, heroXpReward);
    await db.addXpToUser(winner.id, accountXpReward);
    // A recompensa em BCOIN é o prêmio do pote, já tratado on-chain.
    // Poderíamos adicionar um bônus de BCOIN aqui se as regras permitissem.

    let message = `Partida finalizada! Você ganhou ${heroXpReward} XP para o herói e ${accountXpReward} XP para a conta.`;
    if (bonusApplied) {
        message += " (Bônus de Domingo de +10% aplicado!)";
    }

    return { success: true, message, onChainResult };
}

module.exports = {
    isSunday,
    calculateRewards,
    enterRankedQueue,
    reportRankedMatch,
    PVP_ENTRY_FEE,
};