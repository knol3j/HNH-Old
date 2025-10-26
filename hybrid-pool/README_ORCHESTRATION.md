# HashNHedge Enhanced Orchestration Layer

## 🚀 Quick Start

The Enhanced Orchestration Layer provides **fully autonomous, zero-intervention** job distribution for HashNHedge. It seamlessly handles AI/ML job availability without any manual input.

### Basic Usage

```javascript
const EnhancedHybridPool = require('./hybrid-pool/index-enhanced');

const pool = new EnhancedHybridPool({
    stratum: {
        port: 3333,
        host: '0.0.0.0'
    }
});

await pool.start();
```

### With External Job Sources

```javascript
const pool = new EnhancedHybridPool({
    externalAPIs: [
        {
            name: 'my-marketplace',
            url: 'https://api.mymarketplace.com/jobs',
            method: 'GET',
            headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
        }
    ]
});

await pool.start();
```

## 🎯 Key Benefits

### ✅ Before (Basic Orchestrator)
- ❌ Manual job submission required
- ❌ No automatic failure recovery
- ❌ Simple first-match job assignment
- ❌ Manual intervention needed for stuck workers
- ❌ Failed jobs require manual retry

### ✅ After (Enhanced Orchestrator)
- ✅ **Automatic job discovery** from multiple sources
- ✅ **Self-healing** worker recovery
- ✅ **Intelligent job matching** based on worker health and capabilities
- ✅ **Automatic retry** with exponential backoff
- ✅ **Zero user intervention** required

## 📊 Architecture Comparison

### Basic Orchestrator
```
Jobs (manual submission)
  ↓
Simple Queue (FIFO)
  ↓
First Available Worker
  ↓
If fails → Manual intervention
```

### Enhanced Orchestrator
```
Multiple Job Sources (APIs, DB, Webhooks)
  ↓
Autonomous Discovery + Circuit Breakers
  ↓
Intelligent Queue (priority-based, scored)
  ↓
Health-Checked Workers (auto-recovery)
  ↓
Smart Job Matching (capability + performance)
  ↓
If fails → Automatic Retry (exponential backoff)
  ↓
If retry fails → Dead Letter Queue
```

## 🔧 Components

### 1. **Autonomous Job Discovery**
- Polls external marketplace APIs
- Queries local database
- Receives real-time webhooks
- Circuit breaker protection

**File:** `autonomous-job-discovery.js`

### 2. **Worker Health Monitor**
- Continuous health monitoring (0-100 score)
- Automatic failure detection
- Self-healing recovery (3 attempts)
- Performance tracking

**File:** `worker-health-monitor.js`

### 3. **Intelligent Job Retry**
- Exponential backoff retry
- Dead letter queue
- Failure pattern analysis
- Priority boosting

**File:** `intelligent-job-retry.js`

### 4. **Enhanced Orchestrator**
- Score-based job matching
- Intelligent load balancing
- Mining → AI preemption
- Event-driven integration

**File:** `enhanced-orchestrator.js`

## 📖 Documentation

