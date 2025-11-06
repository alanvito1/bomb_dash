# Bomb Dash - Web3 Edition (Dockerized)

This is the full-stack repository for Bomb Dash, a 2D action game with a complete Web3 architecture designed for the BNB Smart Chain (BSC). This project is now fully containerized with Docker, providing a consistent and easy-to-manage development environment.

## Project Overview

For a comprehensive understanding of the project's current status, future direction, and detailed feature checklist, please refer to the official project roadmap.

**➡️ [View the Project ROADMAP.md](./ROADMAP.md)**

## Architecture & Technical Documentation

The project is built on a decoupled architecture. Detailed documentation covering the architecture, technical specifications, and development protocols can be found in the `/docs` directory.

- **[Project Briefing](./docs/BRIEFING.md):** The high-level vision and economic goals.
- **[Technical Briefing](./docs/TECHNICAL_BRIEFING.md):** A detailed breakdown of the technical implementation.
- **[Architecture & Coding Standards](./docs/ARQUITETURA_E_PADROES.md):** The development standards and patterns.

## 🚀 Getting Started with Docker

This project is configured to run entirely within Docker containers. This eliminates the need for manual setup of Node.js, Hardhat, or any other dependencies on your local machine.

### Prerequisites

*   **Docker Desktop** or **Docker Engine** installed on your system.

### Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd bomb-dash-repo
    ```

2.  **Create an Environment File:**
    Copy the example environment file to create your own local configuration.
    ```bash
    cp .env.example .env
    ```
    *Note: The default values in `.env` are pre-configured to work with the Dockerized Hardhat network. You do not need to change anything to get started.*

3.  **Build and Run the Application:**
    Use Docker Compose to build the images and start all the services (Hardhat Node, Backend, Frontend) in the correct order.
    ```bash
    sudo docker compose up --build
    ```
    *Note: The `--build` flag is only necessary the first time you run the command or after making changes to the `Dockerfile`s or source code.*

4.  **Access the Application:**
    *   **Frontend (Game):** Open your browser and navigate to `http://localhost:5173`
    *   **Backend API:** The API is available at `http://localhost:3000`
    *   **Hardhat Node:** The local blockchain is running at `http://localhost:8545`

### Stopping the Application

To stop all running services, press `Ctrl + C` in the terminal where `docker compose` is running, or run the following command from the project root in another terminal:
```bash
sudo docker compose down
```

---
This `README.md` provides everything you need to get the Bomb Dash project running in a clean, containerized environment.
