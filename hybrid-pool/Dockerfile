# HashNHedge Hybrid Mining Pool - Production Dockerfile
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create data directories
RUN mkdir -p /app/data/pool /app/data/workers /app/data/jobs

# Health check (uses PORT env var, defaults to 10000 on Render)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3334}/health || exit 1

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose Stratum port and Admin API port
# Note: On Render, the PORT env var is automatically set to 10000
EXPOSE 3333 ${PORT:-3334}

CMD ["node", "index.js"]
