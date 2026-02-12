const axios = require('axios');
const { ethers } = require('ethers');
const { SiweMessage } = require('siwe');

// --- Configuração do Teste ---
const API_URL = 'http://localhost:3000'; // URL do nosso servidor backend

// Chaves privadas de teste (NUNCA use em produção)
// Estas são as chaves padrão do Hardhat
const PLAYER1_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const PLAYER2_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';

const provider = new ethers.JsonRpcProvider("http://localhost:8545"); // Conexão com o nó Hardhat local
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
    console.log("Creating SiweMessage...");
    try {
        const message = new SiweMessage({
            domain: 'localhost:5173',
            address: wallet.address,
            uri: `${API_URL}/login`,
            version: '1',
            chainId: 97, // Corresponde ao .env padrão gerado pelo setup-env.js
            nonce: nonce,
        });
        console.log("SiweMessage created. Preparing message...");
        const messageToSign = message.prepareMessage();
        console.log("Message to sign:\n", messageToSign);

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

        // Verify token immediately
        try {
            await axios.get(`${API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Token verificado via /api/auth/me: VÁLIDO");
        } catch (e) {
            console.error("Falha ao verificar token via /api/auth/me:", e.message);
        }

        return token;
    } catch (err) {
        console.error("Error inside loginPlayer:", err);
        throw err;
    }
}


/**
 * A função principal que executa o teste de sanidade.
 */
async function runSanityCheck() {
    console.log("--- INICIANDO TESTE DE SANIDADE DO FLUXO 1V1 ---");
    try {
        // Etapa 1: Login de ambos os jogadores para obter tokens JWT.
        const tokenPlayer1 = await loginPlayer(player1Wallet);
        console.log("Token Player 1:", tokenPlayer1 ? "OK" : "MISSING");
        const tokenPlayer2 = await loginPlayer(player2Wallet);
        console.log("Token Player 2:", tokenPlayer2 ? "OK" : "MISSING");

        // Etapa 2: Simular o deploy e a distribuição de BCOINs de teste.
        // (Isso será feito via script Hardhat, mas aqui vamos assumir que já têm saldo)
        console.log("\n--- Etapa 2: Simulação de Saldo de BCOIN ---");
        console.log("Assumindo que os jogadores já receberam BCOINs de teste.");

        // Etapa 3: Jogador 1 entra na fila 1v1.
        console.log("\n--- Etapa 3: Jogador 1 entra na fila ---");
        // Buscar tiers de aposta
        const tiersRes = await axios.get(`${API_URL}/api/pvp/wager/tiers`, {
            headers: { Authorization: `Bearer ${tokenPlayer1}` }
        });
        const tiers = tiersRes.data.tiers;
        if (!tiers || tiers.length === 0) {
            throw new Error("Nenhum tier de aposta encontrado.");
        }
        const selectedTier = tiers[0];
        console.log(`Tier selecionado: ${selectedTier.name} (ID: ${selectedTier.id})`);

        // Buscar heróis do jogador 1
        const heroesRes = await axios.get(`${API_URL}/api/heroes`, {
            headers: { Authorization: `Bearer ${tokenPlayer1}` }
        });
        const heroes = heroesRes.data.heroes;
        if (!heroes || heroes.length === 0) {
            throw new Error("Jogador 1 não possui heróis.");
        }
        const selectedHero = heroes[0];
        console.log(`Herói selecionado: ${selectedHero.id} (Nível: ${selectedHero.level})`);

        // DEBUG: Adicionar XP ao herói para cumprir os requisitos do tier
        console.log("DEBUG: Definindo XP do herói para 100...");
        await axios.post(`${API_URL}/api/debug/set-hero-xp`, {
            heroId: selectedHero.id,
            xp: 100
        }, {
            headers: { 'x-admin-secret': 'admin123' }
        });

        // Entrar na fila
        const joinRes = await axios.post(
            `${API_URL}/api/pvp/wager/enter`,
            { heroId: selectedHero.id, tierId: selectedTier.id },
            { headers: { Authorization: `Bearer ${tokenPlayer1}` } }
        );
        console.log("Resposta da entrada na fila:", joinRes.data);


        // Etapa 4: Jogador 2 entra na fila 1v1, criando uma partida.
        console.log("\n--- Etapa 4: Jogador 2 entra na fila e cria a partida ---");
        // Buscar heróis do jogador 2
        const heroesRes2 = await axios.get(`${API_URL}/api/heroes`, {
            headers: { Authorization: `Bearer ${tokenPlayer2}` }
        });
        const heroes2 = heroesRes2.data.heroes;
        if (!heroes2 || heroes2.length === 0) {
            throw new Error("Jogador 2 não possui heróis.");
        }
        const selectedHero2 = heroes2[0];
        console.log(`Herói selecionado para Jogador 2: ${selectedHero2.id} (Nível: ${selectedHero2.level})`);

        // DEBUG: Adicionar XP ao herói para cumprir os requisitos do tier
        console.log("DEBUG: Definindo XP do herói do Jogador 2 para 100...");
        await axios.post(`${API_URL}/api/debug/set-hero-xp`, {
            heroId: selectedHero2.id,
            xp: 100
        }, {
            headers: { 'x-admin-secret': 'admin123' }
        });

        // Entrar na fila
        const joinRes2 = await axios.post(
            `${API_URL}/api/pvp/wager/enter`,
            { heroId: selectedHero2.id, tierId: selectedTier.id },
            { headers: { Authorization: `Bearer ${tokenPlayer2}` } }
        );
        console.log("Resposta da entrada na fila (Jogador 2):", joinRes2.data);

        console.log("Aguardando matchmaking (6 segundos)...");
        await new Promise(resolve => setTimeout(resolve, 6000));

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
