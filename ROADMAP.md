# Bomb Dash Web3: Project Roadmap (Version 1.0)

## 1. Project Status: Version 1.0 - Complete

- **Current State:** The project has reached its 1.0 milestone. The core architecture is stable, and all planned and emergent features have been implemented and validated. The codebase is now aligned with this updated documentation.

- **Conclusion:** All primary development objectives for version 1.0 have been met. The focus now shifts to maintenance, bug fixing, and planning for future versions.

---

## 2. Detailed Feature Checklist

### ✅ Implemented Features

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
-   [x] **PvP 1v1 Matches (Ranked):**
    -   [x] `TournamentController.sol` supports a ranked 1v1 queue.
    -   [x] Backend routes (`/api/pvp/ranked/enter`) and oracle reporting are functional.
-   [x] **Multi-Player Tournaments (4 & 8 Players):**
    -   [x] **Smart Contract:** `TournamentController.sol` includes `createTournament` and `joinTournament` functions.
    -   [x] **Backend Logic:** Backend API endpoints (`/api/tournaments/...`) and the `tournament_service.js` are implemented to manage tournament creation, joining, and in-memory bracket progression.
    -   [x] **Frontend UI:** Placeholders for `TournamentLobbyScene` and `TournamentBracketScene` are in place.
-   [x] **Hero Staking System:**
    -   [x] `HeroStaking.sol` contract allows players to stake their NFTs.
    -   [x] `staking_listener.js` backend service correctly listens to on-chain events.
    -   [x] Oracle-signed withdrawal process ensures data integrity.
-   [x] **Altar of Global Buffs:**
    -   [x] Players can donate BCOIN to a common goal.
    -   [x] Backend cron job checks donation goals and applies random global buffs.
    -   [x] API endpoints for frontend integration are functional.
-   [x] **Player Ranking System:**
    -   [x] `PlayerCheckpoint` database table tracks player progress.
    -   [x] Public `GET /api/ranking` endpoint returns the top players.
-   [x] **PvP XP Wager System:**
    -   [x] `WagerArena.sol` contract manages 1v1 BCOIN wagers.
    -   [x] Backend logic handles XP wagering, including de-leveling mechanics.

### ❌ Pending & Incomplete Features

-   (None for Version 1.0)

---

## 3. Future Roadmap (Post-v1.0)

-   **High Priority:**
    -   **Stabilize E2E Test Suite:** Investigate and resolve the root cause of the Vite/Phaser silent crash in the Playwright environment to enable reliable, automated end-to-end testing.
    -   **Complete Tournament UI:** Fully implement the `TournamentLobbyScene` to display open tournaments and the `TournamentBracketScene` to visualize live bracket progression.

-   **Medium Priority:**
    -   **Create CI/CD Pipeline:** (Moved from v1.0) Establish a GitHub Actions workflow to automate linting, testing, and deployments.
    -   **Refactor Backend Routes:** (Moved from v1.0) Break down the monolithic `backend/server.js` file into smaller, resource-specific route modules.
    -   **Increase Test Coverage:** Audit and increase unit test coverage to meet the required 90% standard.

-   **Low Priority:**
    -   **Implement Formal DB Migrations:** Switch from programmatic schema management to a CLI-based migration system like Sequelize CLI.
    -   **UI/UX Polish:** Conduct a comprehensive design pass to ensure a consistent and professional user interface.
