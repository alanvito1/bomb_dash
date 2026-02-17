# MANUAL FINAL DE DEPLOY (V2.0) - VERCEL + SUPABASE

Este guia detalha o processo completo de deploy da arquitetura **Bomb Dash Web3** em ambiente de produção Serverless, utilizando **Vercel** para o Backend e **Supabase** para o Banco de Dados.

---

## 📋 Pré-requisitos

1.  **Node.js v18+** instalado.
2.  **Vercel CLI** instalado (`npm i -g vercel`).
3.  **Conta no Supabase** (Plano Free ou Pro).
4.  **Conta na Vercel** (Hobby ou Pro).
5.  **Carteira Ethereum** com chaves privadas para Deploy (Oráculo e Admin).

---

## 🚀 Fase 1: Configuração do Banco de Dados (Supabase)

O Supabase substitui o arquivo SQLite local e oferece um PostgreSQL robusto.

1.  **Criar Projeto no Supabase:**
    *   Acesse [app.supabase.com](https://app.supabase.com) e crie um novo projeto.
    *   Anote a senha do banco de dados (você precisará dela para a URL de conexão).
    *   Aguarde a inicialização do banco.

2.  **Configurar o Schema:**
    *   No painel do Supabase, vá até **SQL Editor**.
    *   Clique em **New Query**.
    *   Copie o conteúdo do arquivo `supabase_schema.sql` (na raiz deste repositório).
    *   Cole no editor e clique em **Run**.
    *   *Verifique se todas as tabelas foram criadas com sucesso.*

3.  **Obter a Connection String:**
    *   Vá em **Project Settings** > **Database**.
    *   Em **Connection string**, selecione **URI**.
    *   Copie a string. Ela se parece com:
        `postgresql://postgres:[YOUR-PASSWORD]@db.project.supabase.co:5432/postgres`
    *   Substitua `[YOUR-PASSWORD]` pela senha criada no passo 1.
    *   **Guarde esta URL.** Ela será sua variável `DATABASE_URL`.

---

## ⚡ Fase 2: Deploy do Backend (Vercel)

A Vercel hospedará as Serverless Functions do backend.

1.  **Preparar o Projeto:**
    *   Certifique-se de estar na raiz do projeto.
    *   O arquivo `vercel.json` já está configurado para rotear `/api/*` para o backend.

2.  **Login na Vercel:**
    ```bash
    vercel login
    ```

3.  **Deploy Inicial:**
    ```bash
    vercel
    ```
    *   Siga as instruções interativas:
        *   Set up and deploy? **Yes**
        *   Scope? **(Seu usuário/time)**
        *   Link to existing project? **No**
        *   Project name? **bomb-dash-backend**
        *   Directory? **.** (Raiz)

4.  **Configurar Variáveis de Ambiente (Environment Variables):**
    *   Vá ao painel da Vercel > Seu Projeto > **Settings** > **Environment Variables**.
    *   Adicione as seguintes variáveis (use os valores de produção/testnet):

    | Variável | Descrição | Exemplo |
    | :--- | :--- | :--- |
    | `DATABASE_URL` | URL do Supabase (Fase 1) | `postgresql://postgres:...` |
    | `NODE_ENV` | Ambiente | `production` |
    | `CHAIN_ID` | ID da Blockchain (BSC Testnet) | `97` |
    | `FRONTEND_DOMAIN` | Domínio do Frontend (sem http) | `bomb-dash.vercel.app` |
    | `JWT_SECRET` | Segredo para Tokens JWT | (Gere um Hash Forte) |
    | `ADMIN_SECRET` | Senha para painel Admin | (Senha Forte) |
    | `PRIVATE_KEY` | Chave Privada do Deployer | `0x...` |
    | `ORACLE_PRIVATE_KEY` | Chave Privada do Oráculo | `0x...` |
    | `TESTNET_RPC_URL` | RPC da BSC Testnet | `https://data-seed-prebsc-1-s1.binance.org:8545/` |

    *   *Nota: Não precisamos de `DB_SYNC=true` em produção, pois usamos o schema SQL direto.*

5.  **Redeploy:**
    *   Após salvar as variáveis, force um novo deploy para que elas tenham efeito:
    ```bash
    vercel --prod
    ```
    *   Anote a URL de produção (ex: `https://bomb-dash-backend.vercel.app`).

---

## 🌐 Fase 3: Deploy do Frontend

O Frontend também pode ser hospedado na Vercel (no mesmo projeto ou separado) ou Netlify.

1.  **Build Local (Teste):**
    ```bash
    npm run build
    ```
    *   Verifique se a pasta `dist/` foi gerada corretamente.

2.  **Deploy na Vercel (Recomendado):**
    *   Se estiver no mesmo repositório, a Vercel detectará o Vite automaticamente.
    *   Em **Build & Development Settings**:
        *   Build Command: `vite build` (ou `npm run build`)
        *   Output Directory: `dist`
    *   **Variáveis de Ambiente do Frontend:**
        *   `VITE_API_URL`: A URL do Backend (Fase 2). Ex: `https://bomb-dash-backend.vercel.app/api`
        *   `VITE_CHAIN_ID`: `97`

3.  **Atualizar o Backend:**
    *   Pegue o domínio final do Frontend (ex: `bomb-dash-frontend.vercel.app`).
    *   Volte nas configurações do Backend na Vercel.
    *   Atualize a variável `FRONTEND_DOMAIN` com este novo valor (sem `https://`).
    *   Isso é crucial para que o Login SIWE funcione e evite erros de CORS/Phishing.

---

## 🛡️ Segurança & Cron Jobs

1.  **Cron Jobs:**
    *   O arquivo `vercel.json` configura Cron Jobs automáticos para Matchmaking e Recompensas.
    *   Verifique na aba **Logs** da Vercel se os crons estão rodando (ex: `/api/cron/matchmaking`).

2.  **Oráculo:**
    *   Certifique-se de que a `ORACLE_PRIVATE_KEY` corresponda ao endereço registrado no contrato `HeroStaking`.
    *   Se precisar gerar uma nova carteira segura, consulte `SECURITY_OPS.md`.

---

## 🚑 Solução de Problemas Comuns

*   **Erro 500 no Login:** Verifique se `FRONTEND_DOMAIN` no backend corresponde exatamente ao domínio de origem da requisição.
*   **Erro "Database Connection":** Verifique a `DATABASE_URL`. Se estiver usando pooler (Supabase Transaction Pooler), adicione `?pgbouncer=true` ao final da URL.
*   **PvP Matchmaking infinito:** Verifique os logs do Cron Job `/api/cron/matchmaking`. Se o Cron falhar, o pareamento não ocorre automaticamente.

---
*Assinado: Jules, Eng. de Software Sênior.*