- **[Complete Documentation](./ENHANCED_ORCHESTRATION.md)** - Full feature documentation
- **[Configuration Example](./config.example.js)** - Copy and customize
- **[Migration Guide](./ENHANCED_ORCHESTRATION.md#migration-guide)** - Upgrade from basic orchestrator

## 💡 Common Use Cases

### Use Case 1: Automatic Job Discovery from Marketplace

```javascript
const pool = new EnhancedHybridPool({
    orchestrator: {
        jobDiscovery: {
            enableExternalAPIs: true,
            externalAPIs: [
                {
                    name: 'render-marketplace',
                    url: 'https://api.render.com/v1/compute/jobs',
                    method: 'GET',
                    headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
                    timeout: 10000
                }
            ],
            apiPollInterval: 15000  // Poll every 15 seconds
        }
    }
});

await pool.start();
// Jobs are now automatically discovered and assigned!
```

### Use Case 2: Real-Time Job Submission via Webhook

```javascript
const pool = new EnhancedHybridPool({
    orchestrator: {
        jobDiscovery: {
            enableWebhooks: true,
            webhookPort: 3335
        }
    }
});

await pool.start();

// Submit jobs via HTTP POST to port 3335
// curl -X POST http://localhost:3335 -H "Content-Type: application/json" \
//   -d '{"id": "job_123", "type": "ai", "task": "inference", "reward": 1.5}'
```

### Use Case 3: Database Job Polling

```javascript
const pool = new EnhancedHybridPool({
    orchestrator: {
        jobDiscovery: {
            enableDatabasePolling: true,
            dbPollInterval: 10000  // Poll every 10 seconds
        }
    }
});

// Setup database integration
pool.orchestrator.jobDiscovery.on('database:poll', async (callback) => {
    const jobs = await prisma.job.findMany({
        where: { status: 'PENDING' }
    });
    callback(jobs);
});

await pool.start();
```

### Use Case 4: Monitoring Worker Health

```javascript
const pool = new EnhancedHybridPool({
    orchestrator: {
        healthMonitoring: {
            enableAutoRecovery: true,
            maxRecoveryAttempts: 3,
            heartbeatTimeout: 90000  // 90 seconds
        }
    }
});

// Monitor health events
pool.orchestrator.on('worker:failing', ({ workerId, reason }) => {
    console.log(`⚠️  Worker ${workerId} is failing: ${reason}`);
    // Send alert to admin
});

pool.orchestrator.on('worker:recovered', ({ workerId }) => {
    console.log(`✅ Worker ${workerId} has recovered!`);
});

await pool.start();
```

### Use Case 5: Automatic Job Retry

```javascript
const pool = new EnhancedHybridPool({
    orchestrator: {
        jobRetry: {
            maxRetries: 3,
            retryStrategy: 'exponential',
            initialBackoff: 5000,    // 5 seconds
            maxBackoff: 300000,      // 5 minutes
            dlqEnabled: true         // Enable dead letter queue
        }
    }
});

// Monitor retry events
pool.orchestrator.retrySystem.on('job:retry_scheduled', ({ jobId, attempts, delay }) => {
    console.log(`🔄 Retry scheduled for ${jobId}: attempt ${attempts}, delay ${delay}ms`);
});

pool.orchestrator.retrySystem.on('job:dlq', ({ jobId, reason }) => {
    console.log(`📮 Job ${jobId} moved to DLQ: ${reason}`);
    // Alert admin for manual review
});

await pool.start();
```

## 📈 Monitoring & Metrics

### Get Comprehensive Stats

```javascript
const stats = pool.getStats();

console.log('Orchestrator Stats:', stats.orchestrator);
console.log('Health Stats:', stats.health);
console.log('Retry Stats:', stats.retry);
console.log('Discovery Stats:', stats.discovery);
```

### Example Stats Output

```javascript
{
    orchestrator: {
        workers: { total: 10, ai: 7, mining: 2, idle: 1 },
        jobs: { aiQueue: 5, miningQueue: 2, active: 9 },
        revenue: { ai: 150.50, mining: 5.25, total: 155.75 }
    },
    health: {
        healthyWorkers: 8,
        degradedWorkers: 1,
        failingWorkers: 1,
        avgHealthScore: 75.5,
        successfulRecoveries: 3,
        totalRecoveries: 4
    },
    retry: {
        activeRetries: 2,
        retrySuccessRate: 0.85,
        jobsInDLQ: 1
    },
    discovery: {
        totalDiscovered: 100,
        totalImported: 95,
        activeJobs: 12
    }
}
```

## ⚙️ Configuration

### Minimal Configuration

```javascript
const pool = new EnhancedHybridPool();
await pool.start();
// Uses all defaults, no external sources
```

### Production Configuration

```javascript
const pool = new EnhancedHybridPool({
    stratum: {
        port: 3333,
        host: '0.0.0.0'
    },

    orchestrator: {
        // Enable all features
        enableIntelligentRouting: true,
        enablePreemption: true,

        jobDiscovery: {
            enableExternalAPIs: true,
            enableDatabasePolling: true,
            enableWebhooks: true,
            externalAPIs: [/* your APIs */]
        },

        healthMonitoring: {
            enableAutoRecovery: true,
            maxRecoveryAttempts: 3
        },

        jobRetry: {
            maxRetries: 3,
            dlqEnabled: true
        }
    }
});

await pool.start();
```

See [`config.example.js`](./config.example.js) for full configuration options.

## 🔄 Migration from Basic Orchestrator

### Step 1: Update Imports

```javascript
// Before
const HybridPool = require('./hybrid-pool/index');

// After
const EnhancedHybridPool = require('./hybrid-pool/index-enhanced');
```

### Step 2: Update Configuration

```javascript
// Before
const pool = new HybridPool({
    stratum: { port: 3333 }
});

// After
const pool = new EnhancedHybridPool({
    stratum: { port: 3333 },
    // Add enhanced features as needed
});
```

### Step 3: Setup Integrations (Optional)

```javascript
// Database integration
pool.orchestrator.jobDiscovery.on('database:poll', async (callback) => {
    const jobs = await fetchJobs();
    callback(jobs);
});

// Event monitoring
pool.orchestrator.on('worker:failing', handleFailure);
```

## 🧪 Testing

### Development Mode

```bash
NODE_ENV=development node hybrid-pool/index-enhanced.js
```

This enables:
- Simulated AI jobs for testing
- Verbose logging
- Test webhook submissions

### Webhook Testing

```bash
# Submit test job
curl -X POST http://localhost:3335 \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_job_1",
    "type": "ai",
    "task": "inference",
    "requirements": {"minVRAM": 8},
    "reward": 1.5,
    "priority": 8
  }'
```

## 🛠️ Troubleshooting

### Workers Not Getting Jobs

```javascript
// Check worker health
const health = pool.orchestrator.healthMonitor.getWorkerHealth(workerId);
console.log('Worker Health:', health);

// Check job queue
console.log('AI Jobs:', pool.orchestrator.aiJobQueue.length);
console.log('Mining Jobs:', pool.orchestrator.miningJobs.length);
```

### Jobs Stuck in Retry

```javascript
// Check retry queue
const retryQueue = pool.orchestrator.retrySystem.getRetryQueue();
console.log('Retrying Jobs:', retryQueue);

// Check dead letter queue
const dlq = pool.orchestrator.retrySystem.getDLQ();
console.log('Failed Jobs:', dlq);
```

### Circuit Breakers Opening

```javascript
// Monitor circuit breaker events
pool.orchestrator.jobDiscovery.on('circuit:opened', ({ source, error }) => {
    console.log(`Circuit opened for ${source}: ${error.message}`);
});

// Check circuit breaker status
const stats = pool.orchestrator.jobDiscovery.getStats();
console.log('Circuit Breakers:', stats.circuitBreakers);
```

## 📚 Further Reading

- **[Complete Documentation](./ENHANCED_ORCHESTRATION.md)** - Detailed features and API
- **[Configuration Reference](./config.example.js)** - All configuration options
- **[Architecture Overview](./ENHANCED_ORCHESTRATION.md#architecture)** - System design

## 🤝 Contributing

Contributions welcome! Please read the main project contributing guidelines.

## 📝 License

Same as parent project (HashNHedge)
