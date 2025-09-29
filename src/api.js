const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Envia uma solicitação para entrar em uma partida de aposta na Arena de Alto Risco.
 * Esta função valida a elegibilidade no backend antes do cliente chamar o contrato.
 * @param {string} tierId - O ID do tier de aposta selecionado.
 * @param {string} token - O token JWT para autenticação.
 * @returns {Promise<object>} A resposta do servidor.
 */
export async function enterWagerMatch(tierId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/pvp/wager/enter`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ tierId })
        });
        return await response.json();
    } catch (error) {
        console.error('Falha ao entrar na partida de aposta:', error);
        throw error;
    }
}

/**
 * Salva as estatísticas do jogador no servidor.
 * @param {string} username - O nome de usuário.
 * @param {object} stats - O objeto de estatísticas do jogador.
 * @param {string} token - O token JWT para autenticação.
 * @returns {Promise<object>} A resposta do servidor.
 */
export async function savePlayerStatsToServer(username, stats, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/stats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, stats })
        });
        return await response.json();
    } catch (error) {
        console.error('Falha ao salvar estatísticas do jogador:', error);
        throw error;
    }
}