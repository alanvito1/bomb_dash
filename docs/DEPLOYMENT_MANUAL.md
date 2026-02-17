# Deployment Manual (Hybrid V2.1) - Vercel + Cloud Run + Supabase

This guide details the complete deployment process for the **Hybrid Architecture** of Bomb Dash Web3.
In this version, we migrated the Backend to **Google Cloud Run** to overcome Vercel's execution time limitations, while keeping the Frontend on Vercel and the Database on Supabase.

---

## 🏗️ Architecture

*   **Frontend:** Vercel (React/Vite)
*   **Backend:** Google Cloud Run (Node.js 20 / Docker)
*   **Database:** Supabase (PostgreSQL)
*   **Blockchain:** BSC Testnet (Smart Contracts)
*   **Cron Jobs:** Google Cloud Scheduler

---

## 📋 Prerequisites

1.  **Google Cloud SDK (gcloud CLI)** installed and authenticated.
2.  **Docker** installed and running.
3.  **Supabase Account** (with a project created).
4.  **Vercel Account** (for the Frontend).

---

## 🚀 Phase 1: Database Setup (Supabase)

*(Same process as V2.0)*

1.  Access [app.supabase.com](https://app.supabase.com).
2.  Go to **SQL Editor** > **New Query**.
3.  Execute the content of `supabase_schema.sql` (in the repo root).
4.  Get the `DATABASE_URL` in **Project Settings** > **Database** > **Connection string (URI)**.
    *   *Example:* `postgresql://postgres:[PASSWORD]@db.project.supabase.co:5432/postgres`

---

## ☁️ Phase 2: Backend Deployment (Google Cloud Run)

### 1. Preparation and Build

The backend Dockerfile has been optimized to run from the repository root to resolve dependencies correctly.

1.  **Login to Google Cloud:**
    ```bash
    gcloud auth login
    gcloud config set project [YOUR_PROJECT_ID]
    ```

2.  **Build Docker Image:**
    Run this command in the **root** of the project:
    ```bash
    # Replace [YOUR_PROJECT_ID] with your GCP project ID
    gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/bomb-dash-backend backend/
    ```
    *This uses the `backend/` folder as the build context, ensuring the `Dockerfile` (inside it) finds files in the expected paths.*

### 2. Deploy to Cloud Run

1.  **Create Service:**
    Go to GCP Console > Cloud Run > **Create Service**.
    *   **Image:** Select `gcr.io/[YOUR_PROJECT_ID]/bomb-dash-backend:latest`.
    *   **Service Name:** `bomb-dash-backend`.
    *   **Region:** `us-central1` (or closest to you).
    *   **Authentication:** Allow unauthenticated invocations (public) - *Security is handled via JWT/App*.

2.  **Environment Variables:**
    In the **Container, Variables & Secrets** tab, add:

    | Variable | Value |
    | :--- | :--- |
    | `DATABASE_URL` | Supabase URL (Phase 1) |
    | `NODE_ENV` | `production` |
    | `CHAIN_ID` | `97` (BSC Testnet) |
    | `FRONTEND_DOMAIN` | Frontend Domain (e.g. `bomb-dash.vercel.app`) |
    | `JWT_SECRET` | (Your Secure Hash) |
    | `ADMIN_SECRET` | (Your Admin/Oracle Password) |
    | `CRON_SECRET` | (A new strong password to protect Crons) |
    | `PRIVATE_KEY` | Deployer Private Key |
    | `ORACLE_PRIVATE_KEY` | Oracle Private Key |

    *Tip: You can use GCP Secret Manager for better security.*

3.  **Deploy:**
    Click **Create**. Wait for the final URL (e.g. `https://bomb-dash-backend-xyz.a.run.app`).

### 3. Configure Cloud Scheduler (Cron Jobs)

Since Cloud Run scales to zero, we need external "pings" to run scheduled tasks.

1.  Go to GCP Console > **Cloud Scheduler**.
2.  **Job 1: Matchmaking (Every Minute)**
    *   **Name:** `bomb-dash-matchmaking`
    *   **Frequency:** `* * * * *`
    *   **Target:** HTTP
    *   **URL:** `[YOUR_CLOUD_RUN_URL]/api/cron/matchmaking`
    *   **Method:** GET
    *   **Headers:**
        *   `Authorization`: `Bearer [YOUR_CRON_SECRET]`

3.  **Job 2: Sync Staking (Every Minute)**
    *   **Name:** `bomb-dash-sync-staking`
    *   **Frequency:** `* * * * *`
    *   **URL:** `[YOUR_CLOUD_RUN_URL]/api/cron/sync-staking`
    *   **Headers:** `Authorization: Bearer [YOUR_CRON_SECRET]`

4.  **Job 3: Rewards (Hourly)**
    *   **Name:** `bomb-dash-rewards`
    *   **Frequency:** `0 * * * *`
    *   **URL:** `[YOUR_CLOUD_RUN_URL]/api/cron/distribute-rewards`
    *   **Headers:** `Authorization: Bearer [YOUR_CRON_SECRET]`

---

## 🌐 Phase 3: Update Frontend (Vercel)

Now that the backend has moved, we need to point the frontend to it.

1.  Go to your **Vercel** Dashboard > Your Frontend Project.
2.  Go to **Settings** > **Environment Variables**.
3.  Edit the `VITE_API_URL` variable:
    *   **New Value:** `https://bomb-dash-backend-xyz.a.run.app/api` (Cloud Run URL + `/api`)
4.  **Redeploy** the Frontend to apply the change.

---

## 🛡️ PvP Security (Anti-Exploit)

The new backend includes **Theoretical Max Damage** validation at `/api/pvp/submit`.

*   **Mechanism:** Server calculates `(Duration * MaxDPS * 1.2)`. If reported damage is higher, the user is marked `flagged_cheater = true`.
*   **Consequence:** Flagged users cannot submit results or join queues.
*   **Monitoring:** Check the `users` table in Supabase periodically for `flagged_cheater = true`.
