#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Cleanup Function ---
# This function will be called on script exit to ensure all background
# processes are terminated, preventing orphaned processes.
cleanup() {
    echo "Shutting down servers..."
    # Kill all processes in the same process group.
    kill $(jobs -p)
}

# Register the cleanup function to be called on the EXIT signal.
trap cleanup EXIT

# --- Server Startup ---
echo "Starting backend server in the background..."
npm run start:backend:test &

echo "Starting frontend server in the background..."
# We use --host to ensure Vite is accessible from outside the container if needed.
npm run dev -- --host &

# --- Wait for Servers ---
# Use wait-on to pause the script until both servers are responding.
# This is crucial for preventing race conditions in the tests.
echo "Waiting for servers to be ready..."
npx wait-on http://localhost:3000 http://localhost:5173

echo "Servers are ready! Starting Playwright tests..."

# --- Run Tests ---
# Execute the Playwright test suite.
npx playwright test

# The 'trap cleanup EXIT' will handle shutting down the servers
# automatically when this command finishes.
echo "Tests finished. Shutting down."