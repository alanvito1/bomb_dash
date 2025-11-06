# Dockerfile for backend service
FROM node:18-alpine

WORKDIR /app

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

# Expose the backend port
EXPOSE 3000

# Start the backend server
CMD ["npm", "run", "start:backend"]
