# Relatório de Auditoria de Conformidade: Migração para Vercel + Supabase

**Data:** 25/02/2024
**Autor:** Jules (IA Auditor)
**Contexto:** Migração da arquitetura original (VPS/Docker) para Serverless (Vercel) e Banco de Dados Gerenciado (Supabase/PostgreSQL).

---

## 1. Discrepâncias de Arquitetura (`ARCHITECTURE.md` vs. Código Atual)

A documentação atual em `docs/ARCHITECTURE.md` descreve um sistema monolítico persistente, o que contradiz a realidade da nova implementação Serverless.

| Componente                  | Documentação (`ARCHITECTURE.md`)                                                          | Código Atual (Realidade)                                                                               | Ação Recomendada                                                                                       |
| :-------------------------- | :---------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- |
| **Backend Runtime**         | Container Docker persistente rodando `node server.js` em loop.                            | Vercel Serverless Functions (`@vercel/node`). O `server.js` é executado sob demanda a cada requisição. | Atualizar diagramas para refletir "Serverless Functions" e remover referência a containers de backend. |
| **Banco de Dados**          | SQLite (Dev) / MySQL (Prod) em container.                                                 | PostgreSQL via Supabase (gerenciado externamente).                                                     | Atualizar diagrama para "Supabase (PostgreSQL)" e remover container de DB.                             |
| **Processos em Background** | Cron jobs e Listeners rodando via `setInterval` ou `ethers.on()` dentro do processo Node. | **QUEBRADO:** `setInterval` e Listeners morrem quando a função Serverless termina.                     | Redesenhar arquitetura para usar Vercel Cron e/ou Workers externos.                                    |
| **Inicialização**           | Boot único na subida do container.                                                        | Boot a cada "cold start" da função lambda.                                                             | Documentar o impacto de "cold starts" na conexão com DB e Blockchain.                                  |

---

## 2. Análise do Manual de Deploy (`DEPLOYMENT_MANUAL.md`)

O manual está **100% obsoleto** e descreve um processo que não se aplica mais à infraestrutura Vercel.

- **Remover:**
  - Seções sobre Docker Compose (`docker-compose up`).
  - Seções sobre VPS e SSH.
  - Comandos de `npm install` no servidor.
  - Configuração manual de variáveis de ambiente em arquivo `.env` no servidor (agora é via Vercel Dashboard).
- **Adicionar:**
  - Guia de integração com GitHub para deploy automático na Vercel.
  - Configuração de variáveis de ambiente no painel da Vercel (incluindo `DATABASE_URL` do Supabase).
  - Configuração do Vercel Cron para tarefas agendadas.
  - Migrações de banco de dados via Supabase Dashboard ou CLI.

---

## 3. Check de Roadmap (`ROADMAP.md`)

Várias features marcadas como "Concluídas" `[x]` foram **quebradas** ou **desativadas** devido à natureza efêmera do ambiente Serverless.

### 🚨 Features Críticas Quebradas

1.  **Hero Staking System (Listener de Blockchain)**

    - **Status no Roadmap:** `[x]` Implementado (`staking_listener.js`).
    - **Realidade:** O arquivo `staking_listener.js` usa `stakingContract.on(...)` para escutar eventos em tempo real via WebSocket/Polling.
    - **Problema:** Em Serverless, esse listener nunca ficará ativo. A função roda, responde e morre. Os eventos de depósito/saque serão perdidos.
    - **Solução Necessária:** Migrar para um Cron Job que faz "polling" de eventos passados (ex: últimos 100 blocos) ou usar um indexador externo (The Graph/Alchemy).

2.  **Perpetual Solo Reward System (Ciclo de Recompensas)**

    - **Status no Roadmap:** `[x]` Implementado (`solo_reward_service.js`).
    - **Realidade:** Depende de um `setInterval` de 10 minutos iniciado no boot do servidor.
    - **Problema:** O `setInterval` não persiste entre requisições. O ciclo nunca será processado automaticamente.
    - **Solução Necessária:** Criar uma rota de API (ex: `/api/cron/rewards`) e configurar um Cron Job na Vercel (`vercel.json`) para chamá-la a cada 10 minutos.

3.  **Altar of Global Buffs**

    - **Status no Roadmap:** `[x]` Backend cron job checks donation goals.
    - **Realidade:** A lógica de Cron do Altar parece **inexistente** ou perdida no código atual. O modelo de banco de dados `AltarStatus` existe, mas não há rotas ou serviços ativos processando as doações ou aplicando buffs.
    - **Problema:** Feature incompleta/inativa.

4.  **Matchmaking em Tempo Real**
    - **Status no Roadmap:** `[x]`
    - **Realidade:** O `matchmaking.js` agora é acionado por um Cron de 1 minuto (`vercel.json`).
    - **Impacto:** O matchmaking não é mais "tempo real". Jogadores podem esperar até 59 segundos para serem pareados. Isso deve ser documentado ou aceito como limitação da arquitetura atual.

### ✅ Features Preservadas

- **Autenticação (SIWE):** Funciona (stateless).
- **Sistema de Heróis (CRUD):** Funciona (DB persistente no Supabase).
- **Ranked PvP (Entrada na Fila):** Funciona (Gravação no DB).

---

## Conclusão

A migração para Vercel + Supabase trouxe benefícios de infraestrutura, mas **quebrou a lógica de eventos em tempo real e tarefas agendadas** que dependiam de um servidor Node.js persistente.

**Ação Imediata Recomendada:**

1.  Atualizar a documentação para remover referências a Docker/VPS.
2.  Refatorar `staking_listener.js` e `solo_reward_service.js` para serem idempotentes e acionáveis via rotas HTTP (Cron).
3.  Reimplementar a lógica do "Altar of Global Buffs".
