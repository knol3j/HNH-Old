# HashNHedge GPU Mining Pool - Quick Setup Guide
## From Zero to Mining in 30 Minutes

This guide walks you through setting up a complete GPU mining infrastructure with FOSS backends and optional MiningCore pool.

---

## 🎯 What You'll Build

```
┌─────────────────────────────────────────────┐
│      HashNHedge Complete Stack              │
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │   Enhanced Miner GUI (Client Side)     │ │
│  │   - Multi-backend support              │ │
│  │   - Real-time monitoring               │ │
│  │   - Auto-switching                     │ │
│  └────────────────────────────────────────┘ │
│                    ↕                        │
│  ┌────────────────────────────────────────┐ │
│  │   Mining Pool (Server Side)            │ │
│  │   Option A: Custom Node.js Pool        │ │
│  │   Option B: MiningCore (Production)    │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## ⚡ Option 1: Quick Start (Custom Pool)

**Best for**: Testing, development, small-scale deployment

### Step 1: Setup Custom Pool (5 minutes)

```bash
# Navigate to hybrid pool directory
cd /home/user/HNH/hybrid-pool

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
STRATUM_PORT=3333
STRATUM_HOST=0.0.0.0
API_PORT=3334
NODE_ENV=production
POOL_FEE_MINING=0.03
POOL_FEE_AI=0.30
EOF

# Start the pool
npm start
```

Expected output:
```
✓ Stratum server listening on 0.0.0.0:3333
✓ API server listening on 0.0.0.0:3334
✓ Job orchestrator initialized
✓ Pool ready for connections
```

### Step 2: Setup Enhanced Miner (5 minutes)

```bash
# Navigate to mining engine
cd /home/user/HNH/mining-engine

# Install Python dependencies
pip install -r requirements.txt

# Download T-Rex (if not already present)
# Windows: Already included in /hybrid-pool/t-rex-0.26.8-win/
# Linux: Download from https://github.com/trexminer/T-Rex/releases

# Run enhanced GUI
python hnh_miner_gui_enhanced.py
```

### Step 3: Configure and Mine (2 minutes)

1. In the GUI:
   - Select backend: `t-rex`
   - Select algorithm: `ethash`
   - Enter wallet: `0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2`
   - Worker name: `test-rig-1`
   - Pool URL: `localhost:3333`
   - Click "Save Configuration"
   - Click "START MINING"

2. Verify:
   - Check hashrate appears in GUI
   - Check pool API: `curl http://localhost:3334/stats`

**Done!** You're mining with custom pool. 🎉

---

## 🏭 Option 2: Production Setup (MiningCore)

**Best for**: Production deployment, 50+ miners, need reliability

### Prerequisites

- Ubuntu 20.04+ or Windows Server
- 4GB+ RAM
- PostgreSQL 14+
- .NET 8.0 SDK

### Step 1: Install Dependencies (10 minutes)

#### On Ubuntu

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install .NET 8.0
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 8.0
export PATH=$PATH:$HOME/.dotnet

# Install Redis (optional caching)
sudo apt install redis-server -y

# Install Git
sudo apt install git -y
```

#### On Windows

```powershell
# Install via Chocolatey
choco install postgresql14 -y
choco install dotnet-8.0-sdk -y
choco install redis-64 -y
choco install git -y
```

### Step 2: Setup Database (5 minutes)

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE hashnhedge_pool;
CREATE USER pooluser WITH ENCRYPTED PASSWORD 'your-secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE hashnhedge_pool TO pooluser;

# Enable extensions
\c hashnhedge_pool
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

# Exit
\q
```

### Step 3: Install MiningCore (10 minutes)

```bash
# Clone MiningCore
cd /opt
sudo git clone https://github.com/coinfoundry/miningcore.git
cd miningcore/src/Miningcore

# Build
sudo dotnet publish -c Release --framework net8.0 -o ../../build

# The binaries are now in /opt/miningcore/build/
```

### Step 4: Configure Pool (5 minutes)

```bash
# Copy example config
cd /opt/miningcore/build
sudo cp /home/user/HNH/mining-engine/example_configs/miningcore_hnh.json ./config.json

# Edit config
sudo nano config.json

# Update these fields:
# - persistence.postgres.password: "your-secure-password-here"
# - pools[].address: Your wallet addresses
# - pools[].daemons[].host: Your blockchain node IPs
# - notifications.email: Your email settings
```

