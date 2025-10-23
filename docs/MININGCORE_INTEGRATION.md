# MiningCore Integration Guide
## Production-Ready GPU Mining Pool Backend

MiningCore is a high-performance, multi-currency mining pool software written in C# (.NET Core). This guide covers integration with HashNHedge's hybrid AI/mining pool.

---

## 🎯 Why MiningCore?

| Feature | MiningCore | Custom Pool | Yiimp |
|---------|-----------|-------------|-------|
| **License** | MIT | MIT | GPL-3.0 |
| **Performance** | Excellent (C#) | Good (Node.js) | Good (PHP) |
| **Multi-Algo** | ✅ 15+ algos | ⚠️ Basic | ✅ 100+ algos |
| **Production Ready** | ✅ Yes | ❌ MVP only | ✅ Yes |
| **Customizable** | ✅ Full control | ✅ Full control | ⚠️ Limited |
| **Database** | PostgreSQL | Redis/Mongo | MySQL |
| **Stratum Support** | ✅ V1/V2 | ✅ V1 | ✅ V1 |
| **Payment Processing** | ✅ Built-in | ❌ Need to build | ✅ Built-in |
| **Share Validation** | ✅ Production-grade | ⚠️ Basic | ✅ Yes |

**Recommendation**: Use MiningCore for production, custom pool for rapid prototyping.

---

## 📦 Installation

### Prerequisites

1. **.NET 8.0 SDK**
```bash
# Linux (Ubuntu/Debian)
wget https://dot.net/v1/dotnet-install.sh
chmod +x dotnet-install.sh
./dotnet-install.sh --channel 8.0

# Windows
winget install Microsoft.DotNet.SDK.8

# macOS
brew install dotnet
```

2. **PostgreSQL 14+**
```bash
# Linux
sudo apt install postgresql postgresql-contrib

# Windows
choco install postgresql14

# macOS
brew install postgresql@14
```

3. **Redis (Optional - for caching)**
```bash
# Linux
sudo apt install redis-server

# Windows
choco install redis-64

# macOS
brew install redis
```

### Clone and Build MiningCore

```bash
# Clone repository
git clone https://github.com/coinfoundry/miningcore.git
cd miningcore/src/Miningcore

# Build
dotnet publish -c Release --framework net8.0 -o ../../build

# The compiled binaries are now in ./build/
```

---

## ⚙️ Configuration

### 1. Database Setup

Create PostgreSQL database and user:

```sql
-- Connect to PostgreSQL
sudo -u postgres psql

-- Create database and user
CREATE DATABASE hashnhedge_pool;
CREATE USER pooluser WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE hashnhedge_pool TO pooluser;

-- Enable required extensions
\c hashnhedge_pool
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

MiningCore auto-creates tables on first run.

### 2. Pool Configuration

Create `config.json`:

```json
{
  "logging": {
    "level": "info",
    "enableConsoleLog": true,
    "enableConsoleColors": true,
    "logFile": "logs/pool.log",
    "logBaseDirectory": "logs",
    "perPoolLogFile": true
  },

  "banning": {
    "manager": "integrated",
    "banOnJunkReceive": true,
    "banOnInvalidShares": true
  },

  "notifications": {
    "enabled": false,
    "email": {
      "host": "smtp.example.com",
      "port": 587,
      "user": "pool@hashnhedge.com",
      "password": "password",
      "fromAddress": "pool@hashnhedge.com",
      "fromName": "HashNHedge Pool"
    }
  },

  "persistence": {
    "postgres": {
      "host": "127.0.0.1",
      "port": 5432,
      "database": "hashnhedge_pool",
      "user": "pooluser",
      "password": "your-secure-password"
    }
  },

  "paymentProcessing": {
    "enabled": true,
    "interval": 300,
    "shareRecoveryFile": "recovered-shares.txt"
  },

  "api": {
    "enabled": true,
    "listenAddress": "0.0.0.0",
    "port": 4000,
    "rateLimiting": {
      "disabled": false,
      "rules": [
        {
          "endpoint": "*",
          "period": "1m",
          "limit": 60
        }
      ]
    }
  },

  "pools": [
    {
      "id": "etc-pool",
      "enabled": true,
      "coin": "etc",
      "address": "0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2",
      "rewardRecipients": [
        {
          "address": "0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2",
          "percentage": 0.03,
          "type": "dev"
        }
      ],

      "blockRefreshInterval": 1000,
      "jobRebroadcastTimeout": 10,
      "clientConnectionTimeout": 600,
      "banning": {
        "enabled": true,
        "time": 600,
        "invalidPercent": 50,
        "checkThreshold": 50
      },

      "ports": {
        "3333": {
          "difficulty": 4000000000,
          "varDiff": {
            "minDiff": 2000000000,
            "maxDiff": 100000000000,
            "targetTime": 15,
            "retargetTime": 90,
            "variancePercent": 30
          }
        },
        "3334": {
          "difficulty": 40000000000,
          "varDiff": {
            "minDiff": 20000000000,
            "maxDiff": 500000000000,
            "targetTime": 15,
            "retargetTime": 90,
            "variancePercent": 30
          }
        }
      },

      "daemons": [
        {
          "host": "127.0.0.1",
          "port": 8545,
          "http": true
        }
      ],

      "paymentProcessing": {
        "enabled": true,
        "minimumPayment": 0.01,
        "payoutScheme": "PPLNS",
        "payoutSchemeConfig": {
          "factor": 2.0
        }
      }
    },

    {
      "id": "rvn-pool",
      "enabled": true,
      "coin": "rvn",
      "address": "RNm4LMBGyfH8ddCGvncQKrMtxEydxwhUJL",
      "rewardRecipients": [
        {
          "address": "RNm4LMBGyfH8ddCGvncQKrMtxEydxwhUJL",
          "percentage": 0.03,
          "type": "dev"
        }
      ],

      "blockRefreshInterval": 1000,
      "jobRebroadcastTimeout": 10,
      "clientConnectionTimeout": 600,

      "ports": {
        "4333": {
          "difficulty": 0.05,
          "varDiff": {
            "minDiff": 0.01,
            "maxDiff": 100,
            "targetTime": 15,
            "retargetTime": 90,
            "variancePercent": 30
          }
        }
      },

      "daemons": [
        {
          "host": "127.0.0.1",
          "port": 8766,
          "user": "rpcuser",
          "password": "rpcpassword"
        }
      ],

      "paymentProcessing": {
        "enabled": true,
        "minimumPayment": 1.0,
        "payoutScheme": "PPLNS",
        "payoutSchemeConfig": {
          "factor": 2.0
        }
      }
    }
  ]
}
```

---

## 🚀 Running MiningCore

### Start the Pool

```bash
cd miningcore/build

# Linux/macOS
./Miningcore -c config.json

# Windows
Miningcore.exe -c config.json
```

### Using systemd (Linux Production)

Create `/etc/systemd/system/miningcore.service`:

```ini
[Unit]
Description=MiningCore Pool Server
After=network.target postgresql.service

[Service]
Type=simple
User=pooluser
WorkingDirectory=/opt/miningcore
ExecStart=/opt/miningcore/Miningcore -c /opt/miningcore/config.json
Restart=always
RestartSec=10

Environment="DOTNET_PRINT_TELEMETRY_MESSAGE=false"
Environment="ASPNETCORE_ENVIRONMENT=Production"

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable miningcore
sudo systemctl start miningcore
sudo systemctl status miningcore
```

---

## 🔗 HashNHedge Integration

### Architecture

```
┌─────────────────────────────────────────┐
│    HashNHedge Orchestrator (Node.js)    │
│  - AI job routing                       │
│  - Profitability switching              │
│  - Worker management                    │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
┌──────────────┐    ┌──────────────┐
│  MiningCore  │    │  AI Compute  │
│  (Mining)    │    │  (Custom)    │
│              │    │              │
│ - ETC Pool   │    │ - Inference  │
│ - RVN Pool   │    │ - Training   │
│ - Share Val  │    │              │
└──────────────┘    └──────────────┘
```

### Integration Points

#### 1. Share Monitoring via API

```javascript
// Monitor MiningCore shares and redirect to AI if needed
const axios = require('axios');

async function monitorPoolShares() {
  const response = await axios.get('http://localhost:4000/api/pools/etc-pool/miners');
  const miners = response.data;

  for (const miner of miners) {
    // Check if worker should switch to AI job
    const shouldSwitchToAI = await checkAIJobAvailability(miner.worker);

    if (shouldSwitchToAI) {
      // Send switch command to worker
      await sendSwitchCommand(miner.worker, 'ai_job');
    }
  }
}

setInterval(monitorPoolShares, 10000); // Every 10 seconds
```

#### 2. Custom Job Injection

Modify MiningCore to support custom job types:

```csharp
// In Miningcore/Stratum/StratumConnection.cs

public async Task SendAIJob(AIComputeJob job)
{
    // Send custom job to miner
    var notification = new JsonRpcRequest
    {
        Method = "ai.notify",
        Params = new object[]
        {
            job.Id,
            job.Task,
            job.Parameters,
            job.Reward
        }
    };

    await SendAsync(notification);
}
```

#### 3. Database Bridge

Share pool statistics with orchestrator:

```javascript
// PostgreSQL connection from Node.js orchestrator
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  database: 'hashnhedge_pool',
  user: 'pooluser',
  password: 'your-secure-password'
});

