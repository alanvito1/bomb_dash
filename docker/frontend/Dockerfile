# Dockerfile for frontend service
FROM node:18-alpine

WORKDIR /app

# Copy all package.json and package-lock.json files
COPY package.json ./
COPY package-lock.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the frontend port
EXPOSE 5173

# Start the frontend server
CMD ["npm", "run", "dev"]
