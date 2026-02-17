# Use a lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Remove local "file:.." dependency which is an artifact of the local monorepo structure
# and not needed for the standalone production backend.
RUN sed -i '/"app": "file:.."/d' package.json

# Install dependencies
# Using npm install instead of ci because we modified package.json
RUN npm install --production

# Copy source code
COPY . .

# Cloud Run injects PORT environment variable
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
