# Architecture & Design (Serverless Edition)

## System Context (C4 Level 1)

This diagram illustrates the high-level interaction between the User, the Bomb Dash Game System (Serverless), and external Blockchain components.

```mermaid
C4Context
    title System Context Diagram for Bomb Dash Web3 (Vercel Native)

    Person(player, "Player", "A web3 gamer playing via browser")
    System(bombDash, "Bomb Dash System", "Full-stack Next.js/Express app on Vercel")

    System_Ext(bsc, "BNB Smart Chain", "Blockchain network for assets (Heroes, BCOIN)")
    System_Ext(supabase, "Supabase", "Managed PostgreSQL Database & Auth")

    Rel(player, bombDash, "Plays game, manages heroes", "HTTPS")
    Rel(bombDash, supabase, "Stores user/game state", "PostgreSQL Connection")
    Rel(bombDash, bsc, "Reads state, Oracle signs transactions", "JSON-RPC")
```

## Container Diagram (C4 Level 2)

The system is deployed as a Serverless application on Vercel.

```mermaid
C4Container
    title Container Diagram for Bomb Dash Web3

    Person(player, "Player", "Browser-based user")

    Container_Boundary(app, "Vercel Deployment") {
        Container(frontend, "Frontend", "React / Phaser 3", "Game client served via Vercel Edge")
        Container(backend, "Backend API (Serverless)", "Node.js / Express", "Stateless functions executing game logic")
        Container(cron, "Cron Jobs", "Vercel Cron", "Scheduled tasks for matchmaking & sync")
    }

    ContainerDb(db, "Supabase Database", "PostgreSQL", "Persistent storage for user profiles and match history")
    System_Ext(bsc, "Smart Contracts", "BSC Testnet: HeroNFT, BCOIN, RewardPool")

    Rel(player, frontend, "Interacts with", "HTTPS")
    Rel(frontend, backend, "API Calls (/api/*)", "JSON/HTTPS")
    Rel(backend, db, "Reads/Writes State", "Sequelize / pg")
    Rel(backend, bsc, "Oracle Operations (Sign/Verify)", "Ethers.js")
    Rel(cron, backend, "Triggers Periodic Tasks", "HTTP GET")
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

### 1. Serverless "Oracle" Operations

Unlike a persistent server, the Oracle runs on-demand within Vercel Functions.

- **Trigger**: User requests a withdrawal or reward claim.
- **Action**: Backend function spins up, initializes `ethers.Wallet` from env vars, checks logic, signs message, and returns signature.
- **Shutdown**: Function terminates immediately after response.

### 2. Scheduled Sync (Cron Jobs)

Since there is no long-running process to listen for blockchain events, we use polling via Vercel Crons.

```mermaid
sequenceDiagram
    participant Cron as Vercel Cron
    participant API as Backend API (/api/cron/*)
    participant DB as Supabase
    participant BSC as Smart Contract

    Note over Cron, BSC: Syncing Staking Status (Every Minute)
    Cron->>API: GET /api/cron/sync-staking
    API->>DB: Get last_processed_block
    API->>BSC: queryFilter(HeroDeposited, fromBlock, toBlock)
    BSC-->>API: List of Events
    loop For Each Event
        API->>DB: Update Hero Status (staked/in_wallet)
    end
    API->>DB: Update last_processed_block
```

### 3. Degraded Mode (No Blockchain)

If `ORACLE_PRIVATE_KEY` or `BSC_RPC_URL` are missing:

- **Initialization**: `oracle.initOracle()` returns `false`.
- **Gameplay**: Users can still play with "Mock Heroes".
- **Restrictions**:
  - No NFT verification.
  - No On-Chain rewards (BCOIN).
  - No PvP Wagers (since they require on-chain escrow).
- **Purpose**: Allows development and testing of the game loop without blockchain dependencies.
