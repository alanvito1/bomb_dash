# Arquitetura e Padrões de Desenvolvimento

## 1. Visão Geral da Arquitetura

O projeto segue uma arquitetura Cliente-Servidor desacoplada:

*   **Frontend (Cliente):** Uma Single-Page Application (SPA) construída com **Phaser.js** para a lógica de jogo e renderização, e **Vite** como servidor de desenvolvimento e bundler. É responsável por toda a apresentação, interatividade do usuário e comunicação com a blockchain.
*   **Backend (Servidor):** Um servidor **Node.js** com **Express.js**, responsável pela lógica de negócio, persistência de dados (via **Sequelize** com SQLite), autenticação de sessão e interação com o Oráculo da blockchain.
*   **Blockchain (Contratos Inteligentes):** Contratos escritos em **Solidity** e implantados em uma rede compatível com EVM. Gerenciam a lógica on-chain, como posse de ativos (NFTs) e transações financeiras (BCOIN).

## 2. Padrões de Código

### Backend
*   **Estrutura de Módulos:** A lógica é organizada em serviços (`services`), rotas (`routes`), e acesso a dados (`database.js`).
*   **Variáveis de Ambiente:** Toda configuração sensível ou específica do ambiente (chaves de API, endereços de contrato) DEVE ser gerenciada através de um arquivo `.env`.
*   **Tratamento de Erros:** Usar `try...catch` em rotas assíncronas e um middleware de erro global para capturar e formatar respostas de erro de forma consistente.

### Frontend
*   **Gerenciamento de Estado:** O estado global (ex: dados do usuário logado) é mantido no `registry` do Phaser. O estado local é gerenciado dentro de cada cena.
*   **Comunicação entre Cenas:** Usar `this.scene.start('SceneKey', data)` para passar dados na transição. Para comunicação com cenas que rodam em paralelo (ex: HUD), usar o `GameEventEmitter` global.
*   **Serviços Desacoplados:** A lógica de comunicação com o backend (`api.js`) e com a blockchain (`web3/...`) é encapsulada em módulos de serviço para ser reutilizável e testável.
*   **Constantes:** Todas as chaves de cena, nomes de assets e outras constantes compartilhadas devem ser definidas no arquivo `src/CST.js`.

### Blockchain
*   **Segurança:** Utilizar as bibliotecas do OpenZeppelin como base para todos os contratos para garantir a segurança.
*   **Padrão Proxy (UUPS):** Os contratos devem ser atualizáveis (upgradeable) para permitir correções e novas funcionalidades sem a necessidade de migrar dados.
*   **Oráculo Confiável:** A lógica off-chain que precisa ser verificada on-chain (ex: resultados de partidas) é gerenciada por um Oráculo, cujo endereço é definido no momento do deploy e tem permissões especiais.

## 3. Padrão de Commits

Seguir o padrão **Conventional Commits**.
*   `feat:` para novas funcionalidades.
*   `fix:` para correções de bugs.
*   `docs:` para mudanças na documentação.
*   `style:` para formatação de código.
*   `refactor:` para refatorações que não alteram a funcionalidade.
*   `test:` para adição ou correção de testes.
*   `chore:` para tarefas de build, dependências, etc.