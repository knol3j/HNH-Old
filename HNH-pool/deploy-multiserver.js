// Multi-Server HashNHedge Pool Deployment Script
const fs = require('fs');
const path = require('path');

// Server Configuration
const SERVERS = {
  onrender1: {
    ip: '35.160.120.126',
    port: 10000,
    name: 'OnRender Primary'
  },
  onrender2: {
    ip: '44.233.151.27',
    port: 10000,
    name: 'OnRender Secondary'
  },
  onrender3: {
    ip: '34.211.200.85',
    port: 10000,
    name: 'OnRender Tertiary'
  },
  onrender_range1: {
    ip: '74.220.48.0/24',
    port: 10000,
    name: 'OnRender Range 48'
  },
  onrender_range2: {
    ip: '74.220.56.0/24',
    port: 10000,
    name: 'OnRender Range 56'
  }
};

// Load Balancer Configuration
const LOAD_BALANCER_CONFIG = {
  strategy: 'round_robin', // round_robin, least_connections, geographic
  healthCheck: {
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    retries: 3
  },
  failover: {
    enabled: true,
    priority: ['onrender1', 'onrender2', 'onrender3', 'onrender_range1', 'onrender_range2']
  }
};

class MultiServerPoolManager {
  constructor() {
    this.servers = SERVERS;
    this.activeServers = new Map();
    this.currentServerIndex = 0;
    this.stats = {
      totalRequests: 0,
      serverRequests: {},
      errors: {}
    };

    // Initialize server stats
    Object.keys(this.servers).forEach(serverId => {
      this.stats.serverRequests[serverId] = 0;
      this.stats.errors[serverId] = 0;
    });
  }

  // Get next server using load balancing strategy
  getNextServer() {
    const activeServerIds = Array.from(this.activeServers.keys());

    if (activeServerIds.length === 0) {
      console.log('⚠️ No active servers available!');
      return null;
    }

    let serverId;
    switch (LOAD_BALANCER_CONFIG.strategy) {
      case 'round_robin':
        serverId = activeServerIds[this.currentServerIndex % activeServerIds.length];
        this.currentServerIndex++;
        break;

      case 'least_connections':
        serverId = activeServerIds.reduce((least, current) => {
          return this.stats.serverRequests[current] < this.stats.serverRequests[least]
            ? current : least;
        });
        break;

      default:
        serverId = activeServerIds[0];
    }

    this.stats.totalRequests++;
    this.stats.serverRequests[serverId]++;

    return {
      id: serverId,
      ...this.servers[serverId],
      url: `http://${this.servers[serverId].ip}:${this.servers[serverId].port}`
    };
  }

  // Health check for all servers
  async performHealthChecks() {
    console.log('🔍 Performing health checks...');

    for (const [serverId, serverConfig] of Object.entries(this.servers)) {
      try {
        const url = `http://${serverConfig.ip}:${serverConfig.port}/api/stats`;
        const response = await fetch(url, {
          timeout: LOAD_BALANCER_CONFIG.healthCheck.timeout
        });

        if (response.ok) {
          this.activeServers.set(serverId, {
            ...serverConfig,
            lastHealthCheck: Date.now(),
            status: 'healthy'
          });
          console.log(`✅ ${serverConfig.name} (${serverConfig.ip}) - Healthy`);
        } else {
          this.markServerUnhealthy(serverId, `HTTP ${response.status}`);
        }
      } catch (error) {
        this.markServerUnhealthy(serverId, error.message);
      }
    }

    console.log(`📊 Active servers: ${this.activeServers.size}/${Object.keys(this.servers).length}`);
  }

  markServerUnhealthy(serverId, reason) {
    this.activeServers.delete(serverId);
    this.stats.errors[serverId]++;
    console.log(`❌ ${this.servers[serverId].name} - Unhealthy: ${reason}`);
  }

  // Proxy request to available server
  async proxyRequest(path, options = {}) {
    const server = this.getNextServer();
    if (!server) {
      throw new Error('No healthy servers available');
    }

    try {
      const url = `${server.url}${path}`;
      console.log(`🔄 Proxying to ${server.name}: ${url}`);

      const response = await fetch(url, {
        ...options,
        timeout: 10000
      });

      return response;
    } catch (error) {
      this.markServerUnhealthy(server.id, error.message);

      // Retry with another server
      const retryServer = this.getNextServer();
      if (retryServer) {
        console.log(`🔄 Retrying with ${retryServer.name}`);
        const url = `${retryServer.url}${path}`;
        return await fetch(url, { ...options, timeout: 10000 });
      }

      throw error;
    }
  }

  // Start the load balancer
  async start() {
    console.log('🚀 Starting HashNHedge Multi-Server Pool Manager');
    console.log('='.repeat(50));

    // Initial health check
    await this.performHealthChecks();

    // Set up periodic health checks
    setInterval(() => {
      this.performHealthChecks();
    }, LOAD_BALANCER_CONFIG.healthCheck.interval);

    // Start load balancer server
    this.startLoadBalancerServer();
  }

  startLoadBalancerServer() {
    const express = require('express');
    const cors = require('cors');
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Load balancer info endpoint
    app.get('/lb/status', (req, res) => {
      res.json({
        loadBalancer: {
          strategy: LOAD_BALANCER_CONFIG.strategy,
          activeServers: Array.from(this.activeServers.keys()).map(id => ({
            id,
            ...this.servers[id],
            ...this.activeServers.get(id)
          })),
          stats: this.stats
        }
      });
    });

    // Proxy all API requests
    app.all('/api/*', async (req, res) => {
      try {
        const response = await this.proxyRequest(req.path, {
          method: req.method,
          headers: req.headers,
          body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.text();
        res.status(response.status).send(data);
      } catch (error) {
        console.error('❌ Proxy error:', error.message);
        res.status(503).json({
          error: 'Service temporarily unavailable',
          message: error.message
        });
      }
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        activeServers: this.activeServers.size,
        timestamp: new Date().toISOString()
      });
    });

    const PORT = 8081;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Load Balancer running on http://0.0.0.0:${PORT}`);
      console.log(`📊 Status: http://localhost:${PORT}/lb/status`);
      console.log(`💓 Health: http://localhost:${PORT}/health`);
    });
  }

  // Generate deployment scripts for each server
  generateDeploymentScripts() {
    const deploymentDir = './deployment';
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir);
    }

    // Docker Compose for multi-server deployment
    const dockerCompose = `version: '3.8'
services:`;

    Object.entries(this.servers).forEach(([serverId, config]) => {
      // Individual server deployment script
      const deployScript = `#!/bin/bash
# HashNHedge Pool Deployment Script for ${config.name}
echo "🚀 Deploying HashNHedge Pool to ${config.name} (${config.ip})"

# Install dependencies
npm install

# Set environment variables
export NODE_ENV=production
export PORT=${config.port}
export SERVER_ID=${serverId}
export SERVER_NAME="${config.name}"
export SERVER_IP=${config.ip}

# Start the pool server
echo "Starting HashNHedge Pool on ${config.ip}:${config.port}"
node pool_server_file.js
`;

      fs.writeFileSync(`${deploymentDir}/deploy-${serverId}.sh`, deployScript);
      fs.chmodSync(`${deploymentDir}/deploy-${serverId}.sh`, '755');
    });

    console.log(`📁 Deployment scripts generated in ./deployment/`);
  }
}

// Start the multi-server manager
if (require.main === module) {
  const manager = new MultiServerPoolManager();

  // Generate deployment scripts
  manager.generateDeploymentScripts();

  // Start load balancer
  manager.start().catch(console.error);
}

module.exports = MultiServerPoolManager;