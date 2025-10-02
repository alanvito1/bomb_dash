# Data Analytics & KPI Dashboard - Technical Proposal

This document outlines the technical plan for implementing a future data analytics dashboard for both players and administrators.

## 1. KPIs to Track

The following Key Performance Indicators (KPIs) should be tracked to measure game health, player engagement, and economic activity.

### Player-Facing Metrics:
-   **Personal High Scores:** Best score achieved in different game modes.
-   **Matches Played:** Total number of games started.
-   **Win/Loss Ratio:** Ratio of games won to games lost, especially in PvP modes.
-   **BCOIN Earned:** Total amount of BCOIN collected from gameplay.
-   **Average Session Length:** Average time a player spends in the game per session.

### Admin-Facing Metrics:
-   **Daily Active Users (DAU):** Number of unique players logging in per day.
-   **Monthly Active Users (MAU):** Number of unique players logging in per month.
-   **Player Retention Rate:** Percentage of players who return to the game after a specific period (e.g., 1-day, 7-day, 30-day retention).
-   **BCOIN Transaction Volume:** Total volume of BCOIN spent on in-game items, wagers, or other features.
-   **New Player Conversion:** Percentage of new sign-ups who complete their first game.
-   **Top Spenders/Earners:** Leaderboards for players who spend or earn the most BCOIN.

## 2. Proposed Tech Stack

### Frontend
-   **Charting Library:** **Chart.js** is recommended.
    -   **Reasoning:** It's lightweight, easy to integrate with Phaser/HTML5, has excellent documentation, and offers a good variety of chart types (line, bar, pie, doughnut) that are sufficient for our needs. It has no dependencies and is highly performant.
    -   *Alternatives considered:* D3.js (more powerful but has a steeper learning curve) and ApexCharts (good features but slightly heavier).

### Backend
-   **New API Endpoints:** The existing Node.js/Express backend will be extended with new endpoints to serve aggregated analytics data. We should avoid querying raw data on the fly for performance reasons.
    -   `GET /api/analytics/kpis`: An admin-only endpoint to fetch key KPIs like DAU, MAU, and transaction volumes.
    -   `GET /api/analytics/player/:playerId`: A protected endpoint for players to retrieve their own historical performance data.
    -   `GET /api/analytics/charts`: An endpoint to provide time-series data formatted for Chart.js (e.g., DAU over the last 30 days).
-   **Data Aggregation:** A scheduled job (e.g., using `node-cron`) will run periodically (e.g., daily) to process raw game logs or transaction data and store it in a new, optimized analytics table.
-   **Database Schema Changes:**
    -   Introduce a new table, `daily_analytics`, to store the aggregated daily stats (DAU, transaction volumes, etc.). This prevents performance degradation on the main application tables.
    -   Potentially add more detailed logging tables for player actions if not already present.

## 3. Implementation Phases

A phased approach will allow for incremental delivery and testing.

### Phase 1: Basic Player Stats Dashboard (V1.1)
-   **Goal:** Provide immediate value to players by showing them their own performance data.
-   **Frontend:** Create a new "Stats" scene in the Phaser client. Implement simple text-based KPIs and one or two charts (e.g., score history).
-   **Backend:** Create the `GET /api/analytics/player/:playerId` endpoint. Implement the initial data tracking for individual player stats.

### Phase 2: Admin KPI Dashboard (V1.2)
-   **Goal:** Give administrators the tools to monitor the game's health and economy.
-   **Frontend:** Develop a separate, secure web interface (or an in-game admin panel) for viewing dashboards.
-   **Backend:** Implement the `GET /api/analytics/kpis` and `GET /api/analytics/charts` endpoints. Set up the daily cron job for data aggregation.

### Phase 3: Advanced Analytics (V1.3+)
-   **Goal:** Introduce more sophisticated analytics features.
-   **Features:**
    -   Player segmentation (e.g., analyzing behavior of new players vs. veteran players).
    -   A/B testing framework for evaluating changes to game balance or economy.
    -   Integration with external analytics services if needed.