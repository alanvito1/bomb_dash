# Bomb Dash - Web3 Edition (Hybrid Architecture)

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-2.1.0-orange)
![Vercel](https://img.shields.io/badge/frontend-vercel-black?logo=vercel)
![Cloud Run](https://img.shields.io/badge/backend-google_cloud_run-blue?logo=google-cloud)
![Supabase](https://img.shields.io/badge/database-supabase-green?logo=supabase)

**Bomb Dash** is a competitive 2D action game evolved into a Web3 E-Sports platform on the BNB Smart Chain (BSC). It features a client-server architecture where player skill is rewarded with BCOIN tokens through a secure, transparent, and sustainable economy.

This version uses a **Hybrid Architecture**:

- **Frontend**: Hosted on Vercel (React/Vite)
- **Backend**: Hosted on Google Cloud Run (Node.js/Docker)
- **Database**: Managed PostgreSQL via Supabase

---

## 📖 Table of Contents

- [Why Bomb Dash?](#-why-bomb-dash)
- [Features](#-features)
- [Architecture](#-architecture)
- [Deployment](#-deployment)
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

The project uses a robust Hybrid Architecture:

- **Frontend**: Vite (React) Single Page Application on Vercel.
- **Backend**: Node.js Express Server running on Google Cloud Run (Dockerized).
- **Database**: Supabase (PostgreSQL) with connection pooling.
- **Background Tasks**: Google Cloud Scheduler triggers backend endpoints.
- **Blockchain**: BSC Testnet/Mainnet via Ethers.js.

➡️ **[View Detailed Architecture Diagrams](./docs/ARCHITECTURE.md)**

---

## 🚀 Deployment

The deployment is split into three phases:

1.  **Database**: Setup Supabase project.
2.  **Backend**: Deploy Docker container to Google Cloud Run.
3.  **Frontend**: Deploy to Vercel and connect to Backend URL.

➡️ **[Read the Full Deployment Manual](./docs/DEPLOYMENT_MANUAL.md)**

---

## 📚 Documentation

For deeper dives into the code and design:

- **[Architecture Guide](./docs/ARCHITECTURE.md)**: System context, hybrid flows, and ERD.
- **[Deployment Manual](./docs/DEPLOYMENT_MANUAL.md)**: Step-by-step setup guide (V2.1).
- **[Project Briefing](./docs/BRIEFING.md)**: High-level vision and economic model.
- **[Technical Briefing](./docs/TECHNICAL_BRIEFING.md)**: Technical implementation details.

---

## 🗺 Roadmap

Check our progress and upcoming features:
➡️ **[View ROADMAP.md](./ROADMAP.md)**

---

## 🤝 Contributing

We welcome contributions! Please read our **[Contributing Guide](./CONTRIBUTING.md)** to learn about our development process, coding standards, and how to submit Pull Requests.

---

_Built with ❤️ by the Bomb Dash Team_
