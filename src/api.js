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

// --- Funções para Stats do Jogador (Requer Backend Implementado) ---

/**
 * Salva as estatísticas completas do jogador no servidor.
 * @param {string} username - Identificador do usuário (pode ser omitido se o backend usa o token para identificar).
 * @param {object} stats - O objeto completo de estatísticas do jogador.
 * @param {string} token - JWT token para autenticação.
 * @returns {Promise<object>} - Resposta do servidor.
 */
export async function savePlayerStatsToServer(username, stats, token) {
  if (!token) {
    console.warn('[API] savePlayerStatsToServer: Token não fornecido.');
    return { success: false, message: 'Token não fornecido.' };
  }
  // O username pode não ser necessário no path/body se o backend identificar o usuário pelo token.
  // Ajuste o endpoint e o corpo conforme a definição do seu backend.
  console.log(`[API] Salvando stats para usuário ${username || 'identificado por token'}...`, stats);
  try {
    const response = await fetch(`${API_BASE_URL}/user/stats`, { // Assumindo endpoint /user/stats
      method: 'PUT', // Ou POST, dependendo da sua API (PUT é comum para update/replace)
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(stats),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro ao salvar estatísticas.' }));
      console.error('[API] savePlayerStatsToServer falhou:', response.status, errorData);
      return { success: false, message: errorData.message || `Erro ${response.status} ao salvar stats.` };
    }
    const responseData = await response.json();
    console.log('[API] savePlayerStatsToServer sucesso:', responseData);
    return { success: true, data: responseData };
  } catch (error) {
    console.error('[API] savePlayerStatsToServer erro de rede/conexão:', error);
    return { success: false, message: error.message || 'Erro de rede ao salvar estatísticas.' };
  }
}

/**
 * Carrega as estatísticas completas do jogador do servidor.
 * @param {string} username - Identificador do usuário (pode ser omitido se o backend usa o token para identificar).
 * @param {string} token - JWT token para autenticação.
 * @returns {Promise<object>} - Resposta contendo as estatísticas ou erro.
 */
export async function getPlayerStatsFromServer(username, token) {
  if (!token) {
    console.warn('[API] getPlayerStatsFromServer: Token não fornecido.');
    return { success: false, message: 'Token não fornecido.' };
  }
  // O username pode não ser necessário no path se o backend identificar o usuário pelo token.
  console.log(`[API GETSTATS] Called for username: ${username}. Token: ${token ? 'present' : 'MISSING!'}`);
  try {
    const response = await fetch(`${API_BASE_URL}/user/stats`, { // Assumindo endpoint /user/stats
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    console.log(`[API GETSTATS] Response status for ${username}: ${response.status}`);
    const responseText = await response.text();
    console.log(`[API GETSTATS] Raw response text for ${username}:`, responseText);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[API GETSTATS] User ${username} not found on server or no stats (404). Returning null stats.`);
        return { success: true, stats: null };
      }
      // Attempt to parse errorData even from responseText if response.json() might fail
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { message: responseText || 'Erro ao carregar estatísticas (resposta não-JSON).' };
      }
      console.error(`[API GETSTATS] Fetch failed for ${username}:`, response.status, errorData);
      return { success: false, message: errorData.message || `Erro ${response.status} ao carregar stats.` };
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error(`[API GETSTATS] Failed to parse JSON response for ${username}:`, responseText, e);
      return { success: false, message: 'Resposta do servidor em formato JSON inválido.' };
    }

    console.log(`[API GETSTATS] Parsed responseData for ${username}:`, responseData);

    const finalStats = responseData.stats || responseData;
    console.log(`[API GETSTATS] Final stats object being returned for ${username}:`, JSON.stringify(finalStats));
    return { success: true, stats: finalStats };
  } catch (error) {
    console.error(`[API GETSTATS] Network/connection error for ${username}:`, error);
    return { success: false, message: error.message || 'Erro de rede ao carregar estatísticas.' };
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
