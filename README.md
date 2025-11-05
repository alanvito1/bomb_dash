# Bomb Dash - Web3 Edition

This is the full-stack repository for Bomb Dash, a 2D action game with a complete Web3 architecture designed for the BNB Smart Chain (BSC). It features a real-money economy, NFT-based heroes, and a self-sustaining reward system.

## Project Overview

For a comprehensive understanding of the project's current status, future direction, and detailed feature checklist, please refer to the official project roadmap.

**➡️ [View the Project ROADMAP.md](./ROADMAP.md)**

## Architecture & Technical Documentation

The project is built on a decoupled architecture that separates the game client from the backend and blockchain logic. Detailed documentation covering the architecture, technical specifications, development protocols, and deployment process can be found in the `/docs` directory.

- **[Project Briefing](./docs/BRIEFING.md):** The high-level vision and economic goals.
- **[Technical Briefing](./docs/TECHNICAL_BRIEFING.md):** A detailed breakdown of the technical implementation.
- **[Architecture & Coding Standards](./docs/ARQUITETURA_E_PADROES.md):** The development standards and patterns.
- **[Deployment Manual](./docs/DEPLOYMENT_MANUAL.md):** Step-by-step guide for setup and deployment.

## Core Components

*   **Client (Frontend):** A game client built with **Phaser.js**, responsible for rendering and user input.
*   **Backend (Node.js/Express):** The server (`/backend`) manages off-chain logic, including **SIWE Authentication**, a **SQLite Database** for player stats, and a secure **Oracle** to communicate with the blockchain.
*   **Blockchain (Solidity):** The smart contracts (`/contracts`) that govern all on-chain rules for tournaments, rewards, and wagers.

## Getting Started

To set up the project locally, please follow the complete **[Deployment Manual](./docs/DEPLOYMENT_MANUAL.md)**. The manual covers environment setup, dependency installation, and contract deployment.

### Quick Commands

- **Install all dependencies:** `npm run install:all`
- **Deploy contracts to BSC Testnet:** `npm run deploy:testnet`
- **Start the backend server:** `npm run start:backend`
- **Run the frontend dev server:** `npm run dev`
- **Run E2E tests:** `npm run test:e2e`

---
This `README.md` serves as a central hub for navigating the project. For any details not covered here, please consult the linked documentation.