# Dockerfile for Hardhat service
FROM node:18-alpine

WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy all package.json and package-lock.json files
COPY package.json ./
COPY package-lock.json ./
COPY backend/package.json ./backend/
COPY backend/package-lock.json ./backend/

# Install all dependencies
RUN npm install
RUN npm install --prefix backend

# Copy the rest of the application code
COPY . .

# Expose the Hardhat network port
EXPOSE 8545

# Copy the entrypoint script and make it executable
COPY docker/hardhat/entrypoint.sh /usr/local/bin/
# Fix CRLF line endings that can cause execution errors
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
