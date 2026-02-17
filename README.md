# Bomb Dash - Web3 Edition (Vercel Native)

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-2.0.0-orange)
![Vercel](https://img.shields.io/badge/vercel-deployed-black?logo=vercel)
![Supabase](https://img.shields.io/badge/supabase-postgres-green?logo=supabase)

**Bomb Dash** is a competitive 2D action game evolved into a Web3 E-Sports platform on the BNB Smart Chain (BSC). It features a client-server architecture where player skill is rewarded with BCOIN tokens through a secure, transparent, and sustainable economy.

This version is optimized for **Serverless Deployment** on Vercel with a managed PostgreSQL database via Supabase.

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

The project uses a modern Serverless architecture:

- **Frontend**: Next.js / Vite (React) hosted on Vercel Edge.
- **Backend**: Node.js Serverless Functions (Vercel API Routes).
- **Database**: Supabase (PostgreSQL) with connection pooling.
- **Background Tasks**: Vercel Cron Jobs for matchmaking and blockchain syncing.
- **Blockchain**: BSC Testnet/Mainnet via Ethers.js.

➡️ **[View Detailed Architecture Diagrams](./docs/ARCHITECTURE.md)**

---

## 🚀 Deployment

This project is designed to be "Zero DevOps". You can deploy it directly to Vercel and Supabase in minutes.

### Quick Start Guide

1.  **Database**: Create a Supabase project and run the provided SQL schema (`supabase_schema.sql`).
2.  **Deploy**: Connect this repository to Vercel.
3.  **Configure**: Add the required Environment Variables.

➡️ **[Read the Full Deployment Manual](./docs/DEPLOYMENT_MANUAL.md)**

---

## 📚 Documentation

For deeper dives into the code and design:

- **[Architecture Guide](./docs/ARCHITECTURE.md)**: System context, serverless flows, and ERD.
- **[Deployment Manual](./docs/DEPLOYMENT_MANUAL.md)**: Step-by-step setup guide.
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
