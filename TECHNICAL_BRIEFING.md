# Briefing Técnico Completo: Bomb Dash Web3

Este documento resume a arquitetura, as funcionalidades implementadas e como os diferentes componentes do projeto se conectam, desde a blockchain até a experiência do jogador.

## 1. Arquitetura Geral (Como as peças se conectam)

O projeto é dividido em três camadas principais que trabalham em conjunto:

*   **Cliente (Frontend - Phaser.js):** A camada de visualização. É responsável por renderizar o jogo, capturar os comandos do jogador e exibir informações da conta (Nível, XP, HP, etc.). **Não contém lógica de negócio crítica**. Ele se comunica exclusivamente com o nosso Backend através de uma API REST.
*   **Backend (Servidor - Node.js/Express):** O cérebro da operação. Ele serve como a fonte de verdade para os dados "off-chain" (que não precisam estar na blockchain) e atua como o **Oráculo** do sistema.
    *   **Funções:** Autentica jogadores, gerencia o banco de dados (XP, nível, etc.) e envia transações seguras para a blockchain em nome do sistema.
*   **Blockchain (Contratos Inteligentes - Solidity):** A camada de confiança e economia. É a fonte de verdade para os dados "on-chain" (financeiros e de regras críticas).
    *   **Funções:** Gerencia a posse de BCOINs, taxas de entrada de torneios, distribuição de prêmios e as regras imutáveis dos pools de recompensa.

**Fluxo de Comunicação:**
`Jogador (Cliente) <-> API (Backend) <-> Oráculo (Backend) -> Blockchain`

---

## 2. O Fluxo Completo do Jogador (Jornada do Usuário)

1.  **Login:** O jogador clica em "Login with Wallet". O cliente pede um `nonce` ao backend, o jogador assina uma mensagem com sua carteira (SIWE), e o backend verifica a assinatura, retornando um **Token JWT** que autoriza o jogador a usar a API.
2.  **Visualização do Perfil:** Com o JWT, o cliente busca os dados do jogador no backend:
    *   `GET /api/auth/me` -> Traz Nível, XP, HP.
    *   `GET /api/user/stats` -> Traz estatísticas de jogo (Dano, Vidas Extras, etc.).
3.  **Entrando em uma Partida PvP (1v1):**
    *   O jogador clica para entrar em uma partida com uma taxa de, por exemplo, 10 BCOIN.
    *   O cliente solicita que o jogador aprove (via MetaMask) o contrato `TournamentController` a gastar 10 BCOIN de sua carteira.
    *   Após a aprovação, o cliente chama o endpoint `POST /api/pvp/match/enter` no backend.
    *   O backend chama a função `enterMatch1v1` no contrato, que transfere os 10 BCOIN e coloca o jogador na fila. Quando outro jogador faz o mesmo, o contrato cria a partida.
4.  **Fim da Partida:**
    *   O servidor de jogo (lógica interna) determina o vencedor.
    *   O **Oráculo** do backend é notificado. Ele chama a função `reportMatchResult` no contrato `TournamentController`.
    *   O contrato distribui o prêmio (ex: 18 BCOIN) para o vencedor e as taxas (1 BCOIN para a Team Wallet, 1 BCOIN para o `PerpetualRewardPool`).
    *   O Oráculo, em seguida, concede **50 XP** ao vencedor, atualizando o banco de dados.
5.  **Subindo de Nível (Level Up):**
    *   Quando o jogador atinge o XP necessário, o botão "Subir de Nível" no cliente fica ativo.
    *   Ao clicar, o cliente primeiro solicita a aprovação (via MetaMask) para o `TournamentController` gastar **1 BCOIN**.
    *   Em seguida, o cliente chama o endpoint `POST /api/user/levelup`.
    *   O backend verifica se o XP é suficiente, chama o Oráculo para executar a transação on-chain (`payLevelUpFee`), e, após a confirmação, atualiza o nível e o HP do jogador no banco de dados.

---

## 3. Detalhamento dos Sistemas Implementados

#### a) Sistema de Autenticação e Usuário:
*   **Tecnologia:** Sign-In with Ethereum (SIWE). Sem senhas, apenas assinatura de carteira.
*   **Dados no DB (`users`):** `id`, `wallet_address`, `max_score`, `level`, `xp`, `hp`.
*   **Dados no DB (`player_stats`):** `damage`, `speed`, `extraLives`, `fireRate`, `bombSize`, `multiShot`, `coins`.

#### b) Sistema de Progressão (RPG):
*   **Fórmula de XP:** Baseada na fórmula clássica do Tibia, garantindo uma curva de progressão exponencial.
*   **Ganho de XP:** Atualmente, fixado em **50 XP** por vitória em partida PvP.
*   **Custo de Level Up:** **1 BCOIN**, pago on-chain.
*   **Distribuição da Taxa:** 50% para a `PerpetualRewardPool` (recompensa solo) e 50% para a `TeamWallet`.
*   **Bônus de Level Up:** Atualmente, o jogador ganha **+10 HP** por nível.

#### c) Sistema de Torneios (PvP):
*   **Contrato:** `TournamentController.sol`.
*   **Funcionalidades On-Chain:**
    *   **Matchmaking 1v1:** Uma fila on-chain simples baseada em taxas de entrada idênticas.
    *   **Torneios 4p/8p:** O contrato já suporta a criação e entrada em torneios de 4 e 8 jogadores. A lógica de chaveamento e reporte de múltiplos vencedores precisa ser implementada no backend, mas o contrato está pronto.
    *   **Distribuição de Prêmios:** A lógica de prêmios para até 3 vencedores (1º, 2º, 3º lugar) já está implementada no contrato, ideal para os torneios maiores.

#### d) Economia do Modo Solo:
*   **Contrato:** `PerpetualRewardPool.sol`.
*   **Ciclo de Recompensa:** Um novo ciclo começa a **cada 10 minutos**, acionado por um *cron job* no backend.
*   **Cálculo da Recompensa:** A recompensa por jogo solo é calculada a cada ciclo com a fórmula: `(Balanço do Pool * Taxa de Emissão) / Jogos do Ciclo Anterior`.
*   **Reivindicação (Claim):** A lógica para um jogador reivindicar suas recompensas (`claimReward`) existe no contrato e é segura (requer assinatura do Oráculo), mas os endpoints de backend para gerar essa assinatura e acionar o claim ainda precisam ser criados.

#### e) O Oráculo:
*   **Função:** É a única entidade que pode chamar funções críticas nos contratos, como `reportMatchResult`, `payLevelUpFee` e (futuramente) assinar pedidos de `claimReward`.
*   **Segurança:** Ele usa uma chave privada dedicada (`ORACLE_PRIVATE_KEY`) e é fundamental para a segurança do sistema, prevenindo que jogadores reportem resultados falsos.

---

Este documento representa o estado técnico atual e completo do projeto.