// src/api.js
const BASE_URL = 'http://localhost:3000/api'; // URL base do seu backend

// Função para lidar com respostas da API
async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        // Se o servidor retornar um erro (status code não 2xx),
        // lança um erro com a mensagem do servidor, se disponível, ou uma mensagem padrão.
        const error = (data && data.message) || response.statusText || `Request failed with status ${response.status}`;
        console.error('API Error:', error, 'Full response data:', data);
        throw new Error(error);
    }
    return data; // Retorna os dados JSON se a resposta for bem-sucedida
}

// Registrar um novo usuário
async function registerUser(username, pin) {
    try {
        const response = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, pin }),
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Error in registerUser:', error.message);
        // Retorna um objeto de erro padronizado para o chamador lidar
        return { success: false, message: error.message || 'Network error or server is unreachable during registration.' };
    }
}

// Logar um usuário existente
async function loginUser(username, pin) {
    try {
        const response = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, pin }),
        });
        // handleResponse irá lançar um erro se !response.ok
        const data = await handleResponse(response);
        // Se o login for bem-sucedido, o backend deve retornar { success: true, token: '...', user: {...} }
        if (data.success && data.token) {
            // Opcional: armazenar o token no localStorage aqui ou deixar a cena fazer isso.
            // localStorage.setItem('jwtToken', data.token);
            return data; // Retorna { success: true, token: '...', user: { username, max_score } }
        } else {
            // Caso o backend retorne success: false mas com status 200 (pouco provável para login)
            throw new Error(data.message || 'Login failed, token not received.');
        }
    } catch (error) {
        console.error('Error in loginUser:', error.message);
        return { success: false, message: error.message || 'Network error or server is unreachable during login.' };
    }
}

// --- Funções para Stats do Jogador (Simuladas por enquanto) ---

let pseudoServerStorage = {}; // In-memory storage to simulate backend persistence per user

/**
 * Simula o salvamento das estatísticas completas do jogador no servidor.
 * @param {string} username - Identificador do usuário.
 * @param {object} stats - O objeto completo de estatísticas do jogador.
 * @param {string} token - JWT token para autenticação (usado para validar a chamada).
 * @returns {Promise<object>} - Resposta simulada do servidor.
 */
export async function savePlayerStatsToServer(username, stats, token) {
  if (!token) {
    console.warn('[API] savePlayerStatsToServer: Token não fornecido.');
    return { success: false, message: 'Token não fornecido.' };
  }
  if (!username) {
    console.warn('[API] savePlayerStatsToServer: Username não fornecido.');
    return { success: false, message: 'Username não fornecido para salvar stats.' };
  }

  console.log(`[API] Simulando savePlayerStatsToServer para usuário ${username}...`, { stats });
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay de rede

  pseudoServerStorage[username] = JSON.parse(JSON.stringify(stats)); // Store a deep copy

  console.log(`[API] savePlayerStatsToServer: Stats para ${username} salvos no pseudoServerStorage (simulado).`);
  return { success: true, message: `Estatísticas para ${username} salvas no servidor (simulado).` };
}

/**
 * Simula o carregamento das estatísticas completas do jogador do servidor.
 * @param {string} username - Identificador do usuário.
 * @param {string} token - JWT token para autenticação.
 * @returns {Promise<object>} - Resposta simulada contendo as estatísticas ou erro.
 */
export async function getPlayerStatsFromServer(username, token) {
  if (!token) {
    console.warn('[API] getPlayerStatsFromServer: Token não fornecido.');
    return { success: false, message: 'Token não fornecido.' };
  }
   if (!username) {
    console.warn('[API] getPlayerStatsFromServer: Username não fornecido.');
    return { success: false, message: 'Username não fornecido para carregar stats.' };
  }

  console.log(`[API] Simulando getPlayerStatsFromServer para usuário ${username}...`);
  await new Promise(resolve => setTimeout(resolve, 300)); // Simular delay de rede

  const userStats = pseudoServerStorage[username];

  if (userStats) {
    console.log(`[API] getPlayerStatsFromServer: Stats encontrados para ${username} no pseudoServerStorage.`, userStats);
    return { success: true, stats: JSON.parse(JSON.stringify(userStats)) }; // Return a deep copy
  } else {
    console.log(`[API] getPlayerStatsFromServer: Nenhum stats encontrado para ${username} no pseudoServerStorage.`);
    return { success: true, stats: null }; // Simula que não há stats salvos para este usuário ainda.
  }
}

// Submeter uma pontuação
async function submitScore(score, token) {
    if (!token) {
        console.error('submitScore: JWT Token is missing.');
        return { success: false, message: 'Authentication token is missing. Cannot submit score.' };
    }
    try {
        const response = await fetch(`${BASE_URL}/scores`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Inclui o token JWT no header
            },
            body: JSON.stringify({ score }),
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Error in submitScore:', error.message);
        return { success: false, message: error.message || 'Network error or server is unreachable when submitting score.' };
    }
}

// Obter o ranking (top 10)
async function getRanking() {
    try {
        const response = await fetch(`${BASE_URL}/ranking`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        const data = await handleResponse(response);
        // Espera-se que o backend retorne { success: true, ranking: [...] }
        if (data.success && Array.isArray(data.ranking)) {
            return data.ranking;
        } else {
            throw new Error(data.message || 'Failed to fetch ranking or ranking data is malformed.');
        }
    } catch (error) {
        console.error('Error in getRanking:', error.message);
        // Para getRanking, pode ser melhor retornar um array vazio em caso de erro,
        // para que a interface do usuário não quebre.
        return [];
    }
}

// Validar a sessão atual usando o token JWT
async function validateCurrentSession(token) {
    if (!token) {
        console.log('validateCurrentSession: No token provided.');
        return { success: false, message: 'No token provided for session validation.' };
    }
    try {
        const response = await fetch(`${BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });
        // handleResponse irá lançar um erro se !response.ok (ex: token inválido -> 403)
        const data = await handleResponse(response);
        // Espera-se que o backend retorne { success: true, user: { username, max_score } }
        if (data.success && data.user) {
            return { success: true, user: data.user };
        } else {
            // Caso o backend retorne success: false mas com status 200 (pouco provável para este endpoint)
            throw new Error(data.message || 'Session validation failed, user data not received.');
        }
    } catch (error) {
        console.error('Error in validateCurrentSession:', error.message);
        // Se handleResponse lançou erro (ex: por status 401, 403, 404), a mensagem já estará em error.message
        // Retorna um objeto de erro padronizado
        return { success: false, message: error.message || 'Network error or server is unreachable during session validation.' };
    }
}

export {
    registerUser,
    loginUser,
    submitScore,
    getRanking,
    validateCurrentSession,
    BASE_URL // Exportar BASE_URL pode ser útil para debug ou configuração
};