async function getPoolStats() {
  const result = await pool.query(`
    SELECT
      COUNT(DISTINCT miner) as total_miners,
      SUM(difficulty) as total_shares,
      AVG(networkdifficulty) as network_difficulty
    FROM shares
    WHERE created >= NOW() - INTERVAL '1 hour'
  `);

  return result.rows[0];
}
```

---

## 📊 API Endpoints

MiningCore provides REST API at `http://localhost:4000/api`

### Pool Statistics

```bash
# Get pool info
curl http://localhost:4000/api/pools

# Get pool stats
curl http://localhost:4000/api/pools/etc-pool/stats

# Get pool miners
curl http://localhost:4000/api/pools/etc-pool/miners

# Get miner stats
curl http://localhost:4000/api/pools/etc-pool/miners/0x0924EF9ecBcC1287047cAFd2EAD3A133313eE6A2

# Get pool blocks
curl http://localhost:4000/api/pools/etc-pool/blocks

# Get payments
curl http://localhost:4000/api/pools/etc-pool/payments
```

### Example Response - Pool Stats

```json
{
  "pool": {
    "id": "etc-pool",
    "coin": "etc",
    "ports": {
      "3333": {
        "difficulty": 4000000000
      }
    },
    "poolStats": {
      "connectedMiners": 42,
      "poolHashrate": 1250000000,
      "sharesPerSecond": 15.3,
      "blocksFound": 127,
      "lastPoolBlockTime": "2025-01-15T10:23:45Z",
      "networkHashrate": 85000000000000,
      "networkDifficulty": 425000000000000
    }
  }
}
```

