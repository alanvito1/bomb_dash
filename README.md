# Bomb Dash - Web3 Edition

Este é o repositório do backend e dos contratos inteligentes para o Bomb Dash, um jogo de ação 2D com uma arquitetura Web3 completa, integrando blockchain para matchmaking, recompensas e progressão de personagem.

## Arquitetura Web3

O projeto é construído sobre uma base que separa a lógica do jogo (cliente) da lógica de negócios e estado (backend e blockchain), garantindo segurança e descentralização das funcionalidades críticas.

*   **Client (Frontend):** Um cliente de jogo (não neste repositório) construído com Phaser.js, responsável apenas pela renderização e entrada do usuário. Ele se comunica com o backend via API REST.

*   **Backend (Node.js/Express):** O servidor atua como a autoridade central para ações que não precisam de consenso on-chain. Ele gerencia a autenticação, o estado off-chain do jogador (nível, XP, HP) e serve como o **Oráculo** para o sistema.
    *   **Autenticação:** Utiliza **Sign-In with Ethereum (SIWE)**, permitindo que os jogadores façam login de forma segura usando suas carteiras Ethereum, eliminando a necessidade de senhas.
    *   **Banco de Dados (SQLite):** Armazena dados do jogador que não são críticos para a segurança on-chain, como XP, nível, HP e estatísticas de jogo.
    *   **Oráculo (`oracle.js`):** Um serviço confiável que monitora eventos do jogo e reporta resultados (como vencedores de partidas) para os contratos inteligentes. Ele é o único autorizado a executar certas funções de contrato, servindo como uma ponte segura entre o mundo off-chain e on-chain.

*   **Blockchain (Hardhat/Solidity):** O ambiente de desenvolvimento e os contratos inteligentes que governam a economia e as regras do jogo.
    *   **`TournamentController.sol`:** Gerencia as taxas de entrada para partidas PvP, a criação de torneios e a distribuição de prêmios e taxas. Também processa a taxa de level-up.
    *   **`PerpetualRewardPool.sol`:** Um pool de recompensas para o modo solo, operando em um ciclo de emissão de 10 minutos.
    *   **`MockBCOIN.sol`:** Um token ERC20 de teste para o ambiente de desenvolvimento local.

## Core Mechanics

### Sistema de Progressão RPG
- **Níveis e Experiência (XP):** Jogadores ganham XP ao vencer partidas. A quantidade de XP necessária para o próximo nível é baseada na fórmula de progressão do jogo Tibia.
- **Level Up:** Quando um jogador acumula XP suficiente, ele pode subir de nível.
    - **Custo:** Para subir de nível, o jogador deve pagar uma taxa de **1 BCOIN**.
    - **Endpoint:** `POST /api/user/levelup`
    - **Processo:** O backend verifica o XP, o oráculo aciona o pagamento on-chain, e o contrato distribui a taxa (50% para o pool de recompensas solo, 50% para a carteira da equipe). Após a confirmação, o nível e os atributos (HP) do jogador são atualizados no banco de dados.

### Ciclo de Recompensa (Modo Solo)
- O `PerpetualRewardPool.sol` distribui recompensas em BCOIN para jogadores do modo solo.
- **Ciclo de 10 Minutos:** A cada 10 minutos, um novo ciclo de recompensas é iniciado. Um cron job no backend (via `oracle.js`) chama a função `startNewCycle` no contrato para calcular a nova taxa de recompensa por jogo com base no saldo atual do pool e no número de jogos jogados no ciclo anterior.

## Local Development Setup

Para rodar o ambiente de desenvolvimento completo (blockchain local, backend, contratos implantados), siga os passos abaixo.

### Pré-requisitos
*   Node.js (v16 ou superior)
*   npm

### 1. Instalação
Clone o repositório e instale as dependências na raiz e na pasta `backend`.

```bash
# Clone o repositório
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
Copie o arquivo de exemplo de variáveis de ambiente e preencha-o.

```bash
# Navegue até a pasta do backend
cd backend

# Copie o arquivo de exemplo
cp .env.example .env
```
Você precisará de uma chave privada para o `ORACLE_PRIVATE_KEY`. Ao iniciar o nó Hardhat no próximo passo, ele listará 20 contas de teste. Copie a chave privada de uma delas (ex: Account #1) e cole-a em seu arquivo `.env`.

### 3. Rodando o Ambiente

Você precisará de **três terminais** abertos na raiz do projeto.

**Terminal 1: Iniciar o Nó Blockchain**
Este comando inicia uma blockchain local, simulando a rede Ethereum.

```bash
npx hardhat node
```
Mantenha este terminal rodando.

**Terminal 2: Implantar os Contratos**
Com o nó rodando, implante os contratos na sua blockchain local.

```bash
npx hardhat run scripts/deploy.js --network localhost
```
Este script irá implantar `MockBCOIN`, `TournamentController`, e `PerpetualRewardPool`, configurar suas interações e salvar seus endereços e ABIs na pasta `backend/contracts` para o servidor usar.

**Terminal 3: Iniciar o Servidor Backend**
Finalmente, inicie o servidor backend.

```bash
# Navegue até a pasta do backend
cd backend

# Inicie o servidor
node server.js
```
O servidor se conectará automaticamente à blockchain local e aos contratos implantados.

## API Endpoints

A API é servida em `http://localhost:3000/api`.

### Autenticação
*   `GET /auth/nonce`: Gera um nonce para a assinatura SIWE.
*   `POST /auth/verify`: Verifica a assinatura SIWE e retorna um JWT.
*   `GET /auth/me` (Protegido): Retorna os dados do usuário autenticado.

### Usuário e Progressão
*   `GET /user/stats` (Protegido): Busca as estatísticas de jogo do jogador (dano, velocidade, etc.).
*   `PUT /user/stats` (Protegido): Atualiza as estatísticas de jogo.
*   `POST /user/levelup` (Protegido): Inicia o processo de level-up.

### Jogo e Ranking
*   `POST /scores` (Protegido): Submete uma nova pontuação.
*   `GET /ranking`: Retorna o top 10 do ranking.
*   `POST /pvp/match/enter`: (Exemplo de endpoint para entrar no matchmaking, a lógica real pode variar).

---
Este README fornece uma visão geral completa do estado atual do projeto, facilitando a contribuição e o desenvolvimento contínuo.