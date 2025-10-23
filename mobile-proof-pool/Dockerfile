FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data and logs directories
RUN mkdir -p /app/data /app/logs

# Expose ports
EXPOSE 3333 8080 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/stats', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start the server
CMD ["node", "src/mobile-pool-server.js"]
