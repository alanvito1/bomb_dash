# Contributing to Bomb Dash

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to Bomb Dash. These are just guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## 🛠 Development Setup

This project is fully containerized using Docker to ensure a consistent environment for all developers.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Git](https://git-scm.com/)

### Setting Up the Environment

1.  **Clone the repository**

    ```bash
    git clone https://github.com/alanvito1/bomb_dash.git
    cd bomb_dash
    ```

2.  **Configure Environment Variables**
    Copy the example file to create your local configuration:

    ```bash
    cp .env.example .env
    ```

    _Note: If `.env.example` is missing, ensure you have the required variables for `DB_PATH`, `JWT_SECRET`, etc._

3.  **Start the Application**
    Use Docker Compose to build and start the services:
    ```bash
    sudo docker compose up --build
    ```
    This will start:
    - **Hardhat Node**: Local blockchain (Port 8545)
    - **Backend**: Node.js API (Port 3000)
    - **Frontend**: Vite Dev Server (Port 5173)

## 🧪 Testing

We use a combination of unit tests and end-to-end (E2E) tests.

### Backend Tests (Mocha)

To run backend unit tests locally (outside Docker):

```bash
npm install --prefix backend
npm test --prefix backend
```

### E2E Tests (Playwright)

To run the full end-to-end test suite:

```bash
# Runs tests in a docker container
npm run test:docker

# Runs tests locally (requires app to be running)
npx playwright test
```

## 🎨 Code Style

We use **ESLint** and **Prettier** to maintain code quality.

- **Lint**: `npm run lint`
- **Format**: `npm run format`

Please ensure your code is linted and formatted before submitting a Pull Request.

## 📦 Pull Request Process

1.  **Fork** the repo and create your branch from `main`.
2.  **Name your branch** descriptively (e.g., `feature/new-wager-mode` or `fix/login-bug`).
3.  **Commit** your changes using descriptive messages.
4.  **Push** to your fork and submit a Pull Request.
5.  **Describe** your changes in detail in the PR description. Link to any relevant issues.

## 📝 Commit Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

Example: `feat(auth): add SIWE login implementation`
