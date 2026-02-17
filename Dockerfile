# Use a lightweight Node.js image suitable for production
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files (root and backend)
COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/

# Remove local "file:.." dependency from backend/package.json
# This allows installing backend dependencies without needing the root package as a dependency
RUN cd backend && sed -i '/"app": "file:.."/d' package.json

# Install dependencies in the backend directory
# We only need production dependencies for running the server
RUN cd backend && npm install --production

# Copy source code
COPY . .

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080

# Start the backend server
CMD ["node", "backend/server.js"]
