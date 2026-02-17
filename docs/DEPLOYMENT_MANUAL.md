# AVRE Deployment Manual

This guide describes how to deploy the AVRE backend to Vercel (Serverless Functions) and Supabase (PostgreSQL Database).

## Prerequisites

1.  **GitHub Account**: With access to this repository.
2.  **Vercel Account**: [Sign up here](https://vercel.com).
3.  **Supabase Account**: [Sign up here](https://supabase.com).

---

## Step 1: Database Setup (Supabase)

1.  **Create a Project**:

    - Log in to Supabase and create a new project.
    - Choose a strong database password and save it.
    - Select the region closest to your users.

2.  **Get Connection String**:

    - Go to **Project Settings** -> **Database**.
    - Under **Connection String**, select **URI**.
    - Copy the string. It will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`.
    - _Note: You will need this for the `DATABASE_URL` environment variable later._

3.  **Initialize Schema**:
    - In the Supabase Dashboard, go to the **SQL Editor** (icon on the left sidebar).
    - Click **New Query**.
    - Open the file `supabase_schema.sql` from this repository root on your local machine.
    - Copy the entire content of `supabase_schema.sql` and paste it into the Supabase SQL Editor.
    - Click **Run**.
    - _Success Check_: You should see "Success. No rows returned." and tables like `users`, `heroes` created in the Table Editor.

---

## Step 2: Vercel Deployment

1.  **Import Repository**:

    - Log in to Vercel.
    - Click **Add New...** -> **Project**.
    - Import the Git repository containing this code.

2.  **Configure Project**:

    - **Framework Preset**: Select "Other" (or let it auto-detect).
    - **Root Directory**: Keep as `./`.

3.  **Environment Variables**:

    - Expand the **Environment Variables** section.
    - Add the following variables (see reference below for details).

    | Variable Key                    | Description                   | Example Value                                     |
    | :------------------------------ | :---------------------------- | :------------------------------------------------ |
    | `NODE_ENV`                      | Environment Mode              | `production`                                      |
    | `DATABASE_URL`                  | Supabase Connection URI       | `postgresql://...`                                |
    | `JWT_SECRET`                    | Secret for signing tokens     | `long-random-string`                              |
    | `FRONTEND_DOMAIN`               | Domain for SIWE Verification  | `avre-game.vercel.app`                            |
    | `CHAIN_ID`                      | Blockchain Network ID         | `97` (BSC Testnet)                                |
    | `ADMIN_SECRET`                  | Secret for Admin/Debug Routes | `super-secret-admin-key`                          |
    | `ORACLE_PRIVATE_KEY`            | Oracle Wallet Private Key     | `0x123...`                                        |
    | `TESTNET_RPC_URL`               | Blockchain RPC URL            | `https://data-seed-prebsc-1-s1.binance.org:8545/` |
    | `TOURNAMENT_CONTROLLER_ADDRESS` | Smart Contract Address        | `0x...`                                           |
    | `PERPETUAL_REWARD_POOL_ADDRESS` | Smart Contract Address        | `0x...`                                           |
    | `HERO_STAKING_ADDRESS`          | Smart Contract Address        | `0x...`                                           |
    | `START_BLOCK_NUMBER`            | Block to start syncing events | `35000000`                                        |
    | `ALTAR_WALLET_ADDRESS`          | Wallet receiving donations    | `0x...`                                           |

4.  **Deploy**:
    - Click **Deploy**.
    - Wait for the build to complete.

---

## Step 3: Verify Cron Jobs

Vercel will automatically detect the Cron Jobs defined in `vercel.json`.

1.  Go to your Vercel Project Dashboard.
2.  Click on the **Settings** tab.
3.  Click on **Cron Jobs** in the sidebar.
4.  You should see the following jobs listed:
    - `/api/cron/matchmaking` (Every minute)
    - `/api/cron/sync-staking` (Every minute)
    - `/api/cron/check-altar` (Every 5 minutes)
    - `/api/cron/distribute-rewards` (Hourly)

---

## Troubleshooting

- **Database Connection Error**: Ensure you appended `?pgbouncer=true` to the `DATABASE_URL` if using Supabase Transaction Pooler (port 6543), or check if "SSL mode" is required. The backend is configured to use SSL by default when `DATABASE_URL` is present.
- **Oracle Errors**: Check the Vercel Function logs. If the Oracle fails to initialize, check the RPC URL and Private Key.
- **SIWE Errors**: Ensure `FRONTEND_DOMAIN` matches exactly where the frontend is hosted (no `https://`, just the domain).
