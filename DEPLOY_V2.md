# MANUAL FINAL DE DEPLOY (V2.1 - HÍBRIDO) - VERCEL + CLOUD RUN + SUPABASE

Este guia detalha o processo completo de deploy da arquitetura **Híbrida** do Bomb Dash Web3.
Nesta versão, migramos o Backend para **Google Cloud Run** para superar limitações de tempo de execução da Vercel, mantendo o Frontend na Vercel e o Banco no Supabase.

---

## 🏗️ Arquitetura

- **Frontend:** Vercel (React/Vite)
- **Backend:** Google Cloud Run (Node.js 20 / Docker)
- **Banco de Dados:** Supabase (PostgreSQL)
- **Blockchain:** BSC Testnet (Smart Contracts)
- **Cron Jobs:** Google Cloud Scheduler

---

## 📋 Pré-requisitos

1.  **Google Cloud SDK (gcloud CLI)** instalado e autenticado.
2.  **Docker** instalado e rodando.
3.  **Conta no Supabase** (com projeto criado).
4.  **Conta na Vercel** (para o Frontend).

---

## 🚀 Fase 1: Configuração do Banco de Dados (Supabase)

_(Mesmo processo da V2.0)_

1.  Acesse [app.supabase.com](https://app.supabase.com).
2.  Vá em **SQL Editor** > **New Query**.
3.  Execute o conteúdo de `supabase_schema.sql` (na raiz do repo).
4.  Obtenha a `DATABASE_URL` em **Project Settings** > **Database** > **Connection string (URI)**.
    - _Exemplo:_ `postgresql://postgres:[SENHA]@db.project.supabase.co:5432/postgres`

---

## ☁️ Fase 2: Deploy do Backend (Google Cloud Run)

### 1. Preparação e Build

O Dockerfile do backend foi otimizado para rodar a partir da raiz do repositório para resolver dependências corretamente.

1.  **Login no Google Cloud:**

    ```bash
    gcloud auth login
    gcloud config set project [SEU_PROJECT_ID]
    ```

2.  **Build da Imagem Docker:**
    Execute este comando na **raiz** do projeto:
    ```bash
    # Substitua [SEU_PROJECT_ID] pelo ID do seu projeto no GCP
    gcloud builds submit --tag gcr.io/[SEU_PROJECT_ID]/bomb-dash-backend backend/
    ```
    _Isso usa a pasta `backend/` como contexto de build, garantindo que o `Dockerfile` (que está dentro dela) encontre os arquivos nos caminhos esperados._

### 2. Deploy no Cloud Run

1.  **Criar o Serviço:**
    Vá ao Console do GCP > Cloud Run > **Criar Serviço**.

    - **Imagem:** Selecione `gcr.io/[SEU_PROJECT_ID]/bomb-dash-backend:latest`.
    - **Nome do Serviço:** `bomb-dash-backend`.
    - **Região:** `us-central1` (ou a mais próxima).
    - **Autenticação:** Permitir invocações não autenticadas (público) - _A segurança é feita via JWT/App_.

2.  **Variáveis de Ambiente:**
    Na aba **Contêiner, Variáveis e Segredos**, adicione:

    | Variável             | Valor                                            |
    | :------------------- | :----------------------------------------------- |
    | `DATABASE_URL`       | URL do Supabase (Fase 1)                         |
    | `NODE_ENV`           | `production`                                     |
    | `CHAIN_ID`           | `97` (BSC Testnet)                               |
    | `FRONTEND_DOMAIN`    | Domínio do Frontend (ex: `bomb-dash.vercel.app`) |
    | `JWT_SECRET`         | (Seu Hash Seguro)                                |
    | `ADMIN_SECRET`       | (Sua Senha de Admin/Oráculo)                     |
    | `CRON_SECRET`        | (Uma nova senha forte para proteger os Crons)    |
    | `PRIVATE_KEY`        | Chave Privada do Deployer                        |
    | `ORACLE_PRIVATE_KEY` | Chave Privada do Oráculo                         |

    _Dica: Você pode usar o Secret Manager do GCP para maior segurança._

3.  **Deploy:**
    Clique em **Criar**. Aguarde a URL final (ex: `https://bomb-dash-backend-xyz.a.run.app`).

### 3. Configurar Cloud Scheduler (Cron Jobs)

Como o Cloud Run escala a zero, precisamos de "pings" externos para rodar as tarefas agendadas.

1.  Vá ao Console do GCP > **Cloud Scheduler**.
2.  **Job 1: Matchmaking (Minuto a Minuto)**

    - **Nome:** `bomb-dash-matchmaking`
    - **Frequência:** `* * * * *` (A cada minuto)
    - **Target:** HTTP
    - **URL:** `[SUA_URL_CLOUD_RUN]/api/cron/matchmaking`
    - **Método:** GET
    - **Headers:**
      - `Authorization`: `Bearer [SEU_CRON_SECRET]`

3.  **Job 2: Sync Staking (Minuto a Minuto)**

    - **Nome:** `bomb-dash-sync-staking`
    - **Frequência:** `* * * * *`
    - **URL:** `[SUA_URL_CLOUD_RUN]/api/cron/sync-staking`
    - **Headers:** `Authorization: Bearer [SEU_CRON_SECRET]`

4.  **Job 3: Recompensas (Hora em Hora)**
    - **Nome:** `bomb-dash-rewards`
    - **Frequência:** `0 * * * *`
    - **URL:** `[SUA_URL_CLOUD_RUN]/api/cron/distribute-rewards`
    - **Headers:** `Authorization: Bearer [SEU_CRON_SECRET]`

---

## 🌐 Fase 3: Atualizar Frontend (Vercel)

Agora que o backend mudou de endereço, precisamos apontar o frontend para ele.

1.  Vá ao painel da **Vercel** > Seu Projeto Frontend.
2.  Vá em **Settings** > **Environment Variables**.
3.  Edite a variável `VITE_API_URL`:
    - **Novo Valor:** `https://bomb-dash-backend-xyz.a.run.app/api` (URL do Cloud Run + `/api`)
4.  Faça um **Redeploy** do Frontend para aplicar a mudança.

---

## 🛡️ Segurança PvP (Anti-Exploit)

O novo backend inclui validação de **Dano Máximo Teórico** no endpoint `/api/pvp/submit`.

- **Funcionamento:** O servidor calcula `(Duração * DPS Máximo do Herói) * 1.2`. Se o dano reportado for maior, o usuário é marcado como `flagged_cheater = true`.
- **Consequência:** Usuários flaggados não conseguem submeter novos resultados nem entrar em filas.
- **Monitoramento:** Verifique a tabela `users` no Supabase periodicamente por `flagged_cheater = true`.

---

_Assinado: Jules, Eng. de Software Sênior._
