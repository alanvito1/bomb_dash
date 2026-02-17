# Architecture & Design (Hybrid Edition)

## System Context (C4 Level 1)

This diagram illustrates the high-level interaction between the User, the Bomb Dash Hybrid System, and external components.

```mermaid
C4Context
    title System Context Diagram for Bomb Dash Web3 (Hybrid Architecture)

    Person(player, "Player", "A web3 gamer playing via browser")

    Boundary(hybridSystem, "Bomb Dash Hybrid System") {
        System(frontend, "Frontend", "React app hosted on Vercel")
        System(backend, "Backend", "Node.js app hosted on Cloud Run")
    }

    System_Ext(bsc, "BNB Smart Chain", "Blockchain network for assets (Heroes, BCOIN)")
    System_Ext(supabase, "Supabase", "Managed PostgreSQL Database & Auth")
    System_Ext(scheduler, "Cloud Scheduler", "Triggers periodic tasks")

    Rel(player, frontend, "Plays game", "HTTPS")
    Rel(frontend, backend, "API Calls", "HTTPS / JSON")
    Rel(backend, supabase, "Stores user/game state", "PostgreSQL Connection")
    Rel(backend, bsc, "Reads state, Oracle signs transactions", "JSON-RPC")
    Rel(scheduler, backend, "Triggers Cron Jobs", "HTTPS")
```

## Container Diagram (C4 Level 2)

The system uses a **Hybrid Architecture** leveraging the best of Vercel and Google Cloud.

```mermaid
C4Container
    title Container Diagram for Bomb Dash Web3

    Person(player, "Player", "Browser-based user")

    Container_Boundary(vercel, "Vercel") {
        Container(frontend, "Frontend SPA", "React / Phaser 3", "Game client served via Vercel CDN")
    }

    Container_Boundary(gcp, "Google Cloud Platform") {
        Container(backend, "Backend API", "Cloud Run (Node.js 20)", "Scalable container executing game logic")
        Container(scheduler, "Cloud Scheduler", "Cron Jobs", "Triggers matchmaking & sync via HTTP")
    }

    ContainerDb(db, "Supabase Database", "PostgreSQL", "Persistent storage for user profiles and match history")
    System_Ext(bsc, "Smart Contracts", "BSC Testnet: HeroNFT, BCOIN, RewardPool")

    Rel(player, frontend, "Interacts with", "HTTPS")
    Rel(frontend, backend, "API Calls (/api/*)", "HTTPS")
    Rel(backend, db, "Reads/Writes State", "Sequelize / pg")
    Rel(backend, bsc, "Oracle Operations (Sign/Verify)", "Ethers.js")
    Rel(scheduler, backend, "Triggers Periodic Tasks", "HTTP GET /api/cron/*")
```

## Database Schema (ERD)

The following diagram represents the data model managed by Supabase (PostgreSQL).

```mermaid
erDiagram
    User ||--o{ Hero : owns
    User ||--o{ MatchmakingQueue : "in queue"
    User ||--o{ SoloGameHistory : "plays"
    User ||--|| PlayerCheckpoint : "has progress"

    User {
        int id PK
        string wallet_address
        int coins
        int account_level
        int account_xp
        boolean flagged_cheater
    }

    Hero {
        int id PK
        int user_id FK
        string hero_type "mock/nft"
        int nft_id "On-chain ID"
        int level
        int xp
        string status "in_wallet/staked"
        string sprite_name
    }

    MatchmakingQueue {
        int id PK
        int user_id FK
        int hero_id FK
        string tier
        string status
    }

    WagerMatch {
        int match_id PK
        int tier_id
        string player1_address
        string player2_address
        string winner_address
        string status
    }

    WagerTier {
        int id PK
        string name
        int bcoin_cost
        int xp_cost
    }

    SoloGameHistory {
        int id PK
        int user_id FK
        date timestamp
        boolean claimed
    }

    PlayerCheckpoint {
        int user_id PK
        int highest_wave_reached
    }

    AltarStatus {
        int id PK
        int current_donations
        int donation_goal
        string active_buff_type
    }
```

## Key Flows & Processes

### 1. Oracle Operations (Cloud Run)

The Oracle logic runs within the Cloud Run container.

- **Trigger**: User requests a withdrawal or reward claim via API.
- **Action**: Backend initializes `ethers.Wallet`, validates request against DB state, signs message, and returns signature.
- **Scaling**: Cloud Run automatically scales instances based on load (0 to N).

### 2. Scheduled Sync (Cloud Scheduler)

We use Google Cloud Scheduler to trigger maintenance tasks.

```mermaid
sequenceDiagram
    participant Scheduler as Cloud Scheduler
    participant API as Backend API (/api/cron/*)
    participant DB as Supabase
    participant BSC as Smart Contract

    Note over Scheduler, BSC: Syncing Staking Status (Every Minute)
    Scheduler->>API: GET /api/cron/sync-staking
    API->>DB: Get last_processed_block
    API->>BSC: queryFilter(HeroDeposited, fromBlock, toBlock)
    BSC-->>API: List of Events
    loop For Each Event
        API->>DB: Update Hero Status (staked/in_wallet)
    end
    API->>DB: Update last_processed_block
```

### 3. PvP Validation (Anti-Cheat)

- **Submission**: Frontend posts match results to `/api/pvp/submit`.
- **Validation**: Backend calculates `MaxDamage = Duration * DPS * 1.2`.
- **Action**: If `ReportedDamage > MaxDamage`, `User.flagged_cheater` is set to `true`.

### 4. Degraded Mode (No Blockchain)

If `ORACLE_PRIVATE_KEY` or `BSC_RPC_URL` are missing:

- **Initialization**: `oracle.initOracle()` returns `false`.
- **Gameplay**: Users can still play with "Mock Heroes".
- **Restrictions**: No NFT verification, On-Chain rewards, or Wagers.
