const axios = require('axios');
const { ethers } = require('ethers');
const { SiweMessage } = require('siwe');

// --- Configuração do Teste ---
const API_URL = 'http://localhost:3000'; // URL do nosso servidor backend

// Chaves privadas de teste (NUNCA use em produção)
// Estas são as chaves padrão do Hardhat
const PLAYER1_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const PLAYER2_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545"); // Conexão com o nó Hardhat local
const player1Wallet = new ethers.Wallet(PLAYER1_PK, provider);
const player2Wallet = new ethers.Wallet(PLAYER2_PK, provider);

// --- Funções de Ajuda ---

/**
 * Simula o processo de login de um jogador via SIWE.
 * @param {ethers.Wallet} wallet - A carteira do jogador a ser logado.
 * @returns {Promise<string>} O token JWT.
 */
async function loginPlayer(wallet) {
    console.log(`\n--- Logando jogador: ${wallet.address} ---`);

    // 1. Obter nonce do servidor
    const nonceRes = await axios.get(`${API_URL}/api/auth/nonce`);
    const nonce = nonceRes.data.nonce;
    console.log(`Nonce obtido: ${nonce}`);

    // 2. Criar mensagem SIWE
    const message = new SiweMessage({
        domain: 'localhost',
        address: wallet.address,
        statement: 'Faça login no Bomb Dash para provar que você é o dono desta carteira.',
        uri: `${API_URL}/login`,
        version: '1',
        chainId: 31337, // chainId do Hardhat
        nonce: nonce,
    });
    const messageToSign = message.prepareMessage();

    // 3. Assinar a mensagem
    const signature = await wallet.signMessage(messageToSign);
    console.log("Mensagem assinada com sucesso.");

    // 4. Verificar com o servidor e obter JWT
    const verifyRes = await axios.post(`${API_URL}/api/auth/verify`, {
        message: messageToSign,
        signature: signature,
    });
    const token = verifyRes.data.token;
    console.log("Verificação bem-sucedida. JWT recebido.");

    return token;
}


/**
 * A função principal que executa o teste de sanidade.
 */
async function runSanityCheck() {
    console.log("--- INICIANDO TESTE DE SANIDADE DO FLUXO 1V1 ---");
    try {
        // Etapa 1: Login de ambos os jogadores para obter tokens JWT.
        const tokenPlayer1 = await loginPlayer(player1Wallet);
        const tokenPlayer2 = await loginPlayer(player2Wallet);

        // Etapa 2: Simular o deploy e a distribuição de BCOINs de teste.
        // (Isso será feito via script Hardhat, mas aqui vamos assumir que já têm saldo)
        console.log("\n--- Etapa 2: Simulação de Saldo de BCOIN ---");
        console.log("Assumindo que os jogadores já receberam BCOINs de teste.");

        // Etapa 3: Jogador 1 entra na fila 1v1.
        console.log("\n--- Etapa 3: Jogador 1 entra na fila ---");
        // TODO: Fazer a chamada de API para /api/matchmaking/join (ou similar)
        // O jogador precisará aprovar o gasto de BCOIN e o contrato irá transferir.

        // Etapa 4: Jogador 2 entra na fila 1v1, criando uma partida.
        console.log("\n--- Etapa 4: Jogador 2 entra na fila e cria a partida ---");
        // TODO: Fazer a chamada de API para o Jogador 2.
        // O backend deve detectar a criação da partida e logar o matchId.

        // Etapa 5: Simular o fim da partida e o Oráculo reportar o resultado.
        console.log("\n--- Etapa 5: Oráculo reporta o vencedor ---");
        // TODO: Fazer a chamada de API para o endpoint de administração que aciona o oráculo.
        // Ex: POST /api/admin/report-match com matchId e o endereço do vencedor.

        // Etapa 6: Verificar os saldos finais.
        console.log("\n--- Etapa 6: Verificação dos resultados ---");
        // TODO: Ler o saldo de BCOIN do vencedor, do perdedor, da teamWallet e da pool de recompensas
        // para garantir que a distribuição de taxas e prêmios foi correta.

        console.log("\n\n--- TESTE DE SANIDADE CONCLUÍDO COM SUCESSO (ESTRUTURA) ---");

    } catch (error) {
        console.error("\n\n--- O TESTE DE SANIDADE FALHOU ---");
        if (error.response) {
            console.error("Erro na API:", error.response.status, error.response.data);
        } else {
            console.error("Erro geral:", error.message);
        }
    }
}

runSanityCheck();