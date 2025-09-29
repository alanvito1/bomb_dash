# End-to-End (E2E) Test Plan for Bomb Dash Web3

This document outlines the end-to-end test plan for the Bomb Dash Web3 platform, simulating complete user journeys to identify integration bugs before launch.

## 1. Objectives
- Verify the complete user flow, from authentication to gameplay and reward claiming.
- Ensure seamless integration between the client, backend, and smart contracts.
- Validate that all new features (Tournaments, Solo XP, Expanded Progression) work as intended in a production-like environment.

## 2. Test Environment
- **Client:** Local build of the Phaser.js game client.
- **Backend:** Local server running `node server.js`.
- **Blockchain:** Local Hardhat node (`npx hardhat node`).
- **Contracts:** Deployed to the local Hardhat node (`npx hardhat run scripts/deploy.js --network localhost`).
- **Wallets:** At least two separate browser wallets (e.g., MetaMask on different browser profiles) funded with test BCOIN.

## 3. Test Cases

### Test Case 1: Full User Lifecycle (Solo Player)

**Objective:** Verify the complete journey for a new player focusing on solo mode and progression.

**Steps:**
1.  **Authentication:**
    -   Connect a new, empty wallet to the client.
    -   Initiate login via "Sign-In with Ethereum".
    -   Sign the message in MetaMask.
    -   **Expected:** User is successfully logged in. A new user record is created in the backend database.
2.  **Solo Gameplay & XP Gain:**
    -   Play a solo game session.
    -   Defeat 15 minions and 1 boss.
    -   At the game over screen, verify the client sends a `POST /api/solo/game-over` request.
    -   **Expected:** The API returns a success message indicating 25 XP was gained (15 * 1 + 1 * 10). The user's `xp` in the `users` table is updated.
3.  **Solo Reward Info:**
    -   The client should make a `GET /api/solo/reward-info` request.
    -   **Expected:** The API returns the estimated BCOIN reward per game and the time remaining in the cycle. The client displays this information correctly.
4.  **Solo Reward Claim:**
    -   After playing a few solo games (e.g., 5 games), click the "Claim Rewards" button.
    -   The client sends a `POST /api/solo/claim-rewards` request with `{ "gamesPlayed": 5 }`.
    -   **Expected:** The backend returns a valid signature.
    -   The client uses this signature to call the `claimReward` function on the `PerpetualRewardPool` contract via MetaMask.
    -   Approve the transaction in MetaMask.
    -   **Expected:** The transaction succeeds. The player's BCOIN balance in MetaMask increases by the expected amount.
5.  **Level Up:**
    -   Continue playing solo mode until enough XP is gathered for Level 2.
    -   Click the "Level Up" button. The client sends a `POST /api/user/levelup` request.
    -   Approve the BCOIN `transferFrom` transaction in MetaMask for the 1 BCOIN fee.
    -   **Expected:** The transaction succeeds. The API responds with the new level (2), new HP (110), and new damage (2). The `users` and `player_stats` tables are updated accordingly in the database.

---

### Test Case 2: 4-Player Tournament Lifecycle

**Objective:** Verify the complete flow of a 4-player tournament, from joining to prize distribution.

**Steps:**
1.  **Player Setup:**
    -   Log in with 4 separate player accounts (using different browser profiles/wallets).
    -   Ensure each player has enough BCOIN to cover the entry fee.
2.  **Joining the Tournament:**
    -   Player 1 joins a 4-player tournament with a 10 BCOIN entry fee.
    -   Approve the BCOIN transfer in MetaMask.
    -   **Expected:** The client receives a message indicating they are waiting for more players (1/4). A new tournament is created in the `tournaments` table.
    -   Players 2 and 3 join the same tournament.
    -   **Expected:** The client shows the updated player count (2/4, 3/4).
    -   Player 4 joins the tournament.
    -   **Expected:** The client shows the tournament is full and will begin shortly. The backend triggers the `createBracket` function. The `tournament_matches` table is populated with 2 matches for Round 1.
3.  **Round 1 Gameplay:**
    -   Simulate Match 1 (Player A vs. Player B). Player A wins.
    -   The backend receives a `POST /api/tournaments/report-match` request for Match 1.
    -   **Expected:** The match is marked as complete with Player A as the winner.
    -   Simulate Match 2 (Player C vs. Player D). Player D wins.
    -   The backend receives a report for Match 2.
    -   **Expected:** The `advanceWinner` logic triggers, and a new match for Round 2 (the final) is created between Player A and Player D.
4.  **Final Round & Prize Distribution:**
    -   Simulate the final match (Player A vs. Player D). Player D wins.
    -   The backend receives a report for the final match.
    -   **Expected:**
        -   The `advanceWinner` logic marks the tournament as "completed".
        -   The Oracle's `reportTournamentResult` function is called with the winners (1st: Player D, 2nd: Player A).
        -   Check the BCOIN balances of all participants and the team/pool wallets. Player D should receive the 1st place prize, Player A the 2nd place prize, and the commissions should be distributed correctly.

---
This E2E plan provides a comprehensive framework for validating the core features of the application before launch.