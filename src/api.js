import { SiweMessage } from 'siwe';
import * as contracts from './config/contracts.js';
import web3Modal from './web3/web3modal-client.js'; // Import the new Web3Modal client

const { address: TOURNAMENT_CONTROLLER_ADDRESS, abi: TOURNAMENT_CONTROLLER_ABI } = contracts.default.tournamentController;

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
        return new Promise(async (resolve, reject) => {
            const { ethers } = await import('ethers');
            let isConnected = false;

            const unsubscribeProvider = web3Modal.subscribeProvider(async (state) => {
                if (state.isConnected && !isConnected) {
                    isConnected = true; // Prevent re-entry
                    unsubscribeAll(); // Clean up listeners immediately

                    try {
                        const provider = web3Modal.getWalletProvider();
                        if (!provider) throw new Error("Wallet provider not found after connection.");

                        const ethersProvider = new ethers.BrowserProvider(provider);
                        const signer = await ethersProvider.getSigner();
                        const address = await signer.getAddress();
                        const chainId = web3Modal.getChainId();

                        const { nonce } = await this.fetch('/auth/nonce', {}, false);
                        if (!nonce || typeof nonce !== 'string' || nonce.length < 8) {
                            throw new Error(`Invalid nonce from server: ${nonce}`);
                        }

                        const siweMessage = new SiweMessage({
                            domain: window.location.host,
                            address,
                            statement: 'Sign in to Bomb Dash Web3 to continue.',
                            uri: window.location.origin,
                            version: '1',
                            chainId: Number(chainId),
                            nonce: nonce,
                            issuedAt: new Date().toISOString(),
                        });
                        const messageToSign = siweMessage.prepareMessage();
                        const signature = await signer.signMessage(messageToSign);

                        const verifyData = await this.fetch('/auth/verify', {
                            method: 'POST',
                            body: JSON.stringify({ message: siweMessage, signature }),
                        }, false);

                        if (verifyData.success && verifyData.token) {
                            this.setJwtToken(verifyData.token);
                            console.log('SIWE Login successful!');
                            resolve(verifyData);
                        } else {
                            throw new Error(verifyData.message || 'SIWE server-side verification failed.');
                        }
                    } catch (err) {
                        reject(err);
                    } finally {
                        await web3Modal.close();
                    }
                }
            });

            const unsubscribeState = web3Modal.subscribeState(async (state) => {
                if (!state.open && !isConnected) {
                    // Modal was closed by the user without connecting
                    unsubscribeAll();
                    reject(new Error('User closed the wallet selection modal.'));
                }
            });

            const unsubscribeAll = () => {
                unsubscribeProvider();
                unsubscribeState();
            };

            // Open the modal to start the process
            await web3Modal.open();
        });
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

    async getHeroes() {
        return this.fetch('/heroes');
    }

    async purchaseHeroUpgrade(heroId, upgradeType, cost) {
        console.warn("`purchaseHeroUpgrade` is deprecated and will be removed. Use `updateUserStats` instead.");
        return this.fetch(`/heroes/${heroId}/purchase-upgrade`, {
            method: 'POST',
            body: JSON.stringify({ upgradeType, cost }),
        });
    }

    /**
     * Notifies the backend to verify an on-chain upgrade transaction and update hero stats.
     * @param {number|string} heroId - The ID of the hero that was upgraded.
     * @param {string} upgradeType - The type of stat that was upgraded (e.g., 'damage').
     * @param {string} txHash - The transaction hash of the on-chain payment.
     * @returns {Promise<any>} The response from the backend.
     */
    async updateUserStats(heroId, upgradeType, txHash) {
        const body = {
            heroId: parseInt(heroId, 10),
            upgradeType,
            txHash
        };
        return this.fetch('/user/stats', 'POST', { body: JSON.stringify(body) }, true);
    }

    async levelUpHero(heroId) {
        if (!window.ethereum) throw new Error('MetaMask not detected.');

        try {
            const { ethers } = await import('ethers');
            // 1. Connect to the wallet and get the signer
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const playerAddress = await signer.getAddress();

            // 2. Create a contract instance
            const contract = new ethers.Contract(TOURNAMENT_CONTROLLER_ADDRESS, TOURNAMENT_CONTROLLER_ABI, signer);

            // 3. Call the smart contract function to pay the fee.
            // The contract itself handles the BCOIN transfer logic (approve/transferFrom).
            // This function call will prompt the user in MetaMask.
            console.log(`Sending level up transaction for hero ${heroId}...`);
            const tx = await contract.payLevelUpFee(playerAddress, {
                 // Setting a manual gas limit can help prevent "out of gas" errors.
                 // This value might need adjustment based on network conditions.
                gasLimit: 300000
            });

            // 4. Wait for the transaction to be mined
            console.log(`Transaction sent! Waiting for confirmation... Hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log('Transaction confirmed!', receipt);

            if (receipt.status !== 1) {
                throw new Error("The on-chain transaction failed.");
            }

            // 5. Send the transaction hash to the backend for verification
            return this.fetch(`/heroes/${heroId}/level-up`, {
                method: 'POST',
                body: JSON.stringify({ txHash: tx.hash }),
            });

        } catch (error) {
            console.error('Hero level-up process failed:', error);
            // Re-throw the error with a user-friendly message
            throw new Error(error.reason || error.message || 'An unknown error occurred during the level-up process.');
        }
    }

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

    // --- Matchmaking Methods ---

    async joinMatchmakingQueue(heroId) {
        return this.fetch('/matchmaking/join', {
            method: 'POST',
            body: JSON.stringify({ heroId }),
        });
    }

    async leaveMatchmakingQueue() {
        return this.fetch('/matchmaking/leave', {
            method: 'POST',
        });
    }

    async getMatchmakingStatus() {
        return this.fetch('/matchmaking/status');
    }

    /**
     * Notifies the backend that a solo match has been completed, reporting score for XP.
     * @param {number} heroId The ID of the hero used in the match.
     * @param {number} xpGained The amount of XP (score) gained.
     * @returns {Promise<any>} The response from the backend.
     */
    async completeMatch(heroId, xpGained) {
        return this.fetch('/matches/complete', {
            method: 'POST',
            body: JSON.stringify({ heroId, xpGained }),
        });
    }

    // --- Solo Reward Methods ---

    /**
     * Notifies the backend that a solo game has been completed by the user.
     * @returns {Promise<any>} The response from the backend.
     */
    async logSoloGameCompleted() {
        return this.fetch('/solo/game-completed', {
            method: 'POST'
        });
    }

    /**
     * Requests a signature from the backend to claim accumulated solo rewards.
     * @returns {Promise<{signature: string, gamesPlayed: number, nonce: number}>} The signature and associated data.
     */
    async getSoloRewardClaimSignature() {
        return this.fetch('/solo/claim-reward', {
            method: 'POST'
        });
    }

    // --- Hero Staking Methods ---

    /**
     * Requests a signature from the backend to authorize a hero withdrawal.
     * @param {number|string} heroId - The ID of the hero to withdraw.
     * @returns {Promise<{success: boolean, tokenId: number, level: number, xp: number, signature: string}>} The signature and hero progress data.
     */
    async initiateHeroWithdrawal(heroId) {
        return this.fetch(`/heroes/${heroId}/initiate-withdrawal`, {
            method: 'POST'
        });
    }
}

// Exporta uma instância única do cliente
const api = new ApiClient();
export default api;