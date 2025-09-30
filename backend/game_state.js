const fs = require('fs').promises;
const path = require('path');
const db = require('./database');
const cron = require('node-cron');

const CONFIG_PATH = path.join(__dirname, 'game_config.json');

let pvpStatus = 'closed'; // Default state

/**
 * Retorna o status atual do PvP.
 * @returns {string} 'open' ou 'closed'.
 */
function getPvpStatus() {
    return pvpStatus;
}

/**
 * Alterna o estado do PvP entre 'open' e 'closed'.
 */
async function togglePvpStatus() {
    pvpStatus = (pvpStatus === 'open' ? 'closed' : 'open');
    console.log(`[Game State] O status do PvP foi alterado para: ${pvpStatus.toUpperCase()}`);

    // Opcional: Persistir o estado atual no banco de dados para resiliência
    await db.updateGameSetting('pvp_status', pvpStatus);
}

/**
 * Inicia o cron job para gerenciar o ciclo de PvP.
 */
async function startPvpCycleCron() {
    console.log('[Game State] Iniciando o cron job para o ciclo de PvP...');

    try {
        const configData = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(configData);

        const openHours = config.pvpCycleOpenHours || 24;
        const closedHours = config.pvpCycleClosedHours || 24;

        // Para simplificar, vamos alternar a cada X horas, começando do estado atual.
        // Uma implementação mais robusta usaria um padrão de cron mais complexo.
        // Exemplo: a cada 12 horas, o estado é alternado.
        // Nota: Esta é uma simplificação. Um ciclo de 24h aberto/24h fechado é mais complexo.
        // Vamos usar um cron que roda a cada X horas para alternar.
        cron.schedule(`0 */${openHours} * * *`, () => {
             if (pvpStatus === 'closed') {
                togglePvpStatus();
             }
        });

        cron.schedule(`0 */${closedHours} * * *`, () => {
            if (pvpStatus === 'open') {
               togglePvpStatus();
            }
       });

        // Inicializa o estado a partir do banco de dados, se disponível
        const savedStatus = await db.getGameSetting('pvp_status');
        if (savedStatus && (savedStatus === 'open' || savedStatus === 'closed')) {
            pvpStatus = savedStatus;
        }

        console.log(`[Game State] Cron job do ciclo de PvP configurado. Duração Aberto: ${openHours}h, Fechado: ${closedHours}h.`);
        console.log(`[Game State] Status inicial do PvP: ${pvpStatus.toUpperCase()}`);

    } catch (error) {
        console.error('[Game State] Erro ao configurar o cron job do ciclo de PvP:', error);
    }
}

module.exports = {
    startPvpCycleCron,
    getPvpStatus
};