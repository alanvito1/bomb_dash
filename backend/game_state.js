const db = require('./database');

const PVP_STATUS_KEY = 'pvp_status';

// O estado do PvP agora é fixo como 'open', conforme os novos requisitos.
const pvpStatus = 'open';

/**
 * Retorna o status atual do PvP.
 * @returns {string} Sempre 'open'.
 */
function getPvpStatus() {
  return pvpStatus;
}

/**
 * Inicia o serviço de ciclo de PvP.
 * Nos novos requisitos, o PvP está sempre aberto, então esta função apenas garante
 * que o estado no banco de dados (se ainda for usado) esteja como 'open'
 * e não inicia nenhum cron job.
 */
async function startPvpCycleCron() {
  console.log('[Game State] Inicializando o serviço de estado do PvP...');
  try {
    await db.updateGameSetting(PVP_STATUS_KEY, 'open');
    console.log(
      `[Game State] O status do PvP está permanentemente definido como: ${pvpStatus.toUpperCase()}`
    );
  } catch (error) {
    console.error(
      '[Game State] Falha ao definir o estado inicial do PvP no banco de dados:',
      error
    );
  }
  // O cron job foi removido para manter o PvP sempre aberto.
}

module.exports = {
  startPvpCycleCron,
  getPvpStatus,
};
