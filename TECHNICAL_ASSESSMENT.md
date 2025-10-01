# Análise Técnica do Código-Fonte — Bomb Dash

**Para:** Gerência de Projeto
**De:** Jules, Engenheiro Chefe
**Data:** 2025-10-01
**Assunto:** Levantamento Técnico Pré-SIF-06: Mapeamento de Funcionalidades e Assets Existentes

## 1. Inventário de Assets Visuais

O projeto possui uma estrutura de assets visuais bem definida, localizada em `src/assets/`. Os recursos estão categorizados da seguinte forma:

- **Heróis:**
  - **Ninja Hero (`src/assets/Ninja Hero/`):** Contém uma sequência de 12 frames para animação (`ninja_01.png` a `ninja_12.png`).
  - **Witch Hero (`src/assets/Witch Hero/`):** Contém uma sequência de 12 frames para animação, com nomes de arquivos inconsistentes (`Layer 256.png`, etc.).

- **Inimigos e Chefes:**
  - **Inimigos Comuns (`src/assets/`):** Existem 5 sprites de inimigos (`enemy1.png` a `enemy5.png`).
  - **Chefes (`src/assets/`):** Existem 5 sprites de chefes (`boss1.png` a `boss5.png`).
  - **Assets Adicionais de Chefes (`src/assets/Boss and Creeps/Boss/`):** Contém subpastas para diferentes tipos de chefes (`Robot`, `boss_tank`, `golzilla`, `soldier`), incluindo sprites direcionais para o `Robot`, o que sugere animações mais complexas.

- **Power-ups:**
  - **Ícones (`src/assets/powerups/`):** Existem 10 sprites para power-ups (`powerup1.png` a `powerup10.png`). A lógica do jogo atualmente utiliza 8 deles.
  - **Sprite Genérico (`src/assets/powerup.png`):** Um ícone genérico de power-up.

- **Elementos de UI:**
  - **Botões:** `btn_menu.png`, `btn_pause.png`.
  - **Fundos:** Múltiplos fundos de jogo e de menu (`bg1.png` a `bg5.png`, `menu_bg_vertical.png`, `gameover_bg.png`).

- **Animações:**
  - As sequências de frames para os heróis e os sprites direcionais para os chefes indicam que **sistemas de animação estão implementados**.

## 2. Análise dos Sistemas de Jogo Existentes

O núcleo da lógica de gameplay está centralizado na `GameScene.js` e é modularizado, com cada sistema principal sendo gerenciado por sua própria classe.

- **Sistema de Spawn (`src/modules/EnemySpawner.js`):**
  - O sistema de spawn **é baseado em "ondas" (waves)**, atrelado a um sistema de níveis (`this.level`).
  - As ondas são **pré-definidas**: a cada 5 níveis, um chefe é invocado. Nos níveis intermediários, inimigos comuns são gerados.
  - O tipo e a dificuldade dos inimigos progridem com o avanço dos níveis (mundos).
  - O spawner pode ser afetado por "anti-buffs" que aumentam a quantidade e a velocidade de spawn dos inimigos.

- **Sistema de Power-ups (`src/modules/PowerupLogic.js`):**
  - **Existe um sistema de power-ups funcional**.
  - Atualmente, 8 tipos de power-ups (coletáveis) estão implementados:
    - **5 buffs (bônus):** Aumento de cadência de tiro, tiro múltiplo, aumento de dano, aumento do tamanho da bomba e vida extra.
    - **3 "anti-buffs" (penalidades):** Gera uma onda instantânea de inimigos, acelera o spawn e a velocidade dos inimigos, e diminui o tamanho do tiro do jogador.
  - Os efeitos são temporários e gerenciados com timers.

- **Sistema de Colisão (`src/modules/CollisionHandler.js`):**
  - A colisão é tratada de forma centralizada.
  - O sistema gerencia as seguintes interações:
    - **Bomba do Jogador vs. Inimigo:** Causa dano ao inimigo e pode destruí-lo.
    - **Jogador vs. Power-up:** Coleta o power-up e ativa seu efeito.
    - **Jogador vs. Inimigo:** Causa a perda de uma vida do jogador.

- **Lógica do Jogador (`src/modules/PlayerController.js` e `src/scenes/GameScene.js`):**
  - **Movimento:** O `PlayerController` gerencia o movimento do jogador (para cima, baixo, esquerda, direita).
  - **Tiro:** A `GameScene` controla a lógica de disparo das bombas, com uma cadência (`fireRate`) que pode ser modificada por power-ups.

## 3. Levantamento do Sistema de Áudio

- **Arquivos de Áudio (`src/assets/sounds/`):**
  - O projeto possui um **conjunto abrangente de arquivos de áudio**, incluindo:
    - **Músicas de Fundo:** Música de menu e temas para 5 mundos diferentes.
    - **Efeitos Sonoros (SFX):** Sons para tiro, explosão, morte de inimigos/chefes, coleta de power-ups, game over, etc.

- **Gerenciador de Áudio (`src/utils/sound.js`):**
  - **Sim, existe um `SoundManager`**.
  - É uma classe estática que centraliza o carregamento, a execução e a interrupção de todos os sons e músicas do jogo.
  - É utilizado de forma consistente em todas as cenas e módulos para controlar o áudio.

## 4. Identificação de Código Obsoleto

- **Sistema de Login por PIN:**
  - A análise da `AuthChoiceScene.js` revela que o sistema de autenticação atual é **baseado em Web3 (conexão de carteira)**. Não há evidências de um sistema de login por PIN no código ativo. A menção a ele provavelmente se refere a uma funcionalidade já removida. A `AuthChoiceScene` é, portanto, **código essencial e não obsoleto**.

- **Cenas Antigas (`GS versao 1.js`):**
  - O arquivo `src/scenes/GS versao 1.js` **não é referenciado em nenhuma parte do código**. Ele parece ser uma versão antiga da `GameScene` e **pode ser removido com segurança** para limpar o projeto.

- **Sistemas Descontinuados:**
  - Na `GameScene.js`, há linhas de código comentadas (`// const upgrades = getUpgrades(); // REMOVIDO`) que apontam para um antigo sistema de "upgrades" que foi substituído pela persistência de estatísticas do jogador no servidor. Isso confirma que a limpeza de código legado já foi parcialmente realizada.

## Conclusão

O projeto Bomb Dash possui uma base sólida e modular. Os sistemas de gameplay principais estão bem implementados, e há uma boa variedade de assets visuais e de áudio. A limpeza de código obsoleto pode ser finalizada com a remoção do arquivo `GS versao 1.js`.

Este levantamento fornece um mapa claro do estado atual do projeto, permitindo que a SIF-06 seja planejada de forma eficiente, aproveitando as funcionalidades existentes e evitando a duplicação de trabalho.