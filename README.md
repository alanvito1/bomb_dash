# Bomb Dash - Web3 Edition (Dockerized)

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)
![Docker](https://img.shields.io/badge/docker-enabled-blue?logo=docker)

**Bomb Dash** is a competitive 2D action game evolved into a Web3 E-Sports platform on the BNB Smart Chain (BSC). It features a client-server architecture where player skill is rewarded with BCOIN tokens through a secure, transparent, and sustainable economy.

---

## 📖 Table of Contents

- [Why Bomb Dash?](#-why-bomb-dash)
- [Features](#-features)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## 💡 Why Bomb Dash?

We are transforming a casual pixel-art game into a sustainable **Web3 E-Sport**.

- **Skill-Based Economy**: Earn rewards by competing in PvP or mastering PvE, not just by holding assets.
- **Sustainable Rewards**: A "Perpetual Reward Pool" inspired by Bitcoin's difficulty adjustment ensures longevity.
- **True Ownership**: Heroes are NFTs. Staking, Upgrading, and Trading are fully on-chain.
- **Fair Play**: Critical game logic is verified server-side, and financial transactions are secured by Smart Contracts.

---

## ✨ Features

- **🎮 PvP Arena**: 1v1 Wagers and Tournaments with on-chain prize pools.
- **🤖 PvE Campaign**: Solo mode with rewards scaled by global activity.
- **⚔️ Hero NFTs**: Use your Bombcrypto heroes. New players get a free "Mock Hero" to start.
- **🔒 Secure Auth**: Sign-In with Ethereum (SIWE) for passwordless, wallet-based authentication.
- **⚡ Instant Action**: Built with Phaser 3 and Vite for high-performance browser gameplay.

---

## 🏗 Architecture

The project uses a decoupled architecture containerized with Docker:

- **Frontend**: Vite + Phaser 3 (Game Client)
- **Backend**: Node.js + Express (API, Matchmaking, Oracle)
- **Blockchain**: Hardhat (Local) / BSC (Testnet/Mainnet)
- **Database**: SQLite (Dev) / MySQL (Prod)

➡️ **[View Detailed Architecture Diagrams](./docs/ARCHITECTURE.md)**

---

## 🚀 Quick Start

The entire stack is Dockerized. You can spin up the blockchain, backend, and frontend with a single command.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed.

### One-Command Setup

1.  **Clone & Configure**:

    ```bash
    git clone https://github.com/alanvito1/bomb_dash.git
    cd bomb_dash
    cp .env.example .env
    ```

2.  **Launch**:

    ```bash
    sudo docker compose up --build
    ```

3.  **Play**:
    - **Game**: [http://localhost:5173](http://localhost:5173)
    - **API**: [http://localhost:3000](http://localhost:3000)

---

## 📚 Documentation

For deeper dives into the code and design:

- **[Architecture Guide](./docs/ARCHITECTURE.md)**: System context, containers, and ERD diagrams.
- **[Project Briefing](./docs/BRIEFING.md)**: High-level vision and economic model.
- **[Technical Briefing](./docs/TECHNICAL_BRIEFING.md)**: Technical implementation details.
- **[Learnings](./docs/LEARNINGS.md)**: Log of architectural decisions and lessons learned.

---

## 🗺 Roadmap

Check our progress and upcoming features:
➡️ **[View ROADMAP.md](./ROADMAP.md)**

---

## 🤝 Contributing

We welcome contributions! Please read our **[Contributing Guide](./CONTRIBUTING.md)** to learn about our development process, coding standards, and how to submit Pull Requests.

---

_Built with ❤️ by the Bomb Dash Team_
