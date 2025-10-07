#!/bin/bash

# =================================================================
# BOMBDASH WEB3 - SETUP VALIDATION SCRIPT
# =================================================================
# This script automates the complete setup process for the project.
# It ensures that all dependencies are installed, contracts are
# deployed, and the backend server starts successfully.
#
# The script will exit immediately if any command fails.
# =================================================================

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Helper Functions ---
echo_step() {
  echo "================================================="
  echo "➡️  STEP: $1"
  echo "================================================="
}

echo_success() {
  echo "✅ SUCCESS: $1"
  echo
}

# --- Main Script ---

# 1. Generate .env file
echo_step "Generating .env configuration file..."
node scripts/setup-env.js
echo_success ".env file created successfully."

# 2. Install root dependencies
echo_step "Installing root Node.js dependencies..."
npm install
echo_success "Root dependencies installed."

# 3. Install backend dependencies
echo_step "Installing backend Node.js dependencies..."
npm install --prefix backend
echo_success "Backend dependencies installed."

# 4. Deploy contracts to bscTestnet
echo_step "Deploying smart contracts to bscTestnet..."
# We use `npx` to ensure we're using the local hardhat installation.
npx hardhat run scripts/deploy.js --network bscTestnet
echo_success "Smart contracts deployed and addresses updated in .env file."

# 5. Start and validate backend server
echo_step "Starting and validating the backend server..."
# Start the server in the background and redirect output to a log file.
node backend/server.js > backend_server.log 2>&1 &
# Store the process ID (PID) of the background job.
SERVER_PID=$!

# Give the server a moment to initialize.
echo "Waiting for the server to start... (10 seconds)"
sleep 10

# Check the log file for the success message.
# The `grep` command will exit with a non-zero status if the text is not found.
if grep -q "O SERVIDOR ESTÁ TOTALMENTE OPERACIONAL" backend_server.log; then
  echo_success "Backend server started successfully and is operational."
else
  echo "❌ ERROR: The backend server failed to start."
  echo "--- Server Log (backend_server.log) ---"
  cat backend_server.log
  echo "------------------------------------"
  # Kill the failed server process before exiting.
  kill $SERVER_PID
  exit 1
fi

# Clean up by killing the server process.
echo "Shutting down the validation server..."
kill $SERVER_PID
rm backend_server.log
echo_success "Validation complete. The environment is set up correctly! 🎉"