---

## 🔄 Payment Processing

### Payment Schemes

MiningCore supports multiple payout schemes:

1. **PPLNS** (Pay Per Last N Shares) - Recommended
   - Most fair for long-term miners
   - Discourages pool hopping
   - Factor 2.0 = last 2x difficulty worth of shares

2. **PROP** (Proportional)
   - Simple percentage of block reward
   - Vulnerable to pool hopping

3. **SOLO**
   - Winner takes all
   - For large hashrate miners

### Manual Payment Trigger

```bash
# Trigger payment run
curl -X POST http://localhost:4000/api/pools/etc-pool/payments/process
```

### Payment Configuration

```json
{
  "paymentProcessing": {
    "enabled": true,
    "interval": 300,
    "minimumPayment": 0.01,
    "minimumPaymentToPaymentId": 0.001,
    "
": 5,
    "extraConfig": {
      "enableInternalPayouts": true,
      "gasPrice": null
    }
  }
}
```

---

## 🛡️ Security Best Practices

### 1. Firewall Configuration

```bash
# Allow only Stratum ports
sudo ufw allow 3333/tcp comment 'ETC Mining Port'
sudo ufw allow 4333/tcp comment 'RVN Mining Port'

# Restrict API to localhost or VPN
sudo ufw deny 4000/tcp
# Or allow specific IPs
sudo ufw allow from 10.0.0.0/24 to any port 4000
```

### 2. DDoS Protection

```json
{
  "banning": {
    "manager": "integrated",
    "banOnJunkReceive": true,
    "banOnInvalidShares": true
  },
  "api": {
    "rateLimiting": {
      "disabled": false,
      "rules": [
        {
          "endpoint": "*",
          "period": "1m",
          "limit": 60
        }
      ]
    }
  }
}
```

### 3. Database Security

```sql
-- Restrict pooluser permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO pooluser;
GRANT ALL ON ALL TABLES IN SCHEMA public TO pooluser;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO pooluser;

-- Enable SSL connections
ALTER SYSTEM SET ssl = 'on';
```

---

## 📈 Performance Tuning

### PostgreSQL Optimization

Edit `/etc/postgresql/14/main/postgresql.conf`:

```ini
# Memory settings (for 8GB RAM server)
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 32MB

# Connection settings
max_connections = 200

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

### MiningCore Performance

```json
{
  "clusterName": "hashnhedge-pool",
  "instanceId": "pool-01",

  "pools": [
    {
      "blockRefreshInterval": 1000,
      "jobRebroadcastTimeout": 10,
      "clientConnectionTimeout": 600,

      "maxActiveJobs": 16,
      "
Enabled": true
    }
  ]
}
```

---

## 🐛 Troubleshooting

### Pool Won't Start

**Error**: `Failed to connect to database`

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U pooluser -d hashnhedge_pool

# Check logs
tail -f logs/pool.log
```

### No Shares Accepted

**Error**: Miners connect but shares rejected

1. Check daemon connectivity:
```json
{
  "daemons": [
    {
      "host": "127.0.0.1",
      "port": 8545,
      "http": true
    }
  ]
}
```

2. Verify block template:
```bash
# Check daemon logs
tail -f /path/to/geth/logs

# Test RPC
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

### High CPU Usage

- Increase `blockRefreshInterval` from 1000ms to 2000ms
- Reduce `maxActiveJobs` from 16 to 8
- Enable database connection pooling

---

## 🔗 Resources

- **MiningCore GitHub**: https://github.com/coinfoundry/miningcore
- **Documentation**: https://github.com/coinfoundry/miningcore/wiki
- **Discord Community**: https://discord.gg/
- **HashNHedge Integration**: `/home/user/HNH/hybrid-pool/`

---

## ✅ Next Steps

1. ✅ Install MiningCore
2. ✅ Configure for ETC/RVN
3. ✅ Setup PostgreSQL
4. ✅ Start pool and test with miner
5. ⏳ Integrate with HashNHedge orchestrator
6. ⏳ Add custom AI job routing
7. ⏳ Deploy to production VPS

**Ready to integrate MiningCore with your hybrid pool!** 🚀
