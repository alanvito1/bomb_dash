const fs = require('fs').promises;
const path = require('path');
const db = require('./database');
const cron = require('node-cron');

const CONFIG_PATH = path.join(__dirname, 'game_config.json');
const PVP_STATUS_KEY = 'pvp_status';
const PVP_TIMESTAMP_KEY = 'pvp_last_change_timestamp';

let pvpStatus = 'closed'; // Estado padrão em memória

/**
 * Retorna o status atual do PvP.
 * @returns {string} 'open' ou 'closed'.
 */
function getPvpStatus() {
    return pvpStatus;
}

/**
 * Lógica central do ciclo de PvP, executada pelo cron job.
 */
async function checkAndTogglePvpStatus() {
    console.log('[Game State] Verificando o estado do ciclo de PvP...');
    try {
        // 1. Obter configurações e estado atual
        const configData = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(configData);
        const openHours = config.pvpCycleOpenHours || 24;
        const closedHours = config.pvpCycleClosedHours || 24;

        const currentStatus = await db.getGameSetting(PVP_STATUS_KEY) || 'closed';
        const lastChangeTimestamp = parseInt(await db.getGameSetting(PVP_TIMESTAMP_KEY) || Date.now(), 10);

        const now = Date.now();
        const hoursSinceLastChange = (now - lastChangeTimestamp) / (1000 * 60 * 60);

        let shouldToggle = false;

        // 2. Determinar se a troca de estado é necessária
        if (currentStatus === 'open' && hoursSinceLastChange >= openHours) {
            shouldToggle = true;
        } else if (currentStatus === 'closed' && hoursSinceLastChange >= closedHours) {
            shouldToggle = true;
        }

        // 3. Se necessário, alternar o estado
        if (shouldToggle) {
            const newStatus = currentStatus === 'open' ? 'closed' : 'open';
            pvpStatus = newStatus; // Atualiza o estado em memória

            // Atualiza o estado e o timestamp no banco de dados
            await db.updateGameSetting(PVP_STATUS_KEY, newStatus);
            await db.updateGameSetting(PVP_TIMESTAMP_KEY, now.toString());

            console.log(`[Game State] O status do PvP foi alterado para: ${newStatus.toUpperCase()}`);
        } else {
            console.log(`[Game State] Nenhuma mudança no status do PvP necessária. Status atual: ${currentStatus.toUpperCase()}. Horas na fase atual: ${hoursSinceLastChange.toFixed(2)}.`);
        }

    } catch (error) {
        console.error('[Game State] Erro durante a verificação do ciclo de PvP:', error);
    }
}

/**
 * Inicia o cron job para gerenciar o ciclo de PvP.
 */
async function startPvpCycleCron() {
    console.log('[Game State] Iniciando o serviço de ciclo de PvP...');

    // Inicializa o estado a partir do banco de dados ao iniciar
    const savedStatus = await db.getGameSetting(PVP_STATUS_KEY);
    if (savedStatus) {
        pvpStatus = savedStatus;
    } else {
        // Se não houver estado salvo, define um estado inicial
        await db.updateGameSetting(PVP_STATUS_KEY, 'closed');
        await db.updateGameSetting(PVP_TIMESTAMP_KEY, Date.now().toString());
        pvpStatus = 'closed';
    }

    console.log(`[Game State] Status inicial do PvP carregado: ${pvpStatus.toUpperCase()}`);

    // Roda a verificação a cada hora. A lógica interna decide se a troca é necessária.
    cron.schedule('0 * * * *', checkAndTogglePvpStatus);

    console.log('[Game State] Cron job do ciclo de PvP agendado para rodar a cada hora.');

    // Roda uma verificação inicial para garantir que o estado esteja correto no momento do boot.
    await checkAndTogglePvpStatus();
}

module.exports = {
    startPvpCycleCron,
    getPvpStatus
};