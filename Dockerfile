# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy backend package.json and package-lock.json
COPY backend/package.json backend/package-lock.json ./

# Install backend dependencies
RUN npm install

# Copy the rest of the backend source code
COPY backend/ ./

# Stage 2: Production stage
FROM node:18-alpine

WORKDIR /app

# Copy dependencies from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the application code from the builder stage
COPY --from=builder /app/ ./

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD ["node", "server.js"]