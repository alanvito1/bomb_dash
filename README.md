# Bomb Dash - Web3 Edition (BSC Testnet)

Este é o repositório do projeto full-stack para o Bomb Dash, um jogo de ação 2D com uma arquitetura Web3 completa, configurado para operar na **Binance Smart Chain (BSC) Testnet**.

## Arquitetura do Projeto

O projeto é construído sobre uma base que separa a lógica do jogo (cliente) da lógica de negócios e estado (backend e blockchain).

*   **Client (Frontend):** Um cliente de jogo construído com **Phaser.js**, localizado na pasta `src/`. É responsável pela renderização e entrada do usuário, comunicando-se com o backend via API REST.

*   **Backend (Node.js/Express):** O servidor (`backend/`) atua como a autoridade para ações off-chain. Ele gerencia:
    *   **Autenticação:** Utiliza **Sign-In with Ethereum (SIWE)**, permitindo que os jogadores façam login de forma segura com suas carteiras.
    *   **Banco de Dados (SQLite):** Armazena dados do jogador como XP, nível e estatísticas.
    *   **Oráculo (`oracle.js`):** Um serviço confiável que reporta resultados de partidas para os contratos inteligentes, servindo como uma ponte segura entre o mundo off-chain e on-chain.
    *   **Configuração Global (`game_config.json`):** Um arquivo central que armazena variáveis de balanceamento do jogo, editáveis em tempo real através do Painel de Administrador.

*   **Blockchain (Hardhat/Solidity):** Os contratos inteligentes (`contracts/`) que governam as regras on-chain.
    *   **`TournamentController.sol`:** Gerencia a criação de torneios e a distribuição de prêmios.
    *   **`PerpetualRewardPool.sol`:** Um pool de recompensas para o modo solo.
    *   **`WagerArena.sol`:** Contrato que gerencia as partidas de aposta no modo PvP.

*   **Painel de Administrador (`admin.html`):** Uma interface web separada que permite aos administradores gerenciar as configurações globais do jogo e as estatísticas dos jogadores em tempo real.

## Mecânicas de Jogo Principais

- **Ciclo de PvP (24h Aberto / 24h Fechado):** O modo PvP alterna entre os estados "Aberto" e "Fechado" em ciclos de 24 horas. Esta lógica é gerenciada por um cron job no backend (`backend/game_state.js`).
- **Bônus de Domingo no PvP:** As recompensas de XP e BCOIN por vitórias no modo PvP recebem um bônus de +10% todos os domingos. A lógica é aplicada no momento do processamento da recompensa (`backend/database.js`).

## Setup e Deploy na BSC Testnet

O processo de setup e deploy é detalhado e mantido no **`DEPLOYMENT_MANUAL.md`**. O manual cobre:

1.  Configuração do arquivo `.env` com as chaves e URLs necessárias.
2.  Instalação de todas as dependências do projeto.
3.  Configuração da MetaMask para a BSC Testnet.
4.  Como obter `tBNB` (BNB de teste) em faucets.
5.  O comando exato para implantar os contratos na Testnet.
6.  Como iniciar o servidor backend.

Consulte o **`DEPLOYMENT_MANUAL.md`** para o guia completo.

## API Endpoints Principais

A API é servida em `http://localhost:3000/api`.

### Autenticação (SIWE)
*   `GET /auth/nonce`: Gera um nonce para a assinatura.
*   `POST /auth/verify`: Verifica a assinatura e retorna um JWT.
*   `GET /auth/me` (Protegido): Retorna os dados do usuário autenticado.

### PvP
*   `GET /pvp/status`: Retorna o estado atual do ciclo de PvP ('open' ou 'closed').
*   `POST /pvp/wager/enter` (Protegido): Valida se um jogador é elegível para entrar em uma partida de aposta.
*   `POST /pvp/wager/report` (Protegido): Reporta o resultado de uma partida de aposta.

### Admin (Protegido por `X-Admin-Secret`)
*   `GET /admin/settings`: Busca as configurações globais do jogo.
*   `POST /admin/settings`: Atualiza as configurações globais do jogo.
*   `GET /admin/players`: Retorna uma lista de todos os jogadores e suas estatísticas.
*   `POST /admin/player/:id`: Atualiza as estatísticas de um jogador específico.

---
Este README fornece uma visão geral precisa do estado atual do projeto, facilitando a contribuição e o desenvolvimento contínuo.