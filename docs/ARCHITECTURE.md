# Architecture & Design

## System Context (C4 Level 1)

High-level interaction between the Player, Bomb Dash System, and External Blockchain.

```mermaid
C4Context
    title System Context Diagram for Bomb Dash Web3

    Person(player, "Player", "Web3 Gamer")
    System(bombDash, "Bomb Dash System", "The full-stack game platform")

    System_Ext(bsc, "BNB Smart Chain", "Mainnet/Testnet for BCOIN & NFTs")
    System_Ext(wallet, "User Wallet", "MetaMask / Rabbit / WalletConnect")

    Rel(player, bombDash, "Plays game, mints heroes", "HTTPS / WSS")
    Rel(player, wallet, "Signs transactions (SIWE, txs)", "Browser Extension")
    Rel(bombDash, wallet, "Requests signatures", "Ethers.js Provider")
    Rel(wallet, bsc, "Submits signed transactions", "JSON-RPC")
    Rel(bombDash, bsc, "Reads contract state / Verifies events", "JSON-RPC")
```

## Container Diagram (C4 Level 2)

Breakdown of the Bomb Dash System into executable containers.

```mermaid
C4Container
    title Container Diagram for Bomb Dash Web3

    Person(player, "Player", "Browser-based user")

    Container_Boundary(app, "Bomb Dash Application") {
        Container(frontend, "Frontend SPA", "Vite, Phaser 3", "Game client, rendering, wallet logic\nPort: 5173")
        Container(backend, "Backend API", "Node.js, Express", "Auth, Matchmaking, Oracle Service\nPort: 3000")
        ContainerDb(db, "Game Database", "SQLite (Dev) / MySQL (Prod)", "User profiles, Match history, Hero stats")
    }

    System_Ext(bsc_node, "Blockchain Node", "Hardhat (Dev) / BSC RPC", "Smart Contracts: HeroNFT, BCOIN, WagerArena\nPort: 8545 (Dev)")

    Rel(player, frontend, "Interacts with UI", "HTTPS")
    Rel(frontend, backend, "API Calls (Auth, PvP)", "JSON/HTTPS")
    Rel(backend, db, "Reads/Writes Data", "Sequelize (SQL)")
    Rel(frontend, bsc_node, "Direct Contract Calls (Approve, Stake)", "Ethers.js")
    Rel(backend, bsc_node, "Oracle Actions (Sign, Verify)", "Ethers.js / Private Key")
```

## Database Schema (ERD)

Detailed data model managed by the Backend API.

```mermaid
erDiagram
    User ||--o{ Hero : owns
    User ||--o{ MatchmakingQueue : "queues in"
    User ||--o{ SoloGameHistory : "records"
    User ||--|| PlayerCheckpoint : "progress"
    User ||--o{ WagerMatch : "participates"

    User {
        int id PK
        string wallet_address UK
        int coins "BCOIN Balance"
        int account_level
        int account_xp
        int max_score
    }

    Hero {
        int id PK
        int user_id FK
        string hero_type "mock/nft"
        int nft_id "On-chain ID"
        int level
        int xp
        int hp
        int maxHp
        int damage
        int speed
        int extraLives
        int fireRate
        float bombSize
        int multiShot
        string sprite_name
        string status "in_wallet/staked"
    }

    WagerTier {
        int id PK
        string name "Bronze/Silver/Gold"
        int bcoin_cost
        int xp_cost
    }

    WagerMatch {
        int match_id PK
        int tier_id FK
        string player1_address
        string player2_address
        string winner_address
        string status "pending/completed"
        date created_at
        date updated_at
    }

    MatchmakingQueue {
        int id PK
        int user_id FK
        int hero_id FK
        string tier
        string status "searching"
        date entry_time
    }

    GameSetting {
        string key PK
        string value
    }

    AltarStatus {
        int id PK
        int current_donations
        int donation_goal
        string active_buff_type
        date buff_expires_at
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
```

## Key Flows

### 1. PvP Wager Match Flow

This flow illustrates how players enter a wager match and how the result is processed.

```mermaid
sequenceDiagram
    participant P1 as Player 1
    participant P2 as Player 2
    participant FE as Frontend
    participant BE as Backend (API)
    participant DB as Database
    participant SC as Smart Contract (WagerArena)

    Note over P1, P2: Both players select Wager Mode

    P1->>FE: Select Hero & Tier
    FE->>BE: POST /api/pvp/wager/enter (heroId, tierId)
    BE->>DB: Check Hero XP & Add to Queue
    BE-->>FE: Success (In Queue)

    Note right of BE: Matchmaking Service finds P2

    BE->>DB: Create WagerMatch (Pending)

    Note over P1, P2: Gameplay Happens (P2P or Server-Relayed)

    P1->>BE: POST /api/pvp/wager/report (Result)
    BE->>DB: Validate Result
    BE->>DB: Process XP Transfer (Winner gets XP, Loser de-levels)

    BE->>SC: Oracle calls reportWagerMatchResult()
    SC->>SC: Verify Oracle Sig
    SC->>P1: Transfer BCOIN Pot

    BE-->>FE: Match Finalized
```