### Step 5: Setup Blockchain Nodes (15 minutes)

You need a full node for each coin you want to support.

#### Ethereum Classic (ETC)

```bash
# Install Core-Geth
wget https://github.com/etclabscore/core-geth/releases/download/v1.12.18/core-geth-linux-v1.12.18.zip
unzip core-geth-linux-v1.12.18.zip
sudo mv geth /usr/local/bin/geth-etc

# Create service
sudo tee /etc/systemd/system/etc-node.service > /dev/null << EOF
[Unit]
Description=Ethereum Classic Node
After=network.target

[Service]
Type=simple
User=pooluser
ExecStart=/usr/local/bin/geth-etc --classic --http --http.addr 127.0.0.1 --http.port 8545 --http.api eth,web3,net --syncmode snap
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable etc-node
sudo systemctl start etc-node

# Wait for sync (can take hours)
sudo journalctl -u etc-node -f
```

#### Ravencoin (RVN)

```bash
# Install Ravencoin daemon
wget https://github.com/RavenProject/Ravencoin/releases/download/v4.6.1/raven-4.6.1-x86_64-linux-gnu.tar.gz
tar -xzf raven-4.6.1-x86_64-linux-gnu.tar.gz
sudo cp raven-4.6.1/bin/* /usr/local/bin/

# Create config
mkdir -p ~/.raven
cat > ~/.raven/raven.conf << EOF
rpcuser=rpcuser
rpcpassword=your-rpc-password
rpcallowip=127.0.0.1
server=1
daemon=1
txindex=1
EOF

# Start daemon
ravend -daemon

# Wait for sync
raven-cli getblockchaininfo
```

### Step 6: Start MiningCore (2 minutes)

```bash
# Create systemd service
sudo tee /etc/systemd/system/miningcore.service > /dev/null << 'EOF'
[Unit]
Description=MiningCore Pool Server
After=network.target postgresql.service

[Service]
Type=simple
User=pooluser
WorkingDirectory=/opt/miningcore/build
ExecStart=/opt/miningcore/build/Miningcore -c /opt/miningcore/build/config.json
Restart=always
RestartSec=10

Environment="DOTNET_PRINT_TELEMETRY_MESSAGE=false"
Environment="ASPNETCORE_ENVIRONMENT=Production"

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable miningcore
sudo systemctl start miningcore

# Check status
sudo systemctl status miningcore

# View logs
sudo journalctl -u miningcore -f
```

### Step 7: Firewall Configuration (2 minutes)

```bash
# Allow mining ports
sudo ufw allow 3333/tcp comment 'ETC Mining Port'
sudo ufw allow 3334/tcp comment 'ETC High Diff Port'
sudo ufw allow 4333/tcp comment 'RVN Mining Port'
sudo ufw allow 4334/tcp comment 'RVN High Diff Port'

# Restrict API to localhost (recommended)
# Or allow from specific IP:
sudo ufw allow from YOUR_IP_ADDRESS to any port 4000

# Enable firewall
sudo ufw enable
```

### Step 8: Test Mining (5 minutes)

```bash
# Test with ethminer
ethminer -P stratum+tcp://0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2.test@localhost:3333

# Or use the enhanced GUI:
python hnh_miner_gui_enhanced.py
# Configure:
# - Backend: ethminer
# - Algorithm: ethash
# - Pool: your-server-ip:3333
# - Click START MINING
```

### Step 9: Monitor Pool (ongoing)

```bash
# Check pool stats via API
curl http://localhost:4000/api/pools

# Check specific pool
curl http://localhost:4000/api/pools/etc-hybrid/stats

# Check connected miners
curl http://localhost:4000/api/pools/etc-hybrid/miners

# Check payments
curl http://localhost:4000/api/pools/etc-hybrid/payments

# View logs
sudo tail -f /opt/miningcore/build/logs/pool-etc-hybrid*.log
```

---

## 🔄 Hybrid Setup (Best of Both)

Use custom pool for development + MiningCore for production:

```
Development Environment:
├── Custom Node.js Pool (localhost:3333)
├── Enhanced Miner GUI
└── Fast iteration on AI routing

Production Environment:
├── MiningCore Pool (vps-ip:3333)
├── Node.js Orchestrator (AI job routing)
└── Database bridge between systems
```

