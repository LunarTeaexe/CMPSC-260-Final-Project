# Use Node.js base image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create directory for data files
RUN mkdir -p /app/data

# Expose the port our app runs on
EXPOSE 5000

# Start the application
CMD ["npm", "start"]