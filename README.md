# 💣 Bomb Dash - Web3 Edition

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)
![Docker](https://img.shields.io/badge/docker-enabled-blue?logo=docker)

> **"Skill is the new Collateral."**
> A competitive, decentralized E-Sports platform where players stake their skills, not just their tokens.

---

## 📖 Table of Contents

- [The Why](#-the-why)
- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## 💡 The Why

Traditional Web3 games often suffer from "Pay-to-Win" mechanics or unsustainable "Ponzi-nomics". **Bomb Dash** flips the script:

*   **Problem**: Most P2E games reward users solely for holding assets, leading to inflation and lack of engagement.
*   **Solution**: We built a **Skill-Based Economy**. Rewards are distributed based on gameplay performance (PvP wins, PvE milestones), verified by a secure Oracle.
*   **Ownership**: Heroes are true NFTs on the BNB Smart Chain. Your stats, level, and history are immutable.

---

## ✨ Key Features

*   **⚔️ PvP Wagers**: Challenge other players to 1v1 duels. Winner takes the pot (BCOIN + XP).
*   **🤖 Smart PvE**: Solo campaigns with difficulty scaling and "Perpetual Reward Pools".
*   **🔒 Oracle Security**: Backend-verified game logic prevents client-side cheating.
*   **🆔 SIWE Auth**: "Sign-In with Ethereum" for seamless, passwordless onboarding.
*   **⚡ Instant Action**: Built with Phaser 3 and Vite for 60FPS browser gameplay.

---

## 🏗 Architecture Overview

The system follows a modern, containerized microservices pattern:

| Component | Tech Stack | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | Vite, Phaser 3, Ethers.js | Game Client, Rendering, Wallet Interaction |
| **Backend** | Node.js, Express, Sequelize | Game Logic, Matchmaking, Oracle Verification |
| **Blockchain** | Hardhat (Local), BSC | Smart Contracts (ERC-721 Heroes, ERC-20 Tokens) |
| **Database** | SQLite (Dev), MySQL (Prod) | User Profiles, Game History, Leaderboards |

➡️ **[Explore the Full Architecture Maps](./docs/ARCHITECTURE.md)**

---

## 🚀 Quick Start

Get the entire stack (Blockchain + API + Client) running in under 2 minutes.

### Prerequisites
*   [Docker Desktop](https://www.docker.com/products/docker-desktop) (Running)
*   [Git](https://git-scm.com/)

### One-Command Launch

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/alanvito1/bomb_dash.git
    cd bomb_dash
    ```

2.  **Configure Environment**
    ```bash
    cp .env.example .env
    # No edits needed for local dev!
    ```

3.  **Ignite the Engine**
    ```bash
    sudo docker compose up --build
    ```
    *Wait for the "Backend Server Ready" message.*

4.  **Play**
    *   🎮 **Game Client**: [http://localhost:5173](http://localhost:5173)
    *   🔌 **API Endpoint**: [http://localhost:3000](http://localhost:3000)
    *   ⛓️ **Local Chain**: [http://localhost:8545](http://localhost:8545)

---

## 📚 Documentation

Detailed manuals for every persona:

*   **[Architecture Guide](./docs/ARCHITECTURE.md)**: C4 Diagrams, ERD, and Sequence Flows.
*   **[Technical Briefing](./docs/TECHNICAL_BRIEFING.md)**: Deep dive into the code implementation.
*   **[Project Briefing](./docs/BRIEFING.md)**: High-level vision and economic model.
*   **[Learnings](./docs/LEARNINGS.md)**: Architectural decisions and trade-offs.

---

## 🗺 Roadmap

Track our journey from Alpha to Mainnet Launch.
➡️ **[View ROADMAP.md](./ROADMAP.md)**

---

## 🤝 Contributing

We welcome code champions! Please read our **[Contributing Guide](./CONTRIBUTING.md)** for:
*   Coding Standards (Linting/Formatting)
*   Pull Request Process
*   Development Setup Details

---

*Documented with ✍️ by Scribe*
