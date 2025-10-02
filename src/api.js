import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Classe de cliente de API para centralizar a lógica de fetch e autenticação.
 */
class ApiClient {
    constructor() {
        this.jwtToken = localStorage.getItem('jwtToken');
    }

    /**
     * Define o token JWT e o armazena no localStorage.
     * @param {string} token - O token JWT.
     */
    setJwtToken(token) {
        this.jwtToken = token;
        if (token) {
            localStorage.setItem('jwtToken', token);
        } else {
            localStorage.removeItem('jwtToken');
        }
    }

    /**
     * Realiza uma requisição fetch, adicionando o token de autenticação se necessário.
     * @param {string} endpoint - O endpoint da API (ex: '/auth/me').
     * @param {object} options - As opções da requisição fetch.
     * @param {boolean} requiresAuth - Se a requisição requer o token JWT.
     * @returns {Promise<any>} A resposta da API em JSON.
     */
    async fetch(endpoint, options = {}, requiresAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (requiresAuth && this.jwtToken) {
            headers['Authorization'] = `Bearer ${this.jwtToken}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'API request failed');
        }

        // Handle cases with no content
        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    // --- Métodos de Autenticação ---

    async web3Login() {
        if (!window.ethereum) {
            throw new Error('MetaMask not detected. Please install the extension.');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        // 1. Fetch nonce from the backend (public call)
        const { nonce } = await this.fetch('/auth/nonce', {}, false);
        if (!nonce) {
            throw new Error('Failed to retrieve nonce from the server.');
        }

        // 2. Create SIWE message on the client side
        const message = new SiweMessage({
            domain: window.location.host,
            address,
            statement: 'Sign in with Ethereum to Bomb Dash.',
            uri: window.location.origin,
            version: '1',
            chainId: await provider.getNetwork().then(network => network.chainId),
            nonce: nonce,
        });

        const signature = await signer.signMessage(message.prepareMessage());

        // 3. Send message and signature to the backend for verification (public call)
        const verifyData = await this.fetch('/auth/verify', {
            method: 'POST',
            body: JSON.stringify({ message, signature }, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ),
        }, false);

        if (verifyData.success && verifyData.token) {
            this.setJwtToken(verifyData.token);
            console.log('Login successful, JWT token stored.');
            return verifyData;
        } else {
            throw new Error(verifyData.message || 'Signature verification failed.');
        }
    }

    /**
     * Verifica o status do token atual com o backend. Lança um erro se o token for inválido.
     * @returns {Promise<object>} A resposta do servidor com os dados do usuário se o token for válido.
     */
    async checkLoginStatus() {
        if (!this.jwtToken) {
            throw new Error('No token found in storage.');
        }
        try {
            // Este endpoint (/api/auth/me) valida o token e retorna os dados do usuário.
            // O wrapper `fetch` já lançará um erro para respostas não-OK (ex: 401, 403, 500).
            const data = await this.fetch('/auth/me');
            if (!data.success) {
                // Caso o servidor retorne 200 OK mas com success: false
                throw new Error(data.message || 'Token validation failed on server.');
            }
            return data;
        } catch (error) {
            console.error('Session check failed:', error.message);
            this.setJwtToken(null); // Limpa o token inválido antes de relançar o erro
            throw error; // Relança o erro para que o chamador possa lidar com ele (ex: redirecionar para o login)
        }
    }

    logout() {
        this.setJwtToken(null);
        // Opcional: notificar o backend sobre o logout
    }

    // --- Métodos da API do Jogo ---

    async enterWagerMatch(tierId) {
        return this.fetch('/pvp/wager/enter', {
            method: 'POST',
            body: JSON.stringify({ tierId }),
        });
    }

    async getRanking() {
        const data = await this.fetch('/ranking');
        return data.success ? data.ranking : [];
    }

    async saveCheckpoint(waveNumber) {
        return this.fetch('/game/checkpoint', {
            method: 'POST',
            body: JSON.stringify({ waveNumber }),
        });
    }

    async getCurrentUser() {
        return this.fetch('/auth/me');
    }

    async getOwnedNfts() {
        return this.fetch('/user/nfts');
    }

    async levelUp() {
        return this.fetch('/user/level-up', {
            method: 'POST'
        });
    }

    // --- Métodos de Admin ---

    async getGameSettings(adminSecret) {
         return this.fetch('/admin/settings', {
            headers: { 'X-Admin-Secret': adminSecret }
        });
    }

    // --- Métodos de Status do Jogo ---

    /**
     * Busca o status atual do PvP e o tempo para a próxima mudança.
     * @returns {Promise<object>} Ex: { pvpEnabled: true, nextChangeIn: 3600 }
     */
    async getPvpStatus() {
        // Este endpoint não deve exigir autenticação para que todos possam ver o status
        return this.fetch('/game/pvp-status', {}, false);
    }

    /**
     * Busca a lista de buffs globais ativos.
     * @returns {Promise<Array<object>>} Ex: [{ id: 'sunday_bonus', name: 'XP em Dobro', duration: 86400 }]
     */
    async getGlobalBuffs() {
        // Este endpoint também deve ser público
        return this.fetch('/game/global-buffs', {}, false);
    }

    async savePlayerStats(stats) {
        return this.fetch('/user/stats', {
            method: 'POST',
            body: JSON.stringify({ stats }),
        });
    }
}

// Exporta uma instância única do cliente
const api = new ApiClient();
export default api;