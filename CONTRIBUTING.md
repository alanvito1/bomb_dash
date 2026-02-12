# Contributing to Bomb Dash

First off, thanks for taking the time to contribute! 🎉

We are building the future of **Skill-Based Web3 Gaming**, and your help is vital. This guide will help you get started.

## 🏗 Development Setup

This project uses a decoupled, containerized architecture.

### Prerequisites

*   **Docker Desktop** (Required for the full stack)
*   **Node.js v18+** (For local tooling)
*   **Git**

### 1. Environment Configuration

Clone the repo and set up your environment variables.

```bash
git clone https://github.com/alanvito1/bomb_dash.git
cd bomb_dash
cp .env.example .env
```

### 2. Dependency Installation

If you plan to run tests locally (outside Docker), you must install dependencies in **both** the root and the backend folder.

```bash
# Install root dependencies (Frontend + Tooling)
npm install

# Install backend dependencies
npm install --prefix backend
```

### 3. Start the Stack (Docker)

The recommended way to develop is using Docker Compose.

```bash
sudo docker compose up --build
```

This launches:
*   **Frontend**: http://localhost:5173
*   **Backend**: http://localhost:3000
*   **Blockchain**: http://localhost:8545

---

## ✍️ Documentation Standards (The Scribe Way)

We treat documentation as a product. High-quality docs are just as important as high-quality code.

### Philosophy
1.  **If it isn't documented, it doesn't exist.**
2.  **Visuals > Text**: Use diagrams whenever possible.
3.  **Diátaxis Framework**: Structure your docs into Tutorials, How-To Guides, Reference, and Explanation.

### Rules
*   **Markdown Only**: Use standard `.md` files.
*   **Mermaid.js**: All diagrams must be code-based (Mermaid). **No static images** for architecture.
*   **No "Lorem Ipsum"**: Write real content or leave it out.
*   **Keep it Fresh**: If you change the code, update the docs.

---

## 🧪 Testing

### End-to-End (Playwright)
Run the full suite in Docker:
```bash
npm run test:docker
```

### Backend Unit Tests (Mocha)
Run strictly the backend logic:
```bash
npm test --prefix backend
```

---

## 📦 Pull Request Process

1.  **Fork** the repository.
2.  **Create a Branch** (`feat/new-hero`, `fix/login-bug`).
3.  **Commit** with clear messages.
4.  **Push** and open a PR.
5.  **Describe** your changes:
    *   *What* did you change?
    *   *Why* did you change it?
    *   *How* did you verify it?

## 🎨 Code Style

*   **Lint**: `npm run lint`
*   **Format**: `npm run format`

Happy Coding! 🚀
