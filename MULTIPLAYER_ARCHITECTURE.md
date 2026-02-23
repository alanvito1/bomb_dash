# TASK FORCE: MULTIPLAYER ARCHITECTURE & ELO MATCHMAKING

## 1. Executive Summary

This document outlines the technical architecture for transforming the single-player/PvE prototype into a **16-player Battle Royale** with a competitive **League of Legends-style Ranking System**.

**Core Philosophy:**
-   **Infrastructure:** Leverage existing Google Cloud Run (Node.js) with **Session Affinity** enabled. No new VPS.
-   **Networking:** Integration of **Colyseus** for authoritative server logic and real-time state synchronization.
-   **Database:** Supabase remains the "Source of Truth" for player progression, economy (BCOIN), and Ranking (LP/MMR).
-   **Gameplay:** Fast-paced, 16-player grid combat. If a full lobby isn't found in 60 seconds, bots fill the empty slots.

---

## 2. Infrastructure & Networking

### Tech Stack
-   **Backend:** Node.js (Existing) + **Colyseus Framework**.
-   **Database:** Supabase (PostgreSQL).
-   **Hosting:** Google Cloud Run (configured with Session Affinity & CPU Always Allocated).
-   **Protocol:** WebSocket (via Colyseus) for game state; REST for matchmaking/lobby entry.

### Architecture Diagram
1.  **Client (Phaser):** Connects to `wss://game-server-url/match/[roomID]`.
2.  **Matchmaking Service (Node.js):**
    -   Receives `POST /match/find`.
    -   Checks MMR.
    -   Returns a `roomID` and `sessionId`.
3.  **Colyseus Room (Node.js):**
    -   Hosts the game loop (60 ticks/sec).
    -   Manages Physics (Arcade Physics headless or simplified bounding box).
    -   Broadcasts state patches (delta compression) to 16 clients.
4.  **Persistence (Supabase):**
    -   On Match End, the server pushes results (Rank update, Rewards) to Supabase.

### Scale Strategy (MVP)
-   **Single Node:** For the MVP, a single Cloud Run instance can handle multiple concurrent rooms (e.g., 50-100 CCU depending on CPU).
-   **Future (Post-MVP):** Redis Presence to scale horizontally across multiple instances.

---

## 3. Database Schema: Ranking System

We will implement a standard ELO/LP system similar to League of Legends.

### New Table: `user_ranks`

```sql
CREATE TABLE user_ranks (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  tier VARCHAR(20) DEFAULT 'IRON', -- IRON, BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, MASTER
  division INTEGER DEFAULT 4,      -- 4, 3, 2, 1
  lp INTEGER DEFAULT 0,            -- League Points (0-100)
  mmr INTEGER DEFAULT 1000,        -- Hidden Matchmaking Rating
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  season_id INTEGER DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast matchmaking queries
CREATE INDEX idx_user_ranks_mmr ON user_ranks (mmr);
```

### Rank Tiers & Divisions
-   **Tiers:** Iron -> Bronze -> Silver -> Gold -> Platinum -> Diamond -> Master.
-   **Divisions:** IV -> III -> II -> I.
-   **Promotion:** Reaching 100 LP in Division I triggers a Tier promotion (reset to 0 LP of next Tier, Division IV).
-   **Demotion:** Dropping below 0 LP triggers a Division demotion.

---

## 4. Matchmaking Logic (The "Lobby")

### Algorithm: The "20% Rule"
1.  **Pool:** Players enter a "Waiting Room" (Memory Array in Node.js).
2.  **Filter:** The Matchmaker looks for 16 players whose MMR is within ±20% of the average MMR of the room.
3.  **Expansion:**
    -   0-30s: Strict ±20% MMR.
    -   30-45s: Expand to ±40% MMR.
    -   45-60s: Expand to ±60% MMR (Any Rank).
4.  **Fallback (The "60s Rule"):**
    -   If `timer > 60s` and `players < 16`:
    -   **FILL WITH BOTS.**
    -   Start the match immediately.

### Bot Logic in Ranked
-   Bots have an "Artificial MMR" based on the average of the room.
-   Killing a Bot grants the **same Loot/XP** as killing a player.
-   Bots are server-controlled entities in the Colyseus state.

---

## 5. Ranking Math: LP Distribution

The goal is to reward survival and kills, but primarily placement.

**Battle Royale Placement Rewards (16 Players):**

| Placement | LP Change (Est.) | MMR Change (Hidden) | Notes |
| :--- | :--- | :--- | :--- |
| **1st** | **+50 LP** | +30 | **Dominant Victory** |
| **2nd** | +35 LP | +20 | |
| **3rd** | +25 LP | +15 | |
| **4th** | +15 LP | +10 | |
| **5th - 8th** | +5 to +10 LP | +5 | **Safe Zone** |
| **9th - 12th** | -5 to -15 LP | -5 | **Lower Half** |
| **13th** | -20 LP | -10 | |
| **14th** | -24 LP | -12 | |
| **15th** | -28 LP | -15 | |
| **16th** | **-32 LP** | -20 | **First Blood / Early Exit** |

*Note: Kill Bonuses (e.g., +1 LP per kill) can be added to incentivize aggression, capped at +5 LP.*

---

## 6. Implementation Plan

### Phase 1: Backend Core (Node.js + Colyseus)
1.  **Install Colyseus:** Add `colyseus` and `@colyseus/monitor` to `backend/package.json`.
2.  **Room Logic:** Create `backend/rooms/BattleRoyaleRoom.js`.
    -   Implement `onJoin`, `onLeave`, `onMessage` (Input).
    -   Implement `setSimulationInterval` (Server Loop).
3.  **State Schema:** Define `GameState`, `Player`, `Bomb`, `Item` schemas.

### Phase 2: Database & Matchmaking
1.  **Supabase:** Run SQL migration to create `user_ranks`.
2.  **Matchmaker:** Implement `matchmaking.js` to handle the queue and invoke Colyseus room creation.

### Phase 3: Frontend Integration
1.  **Client:** Update `src/scenes/GameScene.js` to initialize the Colyseus client.
2.  **Synchronization:** Replace local physics logic with server updates (or implement Client-Side Prediction + Server Reconciliation).

### Phase 4: Verification
1.  **Test:** Simulate 16 clients connecting.
2.  **Verify:** Check LP updates in Supabase after match end.

---

## 7. Immediate Action Items

1.  **Approval:** Confirm this architecture report.
2.  **Execution:** Upon approval, I will begin by installing Colyseus and setting up the basic Server Room structure.
