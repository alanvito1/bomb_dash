# Relatório de Engenharia Reversa: Mecânicas Legadas

> **Status da Análise:** Concluída
> **Contexto do Código:** O código fonte atual implementa um **Vertical Arcade Shooter** (estilo Space Invaders/1942). As mecânicas de "Bomberman" (Grid, Blocos Destrutíveis, Explosão em Cruz) **não estão presentes** na lógica ativa do jogo, embora existam geradores de textura para `soft_block` e `hard_block` (provavelmente resquícios ou preparações futuras).

Este relatório detalha as regras matemáticas extraídas do código ativo (`GameScene.js`, `EnemySpawner.js`, `CollisionHandler.js`, `PowerupLogic.js`).

---

## 1. Grid & Spawn

_A lógica de Grid Matricial não existe no código atual. O jogo opera em coordenadas contínuas (Pixel Coordinates) com scroll vertical._

- **Matriz do Mapa:** Inexistente. O jogo é um _Infinite Vertical Scroller_.
- **Spawn de Inimigos:**
  - **Local:** Coordenada Y = `-50` (topo da tela, fora da visão). Coordenada X = Aleatório entre `50` e `Largura - 50`.
  - **Lógica:** Intervalos de tempo controlados por `EnemySpawner.js`.
  - **Soft Block:** A lógica de geração e chance (%) de `soft_block` **não existe** no código atual.

## 2. Bombas e Fogo

_No código atual, "Bombas" funcionam como projéteis de tiro, não como explosivos estáticos de área._

- **Detonação:** Não há timer de detonação em ms. A bomba viaja até colidir ou sair da tela.
  - **Cadência de Tiro (`fireRate`):** Padrão de **600ms**. (Pode ser reduzido por Powerups).
- **Cálculo de Dano:**
  - **Dano Base:** 1.
  - **Fórmula:** `Dano = Base + Powerups`.
  - **Colisão:** Dano é aplicado instantaneamente ao tocar (`overlap`) no inimigo.
- **Reação em Cadeia:** **Não existe.** Bombas são independentes.
- **Velocidade do Projétil:** 300 px/s (negativo, para cima).

## 3. Inimigos (IA e Status)

_A IA é rudimentar, focada em progressão vertical (Descida)._

- **Inteligência Artificial:**
  - Movimento linear vertical constante (`setVelocityY`).
  - Não há perseguição (Raycasting) ou movimentação aleatória complexa.
- **Status (HP e Velocidade):**
  - Escalam com **Mundo (W)**, **Fase (P)** e **Nível da Conta (Lvl)**.
  - **Multiplicador de Dificuldade:** `M = 1 + (Lvl - 1) * 0.07` (Aumenta 7% por nível de conta).
  - **HP do Inimigo:** `Math.ceil((1 + (W-1)*5 + (P-1)) * M)`
  - **Velocidade:** `(80 + (W-1)*15 + (P-1)*5) * M` (Base: 80 px/s).
  - **Boss:** HP Base 100 + Scaling massivo. Velocidade menor (~28 px/s).

## 4. Drops e Powerups (RNG)

_Existem dois sistemas de Drop independentes: Loot (Moedas/Itens) e Powerups (Buffs de Status)._

### A. Loot (GameScene.js)

Disparado ao destruir um inimigo.

- **Chance Global:** **20%**.
- **Tabela de Loot (se acertar os 20%):**
  - **50%:** Gold (BCOIN) - Quantidade: 1 a 5.
  - **30%:** Scrap Metal (Material).
  - **15%:** Health Potion.
  - **5%:** Equipamento (Rusty Sword, Leather Vest, etc.).

### B. Powerups (PowerupLogic.js)

Disparado independentemente do Loot.

- **Chance Global:** **12%**.
- **Duração dos Efeitos:** **10.000ms (10 segundos)** (Acumulativo se pegar outro).
- **Efeitos Matemáticos:**
  1.  **`rapid_fire`:** Reduz o `fireRate` em **100ms** (Mínimo de 100ms). Aumenta a cadência de tiro.
  2.  **`multi_shot`:** Adiciona **+1 projétil** por disparo (Máximo 3).
  3.  **`power_bomb`:** Aumenta o Dano (`damage`) em **+1**.
  4.  **`mega_bomb`:** Aumenta o tamanho visual/colisão da bomba em **50%** (1.5x).
  5.  **`energy_shield`:** Cura instantânea de **50 HP** (Não é escudo temporário, é cura).

---

**Observação para Game Design:**
Como o objetivo é construir a Arena (presumivelmente Bomberman), as regras acima refletem um jogo de gênero diferente ("Shooter"). Para a Arena, será necessário **criar do zero** as regras de Grid, Matriz, Detonação por Tempo e Destruição de Blocos, pois não constam neste código legado.
