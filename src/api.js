import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const API_BASE_URL = 'http://localhost:3000/api';

export async function web3Login() {
    if (!window.ethereum) {
        throw new Error('MetaMask not detected. Please install the extension.');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // 1. Get nonce from backend
    const nonceRes = await fetch(`${API_BASE_URL}/auth/nonce`);
    const { nonce } = await nonceRes.json();
    if (!nonce) {
        throw new Error('Failed to retrieve nonce from server.');
    }

    // 2. Create SIWE message
    const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to Bomb Dash.',
        uri: window.location.origin,
        version: '1',
        chainId: await provider.getNetwork().then(network => network.chainId),
        nonce: nonce,
    });

    // 3. Sign the message
    const signature = await signer.signMessage(message.prepareMessage());

    // 4. Verify signature with backend
    const verifyRes = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
        throw new Error(verifyData.message || 'Signature verification failed.');
    }

    // 5. Store JWT token
    localStorage.setItem('jwtToken', verifyData.token);
    console.log('Login successful, JWT token stored.');
    return true;
}

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

export async function getRanking() {
    try {
        const response = await fetch(`${API_BASE_URL}/ranking`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const data = await response.json();
        if (data.success) {
            return data.ranking;
        } else {
            console.error('Failed to fetch ranking:', data.message);
            return [];
        }
    } catch (error) {
        console.error('Error fetching ranking:', error);
        return [];
    }
}

/**
 * Salva as estatísticas do jogador no servidor.
 * @param {string} username - O nome de usuário.
 * @param {object} stats - O objeto de estatísticas do jogador.
 * @param {string} token - O token JWT para autenticação.
 * @returns {Promise<object>} A resposta do servidor.
 */
export async function saveCheckpoint(waveNumber, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/game/checkpoint`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ waveNumber })
        });
        return await response.json();
    } catch (error) {
        console.error('Falha ao salvar checkpoint:', error);
        throw error;
    }
}

export async function getCurrentUser(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error('Falha ao buscar usuário atual:', error);
        throw error;
    }
}

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