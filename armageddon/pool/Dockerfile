# PhoneProof Pool Docker Configuration for OnRender
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S phoneproof -u 1001

# Create data directory
RUN mkdir -p /app/data && chown phoneproof:nodejs /app/data

# Switch to non-root user
USER phoneproof

# Expose ports
EXPOSE 10000 10001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:10000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the PhoneProof pool
CMD ["npm", "run", "start:phoneproof"]