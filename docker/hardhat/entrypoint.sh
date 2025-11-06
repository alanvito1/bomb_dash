#!/bin/sh

# Exit immediately if a command exits with a non-zero status.
set -e

# Check for .env file and load it
if [ -f /app/.env ]; then
  echo "[SUCCESS] .env file found. Sourcing variables..."
  set -a
  source /app/.env
  set +a
  echo "[SUCCESS] .env variables loaded into the environment."
else
  echo "[ERROR] .env file not found. Please ensure it is present in the root directory."
  exit 1
fi

# Start the Hardhat node in the background
echo "Starting Hardhat node..."
npx hardhat node --hostname 0.0.0.0 &

# Wait for the Hardhat node to be ready by polling the RPC endpoint
echo "Waiting for Hardhat node to be ready..."
max_retries=30
count=0
while ! curl -s -X POST --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' http://localhost:8545 > /dev/null 2>&1; do
  if [ ${count} -ge ${max_retries} ]; then
    echo "[ERROR] Hardhat node failed to start in time."
    exit 1
  fi
  count=$((count+1))
  echo "Attempt ${count}/${max_retries}: Waiting for node..."
  sleep 2
done
echo "[SUCCESS] Hardhat node is ready."

# Run the deployment script
echo "Running deployment script..."
npx hardhat run scripts/deploy.js --network localhost
echo "[SUCCESS] Deployment script finished."

# The container will stay alive because of the background hardhat node process.
# Use 'wait' to block until the background process exits.
wait
