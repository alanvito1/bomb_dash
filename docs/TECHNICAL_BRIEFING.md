# Briefing Técnico Completo: Bomb Dash Web3

Este documento resume a arquitetura, as funcionalidades implementadas e como os diferentes componentes do projeto se conectam, desde a blockchain até a experiência do jogador.

## 1. Arquitetura Geral (Como as peças se conectam)

O projeto é dividido em três camadas principais que trabalham em conjunto:

- **Cliente (Frontend - Phaser.js):** A camada de visualização. É responsável por renderizar o jogo, capturar os comandos do jogador e exibir informações da conta (Nível, XP, HP, etc.). **Não contém lógica de negócio crítica**. Ele se comunica exclusivamente com o nosso Backend através de uma API REST.
- **Backend (Servidor - Node.js/Express):** O cérebro da operação. Ele serve como a fonte de verdade para os dados "off-chain" (que não precisam estar na blockchain) e atua como o **Oráculo** do sistema.
  - **Funções:** Autentica jogadores, gerencia o banco de dados (XP, nível, etc.) e envia transações seguras para a blockchain em nome do sistema.
- **Blockchain (Contratos Inteligentes - Solidity):** A camada de confiança e economia. É a fonte de verdade para os dados "on-chain" (financeiros e de regras críticas).
  - **Funções:** Gerencia a posse de BCOINs, taxas de entrada de torneios, distribuição de prêmios e as regras imutáveis dos pools de recompensa.

**Fluxo de Comunicação:**
`Jogador (Cliente) <-> API (Backend) <-> Oráculo (Backend) -> Blockchain`

---

## 2. O Fluxo Completo do Jogador (Jornada do Usuário)

1.  **Login:** O jogador clica em "Login with Wallet". O cliente pede um `nonce` ao backend, o jogador assina uma mensagem com sua carteira (SIWE), e o backend verifica a assinatura, retornando um **Token JWT** que autoriza o jogador a usar a API.
2.  **Visualização do Inventário de Heróis:** Com o JWT, o cliente acessa a nova tela de "Inventário" (antiga "Perfil"). O endpoint `GET /api/auth/me` agora retorna **todos os dados do jogador** (nível, XP, stats de combate), que são exibidos em um "card de herói".
3.  **Comprando um Upgrade na Loja:**
    - O jogador vai para a `ShopScene`.
    - Ao clicar em um upgrade, o cliente solicita a aprovação (via MetaMask) para o contrato `TournamentController` gastar o custo em BCOIN.
    - Após a aprovação on-chain, o cliente chama `POST /api/user/stats` para que o backend salve o novo stat do jogador.
4.  **Entrando em uma Partida PvP (1v1):**
    - O jogador clica para entrar em uma partida com uma taxa de, por exemplo, 10 BCOIN.
    - O cliente solicita que o jogador aprove (via MetaMask) o contrato `TournamentController` a gastar 10 BCOIN de sua carteira.
    - Após a aprovação, o cliente chama o endpoint `POST /api/pvp/match/enter` no backend.
    - O backend chama a função `enterMatch1v1` no contrato, que transfere os 10 BCOIN e coloca o jogador na fila. Quando outro jogador faz o mesmo, o contrato cria a partida.
5.  **Fim da Partida:**
    - O servidor de jogo (lógica interna) determina o vencedor.
    - O **Oráculo** do backend é notificado. Ele chama a função `reportMatchResult` no contrato `TournamentController`.
    - O contrato distribui o prêmio (ex: 18 BCOIN) para o vencedor e as taxas (1 BCOIN para a Team Wallet, 1 BCOIN para o `PerpetualRewardPool`).
    - O Oráculo, em seguida, concede **50 XP** ao vencedor, atualizando o banco de dados.
6.  **Subindo de Nível (Level Up):**
    - Quando o jogador atinge o XP necessário, o botão "Subir de Nível" na tela de Inventário fica ativo.
    - Ao clicar, o cliente primeiro solicita a aprovação (via MetaMask) para o `TournamentController` gastar **1 BCOIN**.
    - Em seguida, o cliente chama o endpoint `POST /api/user/levelup`.
    - O backend verifica se o XP é suficiente, chama o Oráculo para executar a transação on-chain (`payLevelUpFee`), e, após a confirmação, atualiza o nível e o HP do jogador no banco de dados.

---

## 3. Detalhamento dos Sistemas Implementados

#### a) Sistema de Autenticação e Usuário:

- **Tecnologia:** Sign-In with Ethereum (SIWE).
- **Herói Padrão (Mock Hero):** Se um jogador faz login pela primeira vez e não possui um Bombcrypto NFT, o backend **automaticamente atribui a ele um herói padrão** com stats pré-definidos, permitindo que ele jogue imediatamente.
- **Endpoint de Debug:** Um endpoint de administrador (`POST /api/debug/assign-mock-hero`) foi criado para facilitar testes, permitindo a atribuição manual de um herói mock a qualquer carteira.
- **Dados no DB (`users`):** `id`, `wallet_address`, `max_score`, `level`, `xp`, `hp`.
- **Dados no DB (`player_stats`):** `damage`, `speed`, `extraLives`, `fireRate`, `bombSize`, `multiShot`, `coins`.

