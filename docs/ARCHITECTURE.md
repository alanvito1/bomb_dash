# Architecture & Design

## System Context (C4 Level 1)

This diagram illustrates the high-level interaction between the User, the Bomb Dash Game System, and external Blockchain components.

```mermaid
C4Context
    title System Context Diagram for Bomb Dash Web3

    Person(player, "Player", "A web3 gamer playing via browser")
    System(bombDash, "Bomb Dash System", "The full-stack game application")

    System_Ext(bsc, "BNB Smart Chain", "Blockchain network for assets and currency")
    System_Ext(wallet, "User Wallet", "MetaMask/WalletConnect for signing")

    Rel(player, bombDash, "Plays game, manages heroes", "HTTPS")
    Rel(player, wallet, "Signs transactions", "Local/Browser")
    Rel(bombDash, wallet, "Requests signatures", "Web3 Provider")
    Rel(wallet, bsc, "Submits transactions", "RPC")
    Rel(bombDash, bsc, "Reads/Writes contract state", "JSON-RPC")
```

## Container Diagram (C4 Level 2)

This diagram breaks down the "Bomb Dash System" into its core executable containers.

```mermaid
C4Container
    title Container Diagram for Bomb Dash Web3

    Person(player, "Player", "Browser-based user")

    Container_Boundary(app, "Bomb Dash Application") {
        Container(frontend, "Frontend SPA", "Vite, Phaser 3, Ethers.js", "Game client running in browser")
        Container(backend, "Backend API", "Node.js, Express", "Game logic, matchmaking, off-chain state")
        ContainerDb(db, "Game Database", "SQLite (Dev) / MySQL (Prod)", "Stores user profiles, stats, match history")
    }

    System_Ext(bsc, "Smart Contracts", "Hardhat/BSC: HeroNFT, BCOIN, RewardPool")

    Rel(player, frontend, "Interacts with", "HTTPS")
    Rel(frontend, backend, "API Calls (Auth, Stats)", "JSON/HTTPS")
    Rel(backend, db, "Reads/Writes", "Sequelize")
    Rel(frontend, bsc, "Direct Contract Calls (Mint, Stake)", "Ethers.js")
    Rel(backend, bsc, "Oracle Actions (Verify, Sign)", "Ethers.js")
```

## Database Schema (ERD)

The following diagram represents the data model managed by the Backend API.

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

## Key Flows

### 1. Solo Reward Claiming

```mermaid
sequenceDiagram
    participant P as Player
    participant FE as Frontend
    participant BE as Backend
    participant SC as Smart Contract (RewardPool)

    P->>FE: Plays Solo Game
    FE->>BE: POST /api/solo/game-over (Result)
    BE->>BE: Validate & Log Game (SoloGameHistory)
    BE-->>FE: Acknowledge

    P->>FE: Click "Claim Rewards"
    FE->>BE: POST /api/solo/claim-reward
    BE->>BE: Calculate Pending Rewards
    BE->>BE: Generate Oracle Signature
    BE-->>FE: Return { amount, signature, nonce }

    FE->>SC: claimReward(amount, signature, nonce)
    SC->>SC: Verify Oracle Signature
    SC->>P: Transfer BCOIN
```
