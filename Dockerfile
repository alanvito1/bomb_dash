# Use a modern Node.js LTS version that includes build tools and browsers for Playwright.
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Set the working directory in the container.
WORKDIR /app

# --- Corrected Build Order ---

# 1. Copy all package manifests first to leverage Docker layer caching.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/

# 2. Copy the entire application source code.
# This ensures that scripts like `install:all` have access to all necessary files.
COPY . .

# 3. Now, with all files in place, install all dependencies.
RUN npm run install:all

# 4. Install Playwright's browser dependencies to be certain.
# The base image is good, but this guarantees all system libs are linked.
RUN npx playwright install --with-deps

# --- Entrypoint Configuration ---

# Copy the entrypoint script that orchestrates the test run.
COPY e2e-entrypoint.sh .

# Make the entrypoint script executable.
RUN chmod +x e2e-entrypoint.sh

# The ENTRYPOINT is the main command that will be executed when the container starts.
# It will run our custom script to start servers and run tests.
ENTRYPOINT ["./e2e-entrypoint.sh"]

# Expose the ports for the Vite frontend and the Node.js backend.
# This makes them accessible from the host machine for debugging.
EXPOSE 5173 3000