#### b) Sistema de Progressão (RPG):

- **Fórmula de XP:** Baseada na fórmula clássica do Tibia, garantindo uma curva de progressão exponencial. A lógica foi replicada no frontend em `src/utils/rpg.js` para consistência visual.
- **Visualização de XP:** Uma **barra de XP funcional** foi adicionada ao HUD do jogo, mostrando o progresso do jogador para o próximo nível.
- **Ganho de XP:** Atualmente, fixado em **50 XP** por vitória em partida PvP.
- **Custo de Level Up:** **1 BCOIN**. O fluxo de pagamento agora é iniciado pelo cliente: ele solicita a aprovação on-chain da taxa e, após a confirmação, chama o backend para registrar o level up.
- **Distribuição da Taxa:** 50% para a `PerpetualRewardPool` (recompensa solo) e 50% para a `TeamWallet`.
- **Bônus de Level Up:** Atualmente, o jogador ganha **+10 HP** por nível.

#### c) Sistema de Torneios (PvP):

- **Contrato:** `TournamentController.sol`.
- **Funcionalidades On-Chain:**
  - **Matchmaking 1v1:** Uma fila on-chain simples baseada em taxas de entrada idênticas.
  - **Torneios 4p/8p:** O contrato já suporta a criação e entrada em torneios de 4 e 8 jogadores. A lógica de chaveamento e reporte de múltiplos vencedores precisa ser implementada no backend, mas o contrato está pronto.
  - **Distribuição de Prêmios:** A lógica de prêmios para até 3 vencedores (1º, 2º, 3º lugar) já está implementada no contrato, ideal para os torneios maiores.

#### d) Economia do Modo Solo:

- **Contrato:** `PerpetualRewardPool.sol`.
- **Ciclo de Recompensa:** Um novo ciclo começa a **cada 10 minutos**, acionado por um _cron job_ no backend.
- **Cálculo da Recompensa:** A recompensa por jogo solo é calculada a cada ciclo com a fórmula: `(Balanço do Pool * Taxa de Emissão) / Jogos do Ciclo Anterior`.
- **Reivindicação (Claim):** A lógica para um jogador reivindicar suas recompensas (`claimReward`) existe no contrato e é segura (requer assinatura do Oráculo), mas os endpoints de backend para gerar essa assinatura e acionar o claim ainda precisam ser criados.

#### e) O Oráculo:

- **Função:** É a única entidade que pode chamar funções críticas nos contratos, como `reportMatchResult`, `payLevelUpFee` e (futuramente) assinar pedidos de `claimReward`.
- **Segurança:** Ele usa uma chave privada dedicada (`ORACLE_PRIVATE_KEY`) e é fundamental para a segurança do sistema, prevenindo que jogadores reportem resultados falsos.

---

### f) Sistemas Adicionais Implementados (Pós-escopo inicial)

Durante o desenvolvimento, os seguintes sistemas foram adicionados para aumentar a profundidade econômica e de engajamento do jogo:

- **Sistema de Aposta de XP (XP Wager):**

  - **Contrato:** `WagerArena.sol`.
  - **Fluxo:** Jogadores entram em uma fila de aposta com uma taxa em BCOIN e, crucialmente, apostando o XP do seu herói. O vencedor da partida recebe o BCOIN do perdedor e também o XP.
  - **Mecânica de De-level:** A perda de XP pode fazer com que um herói **perca níveis (de-level)**, criando uma mecânica de alto risco. A lógica é gerenciada no `pvp_service.js` e `database.js`.
  - **API:** `GET /api/pvp/wager/tiers`, `POST /api/pvp/wager/enter`.

- **Sistema de Staking de Heróis:**

  - **Contrato:** `HeroStaking.sol`.
  - **Fluxo:** Permite que jogadores depositem (façam "stake") de seus NFTs de herói no contrato para ganhar recompensas passivas.
  - **Sincronização:** O backend (`staking_listener.js`) escuta os eventos `HeroDeposited` e `HeroWithdrawn` para atualizar o status do herói (`staked` ou `in_wallet`) no banco de dados.
  - **Retirada Segura:** A retirada de um herói requer uma assinatura do Oráculo (`signHeroWithdrawal`) que inclui o nível e XP atuais do herói, prevenindo a adulteração de dados.

- **Sistema do Altar de Buffs Globais:**
  - **Fluxo:** É um sistema de meta comunitária. Jogadores doam BCOIN para o "altar" através da função `donateToAltar`.
  - **Verificação:** O backend verifica cada doação on-chain através do endpoint `POST /api/altar/donate`, que exige um `txHash`.
  - **Ativação de Buff:** Um _cron job_ no backend (`checkAltarAndActivateBuff`) verifica a cada minuto se a meta de doação foi atingida. Se sim, ele reseta as doações e ativa um buff global aleatório (ex: +10% de XP) para todos os jogadores por um tempo determinado.

Este documento representa o estado técnico atual e completo do projeto.