### Bridge Configuration

```javascript
// orchestrator/miningcore_bridge.js
const { Pool } = require('pg');

class MiningCoreBridge {
  constructor() {
    this.pool = new Pool({
      host: 'localhost',
      database: 'hashnhedge_pool',
      user: 'pooluser',
      password: 'your-password'
    });
  }

  async getActiveMiners() {
    const result = await this.pool.query(`
      SELECT DISTINCT miner, SUM(difficulty) as total_shares
      FROM shares
      WHERE created >= NOW() - INTERVAL '10 minutes'
      GROUP BY miner
      ORDER BY total_shares DESC
    `);
    return result.rows;
  }

  async shouldSwitchToAI(miner) {
    // Check if miner should be pulled from mining to AI job
    const stats = await this.getMinerStats(miner);
    const aiJob = await this.getAvailableAIJob();

    if (aiJob && aiJob.reward > stats.estimated_hourly_mining) {
      return aiJob;
    }
    return null;
  }
}

// Run orchestrator alongside MiningCore
const bridge = new MiningCoreBridge();
setInterval(async () => {
  const miners = await bridge.getActiveMiners();
  for (const miner of miners) {
    const aiJob = await bridge.shouldSwitchToAI(miner.miner);
    if (aiJob) {
      // Send switch command via custom Stratum extension
      await sendAIJobToMiner(miner.miner, aiJob);
    }
  }
}, 10000); // Check every 10 seconds
```

---

## 📊 Performance Benchmarks

### Expected Performance

| Setup | Latency | Throughput | Max Miners | CPU Usage | RAM Usage |
|-------|---------|-----------|-----------|-----------|-----------|
| **Custom Pool (Node.js)** | 5-10ms | 10K shares/sec | 50-100 | 20-30% | 512MB |
| **MiningCore (C#)** | 2-5ms | 100K shares/sec | 1000+ | 15-25% | 1GB |

### Optimization Tips

#### For Node.js Pool

```javascript
// Use cluster mode for multi-core
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  startPool();
}
```

#### For MiningCore

```json
{
  "pools": [{
    "blockRefreshInterval": 500,  // Reduce for lower latency
    "maxActiveJobs": 8            // Increase for better share validation
  }]
}
```

---

## 🐛 Common Issues

### Issue: "Failed to connect to database"

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U pooluser -d hashnhedge_pool

# Check pg_hba.conf allows local connections
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: local   all   pooluser   md5
```

### Issue: "Daemon not responding"

```bash
# Check blockchain node is synced
raven-cli getblockchaininfo
# or
geth attach http://localhost:8545
> eth.syncing

# Wait for sync to complete (can take hours/days)
```

### Issue: "No shares accepted"

```bash
# Check miner connection
telnet localhost 3333

# Check pool logs
sudo tail -f /opt/miningcore/build/logs/*.log

# Verify difficulty not too high
# Adjust in config.json:
"ports": {
  "3333": {
    "difficulty": 1000000000  # Lower = easier for testing
  }
}
```

---

## ✅ Verification Checklist

Before going live:

- [ ] Database connected and tables created
- [ ] Blockchain nodes synced
- [ ] MiningCore/Pool server running
- [ ] Firewall configured
- [ ] Test miner connected successfully
- [ ] Shares being accepted
- [ ] Pool stats API responding
- [ ] Payment processing enabled
- [ ] Backup wallet keys secured
- [ ] Monitoring alerts configured

---

## 🚀 Next Steps

1. **Day 1-3**: Get custom pool running, test with 1-2 miners
2. **Week 1**: Deploy MiningCore, connect 5-10 miners
3. **Week 2**: Add AI job routing, test hybrid workloads
4. **Week 3**: Open to public beta testers
5. **Week 4**: Production launch

---

## 📞 Support

- **Documentation**: `/home/user/HNH/docs/`
- **MiningCore Wiki**: https://github.com/coinfoundry/miningcore/wiki
- **Issues**: Create GitHub issue with logs attached

---

**You're ready to deploy!** 🎉

Choose your option:
- **Quick Start**: Custom pool, ready in 30 minutes
- **Production**: MiningCore, ready in 2 hours
- **Hybrid**: Best of both, ready in 3 hours
