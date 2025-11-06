#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Start the Hardhat node in the background
npx hardhat node --hostname 0.0.0.0 &

# Wait for the Hardhat node to be ready
# (A simple sleep is sufficient here as the healthcheck will handle the final readiness)
sleep 15

# Run the deployment script
npx hardhat run scripts/deploy.js --network localhost

# Create a "ready" file to signal that the deployment is complete
touch /tmp/deployment_complete

# Keep the container running
tail -f /dev/null
