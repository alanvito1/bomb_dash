#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Wait for the Hardhat node to be ready
# The URL is the one used in docker-compose.yml for the backend service
echo "Healthcheck: Waiting for Hardhat node at http://hardhat:8545..."
npm install -g wait-on
wait-on http://hardhat:8545 --timeout 60000

echo "Healthcheck passed. Starting backend server..."

# Execute the original command (e.g., npm start)
exec "$@"
