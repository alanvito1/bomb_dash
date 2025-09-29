# Bomb Dash - Web3 Edition

Este é o repositório do backend e dos contratos inteligentes para o Bomb Dash, um jogo de ação 2D com uma arquitetura Web3 completa, integrando blockchain para matchmaking, recompensas e progressão de personagem.

## Arquitetura Web3

O projeto é construído sobre uma base que separa a lógica do jogo (cliente) da lógica de negócios e estado (backend e blockchain), garantindo segurança e descentralização das funcionalidades críticas.

*   **Client (Frontend):** Um cliente de jogo (não neste repositório) construído com Phaser.js, responsável apenas pela renderização e entrada do usuário. Ele se comunica com o backend via API REST.

*   **Backend (Node.js/Express):** O servidor atua como a autoridade central para ações que não precisam de consenso on-chain. Ele gerencia a autenticação, o estado off-chain do jogador (nível, XP, HP, dano) e serve como o **Oráculo** para o sistema.
    *   **Autenticação:** Utiliza **Sign-In with Ethereum (SIWE)**, permitindo que os jogadores façam login de forma segura usando suas carteiras Ethereum.
    *   **Banco de Dados (SQLite):** Armazena dados do jogador, como estatísticas, progresso e gerenciamento de torneios.
    *   **Oráculo (`oracle.js`):** Um serviço confiável que reporta resultados de partidas para os contratos inteligentes e assina mensagens para autorizar ações on-chain (como o resgate de recompensas).

*   **Blockchain (Hardhat/Solidity):** O ambiente de desenvolvimento e os contratos inteligentes que governam a economia e as regras do jogo.
    *   **`TournamentController.sol`:** Gerencia as taxas de entrada para torneios, a distribuição de prêmios e as taxas de level-up.
    *   **`PerpetualRewardPool.sol`:** Um pool de recompensas para o modo solo, operando em um ciclo de emissão de 10 minutos.

## Core Mechanics

### Sistema de Progressão RPG (Expandido)
- **Níveis e Experiência (XP):** Jogadores ganham XP de duas formas:
    - **Vitórias em PvP:** Ganhar partidas em torneios concede uma quantidade fixa de XP.
    - **Modo Solo:** Derrotar inimigos no modo solo concede XP (ex: **1 XP por minion**, **10 XP por boss**).
- **Level Up:** Quando um jogador acumula XP suficiente, ele pode subir de nível.
    - **Custo:** Para subir de nível, o jogador deve pagar uma taxa de **1 BCOIN**.
    - **Bônus:** A cada nível, o jogador recebe **+10 HP** e **+1 de Dano**.
    - **Processo:** O backend verifica o XP, o oráculo aciona o pagamento on-chain, e o contrato distribui a taxa. Após a confirmação, o nível, HP e dano do jogador são atualizados no banco de dados.

### Ciclo de Recompensa (Modo Solo)
- **Distribuição:** O `PerpetualRewardPool.sol` distribui recompensas em BCOIN para jogadores do modo solo a cada 10 minutos.
- **Transparência:** Os jogadores podem consultar a recompensa estimada por jogo e o tempo restante no ciclo atual através de um endpoint da API.
- **Resgate (Claim):** Para resgatar as recompensas, o jogador solicita uma assinatura criptográfica segura ao backend e a utiliza para chamar a função `claimReward` no contrato, garantindo que apenas o jogador autorizado possa sacar seus ganhos.

### Sistema de Torneios (4 e 8 Jogadores)
- O backend agora gerencia a lógica de matchmaking e a criação de chaves (brackets) para torneios.
- **Fluxo:**
    1.  Jogadores entram em um torneio através da API.
    2.  Quando o torneio atinge a capacidade (4 ou 8 jogadores), o backend gera as chaves da primeira rodada.
    3.  Após cada partida, o resultado é reportado à API.
    4.  O backend avança o vencedor para a próxima rodada.
    5.  Quando os 3 melhores são definidos, o oráculo reporta o resultado final ao contrato `TournamentController.sol` para a distribuição automática dos prêmios.

## Local Development Setup

### Pré-requisitos
*   Node.js (v16 ou superior)
*   npm

### 1. Instalação
Clone o repositório e instale as dependências.
```bash
# Clone o repositório e navegue até ele
git clone <URL_DO_REPOSITORIO>
cd <NOME_DO_REPOSITORIO>

# Instale as dependências do Hardhat (raiz)
npm install

# Instale as dependências do Backend
cd backend
npm install
cd ..
```

### 2. Configuração do Ambiente
No diretório `backend`, copie o arquivo de exemplo `.env.example` para um novo arquivo `.env`.
```bash
cd backend
cp .env.example .env
```
Abra o arquivo `.env` e preencha as variáveis. Para desenvolvimento local, você só precisa da `ORACLE_PRIVATE_KEY`. Ao iniciar o nó Hardhat no próximo passo, copie a chave privada de uma das contas de teste (ex: Account #1) e cole-a no seu arquivo `.env`.

### 3. Rodando o Ambiente
Você precisará de **três terminais** abertos na raiz do projeto.

**Terminal 1: Iniciar o Nó Blockchain**
```bash
npx hardhat node
```

**Terminal 2: Implantar os Contratos**
Com o nó rodando, implante os contratos na sua blockchain local.
```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Terminal 3: Iniciar o Servidor Backend**
```bash
cd backend
node server.js
```

### 4. Rodando os Testes (Opcional)
Para verificar se a lógica do backend está funcionando corretamente, você pode rodar os testes unitários.
```bash
# Navegue até a pasta do backend
cd backend

# Rode os testes
npm test
```

## API Endpoints (`http://localhost:3000/api`)

### Autenticação
*   `GET /auth/nonce`: Gera um nonce para a assinatura SIWE.
*   `POST /auth/verify`: Verifica a assinatura e retorna um JWT.
*   `GET /auth/me` (Protegido): Retorna os dados do usuário autenticado.

### Usuário e Progressão
*   `GET /user/stats` (Protegido): Busca as estatísticas de jogo do jogador.
*   `POST /user/levelup` (Protegido): Inicia o processo de level-up.

### Modo Solo
*   `POST /solo/game-over` (Protegido): Submete o resultado de uma partida solo para ganhar XP.
    -   **Body:** `{ "minionsDefeated": number, "bossesDefeated": number }`
*   `POST /solo/claim-rewards` (Protegido): Gera a assinatura para resgatar recompensas do modo solo.
    -   **Body:** `{ "gamesPlayed": number }`
*   `GET /solo/reward-info`: Retorna a recompensa estimada por jogo e o tempo restante no ciclo.

### Torneios
*   `POST /tournaments/join` (Protegido): Entra em um torneio.
    -   **Body:** `{ "capacity": number, "entryFee": string, "onchainTournamentId": number }`
*   `POST /tournaments/report-match` (Protegido): Reporta o vencedor de uma partida de torneio.
    -   **Body:** `{ "matchId": number, "winnerId": number }`

## Segurança
*   **Rate Limiting:** A API implementa um limite de 100 requisições por 15 minutos por IP para proteger contra ataques de DoS e força bruta.
*   **Gestão de Chaves:** A chave do Oráculo é carregada via variáveis de ambiente para evitar exposição no código-fonte. Em produção, recomenda-se o uso de um serviço de gerenciamento de segredos.
---
Este README fornece uma visão geral completa do estado atual do projeto, facilitando a contribuição e o desenvolvimento contínuo.