# Bomb Dash Web3: Project Roadmap & Gap Analysis

## 1. Project Status & Gap Analysis

- **Current State:** The project is in an advanced stage of development with a robust technical foundation. The core architecture (Client-Server-Blockchain) is sound, and key Web3 functionalities like SIWE authentication, the Perpetual Solo Reward Pool, and on-chain transaction verification are fully implemented as specified in the briefings.

- **Gap Analysis Summary:** A detailed audit revealed a significant disconnect between the official project briefings (`BRIEFING.md`, `TECHNICAL_BRIEFING.md`) and the actual implemented codebase.
    - **Critical Missing Features:** The multi-player tournament system (4 and 8 players) is a core requirement from the briefing but is **non-functional and incomplete** at the smart contract level.
    - **Major Undocumented Features:** Several complex systems have been fully implemented without being part of the original documented scope. These include **Hero Staking**, a global **Altar of Buffs**, a player **Ranking System**, and a high-stakes **XP Wager** mechanic. While technically functional, these features represent a significant deviation from the project's documented economic and gameplay loops.

- **Conclusion:** The project is technically advanced but suffers from a critical **"scope creep"** and a lack of updated documentation. The immediate priority must be to bridge the gap between the planned vision and the current reality, either by pausing development on undocumented features to complete the original scope, or by formally updating the project's official documentation to incorporate them.

---

## 2. Detailed Feature Checklist

### ✅ Implemented Features (Aligned with Briefing)

-   [x] **Architecture:** Decoupled Frontend (Phaser), Backend (Node/Express), and Blockchain (Solidity) layers.
-   [x] **Web3 Authentication:** Secure player login via Sign-In with Ethereum (SIWE).
    -   [x] Nonce generation and verification.
    -   [x] JWT session management.
-   [x] **Hero System:**
    -   [x] Syncs on-chain Bombcrypto NFTs to the backend database.
    -   [x] Automatically assigns default "mock" heroes to new players without NFTs.
-   [x] **Hero Progression & Upgrades:**
    -   [x] Full RPG system with XP, levels, and stats stored in the backend database.
    -   [x] On-chain verification of BCOIN payment for stat upgrades via Oracle.
-   [x] **Perpetual Solo Reward System:**
    -   [x] `PerpetualRewardPool.sol` contract manages the community reward funds.
    -   [x] Pool is correctly funded by a percentage of fees from other game activities.
    -   [x] Backend cron job (`solo_reward_service.js`) manages 10-minute reward cycles.
    -   [x] Secure, oracle-signed claiming process for player rewards.
-   [x] **PvP 1v1 Matches (BCOIN Fee):**
    -   [x] `TournamentController.sol` supports a ranked 1v1 queue.
    -   [x] Backend routes (`/api/pvp/ranked/enter`) and oracle reporting are functional.

### ⚠️ Implemented Features (Undocumented in Briefing)

-   [x] **Hero Staking System:**
    -   [x] `HeroStaking.sol` contract allows players to stake their NFTs.
    -   [x] `staking_listener.js` backend service correctly listens to on-chain `Deposit` and `Withdraw` events and updates the hero status in the database.
    -   [x] Oracle-signed withdrawal process to ensure hero XP/level data integrity.
-   [x] **Altar of Global Buffs:**
    -   [x] Players can donate BCOIN via the `donateToAltar` function.
    -   [x] Backend cron job (`checkAltarAndActivateBuff`) checks donation goals and applies random global buffs.
    -   [x] API endpoints for frontend to fetch altar status and submit donations.
-   [x] **Player Ranking System:**
    -   [x] `PlayerCheckpoint` database table tracks the highest wave reached by each player.
    -   [x] Public `GET /api/ranking` endpoint returns the top players.
-   [x] **PvP XP Wager System:**
    -   [x] `WagerArena.sol` contract manages 1v1 matches where players wager BCOIN.
    -   [x] Backend `pvp_service.js` and `database.js` include logic for **XP wagering**, where the winner gains the loser's XP, potentially causing the loser to **de-level**. This high-stakes mechanic was not detailed in the briefings.

### ❌ Pending & Incomplete Features (Required by Briefing)

-   [ ] **Multi-Player Tournaments (4 & 8 Players):**
    -   [ ] **Smart Contract:** The `TournamentController.sol` contract is **missing** core functions like `createTournament` and `joinTournament`. The existing `Tournament` struct and `reportTournamentResult` function are insufficient.
    -   [ ] **Backend Logic:** The backend has no logic to manage tournament brackets, handle multiple match progressions, or report final winners (1st, 2nd, 3rd place).

---

## 3. Priority Matrix & Next Steps

-   **High Priority:**
    1.  **Resolve Scope Discrepancy:** A strategic decision must be made:
        -   **Option A:** Halt all work on undocumented features and focus exclusively on completing the 4/8 player tournament system to meet the original briefing.
        -   **Option B:** Formally update the `BRIEFING.md` and `TECHNICAL_BRIEFING.md` to include the Staking, Altar, Ranking, and XP Wager systems, acknowledging them as part of the official project scope.
    2.  **Complete Tournament System:** Implement the necessary functions in `TournamentController.sol` and build the backend orchestration logic for multi-player tournaments.

-   **Medium Priority:**
    -   **Create CI/CD Pipeline:** Establish a GitHub Actions workflow to automate linting, testing, and deployments.
    -   **Refactor Backend Routes:** Break down the monolithic `backend/server.js` file into smaller, resource-specific route modules.
    -   **Increase Test Coverage:** Audit and increase unit test coverage to meet the required 90% standard.

-   **Low Priority:**
    -   **Documentation Consolidation:** (Already planned) Move all `.md` files into a unified `/docs` directory.
    -   **Implement Formal DB Migrations:** Switch from programmatic schema management to a CLI-based migration system like Sequelize CLI.
    -   **UI/UX Polish:** Conduct a comprehensive design pass to ensure a consistent and professional user interface.
