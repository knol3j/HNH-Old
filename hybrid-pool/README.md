# HashNHedge Hybrid Pool

**Dual-purpose GPU compute pool: AI/ML jobs (priority) + Mining (fallback)**

## Architecture

```
┌─────────────────────────────────────────┐
│         Job Orchestrator (Brain)        │
│  - Manages worker assignments           │
│  - Priority: AI jobs > Mining jobs      │
│  - Prevents job thrashing               │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
┌───────────────┐   ┌──────────────────┐
│   AI Jobs     │   │  Mining Fallback │
│  (30% fee)    │   │    (3% fee)      │
│               │   │                  │
│ - Inference   │   │ - Ethash         │
│ - Training    │   │ - KawPow         │
│ - Rendering   │   │ - Auto-switch    │
└───────────────┘   └──────────────────┘
        ↑                   ↑
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        │  Stratum Server   │
        │  (Port 3333)      │
        └───────────────────┘
                  ↑
        ┌─────────┴─────────┐
        │   GPU Workers     │
        │  (Miners/Compute) │
        └───────────────────┘
```

## Features

### ✅ Smart Job Routing
- **AI jobs get priority** (high margin: 30% fee)
- **Mining when idle** (low margin: 3% fee)
- **Prevents thrashing** (limits job switches per hour)
- **Capability matching** (routes jobs to compatible GPUs)

### ✅ Stratum Protocol
- Standard mining.subscribe/authorize/submit
- Compatible with existing miners
- Custom ai.job extension for AI tasks

### ✅ Revenue Optimization
- AI compute: 30% fee → ~10x mining revenue
- Mining fallback: 3% fee → baseline revenue
- Auto-selects most profitable work

## Quick Start

### 1. Install
```bash
cd hybrid-pool
npm install
```

### 2. Test Orchestrator (No Stratum)
```bash
npm test
```

### 3. Run Full Pool
```bash
npm start
```

### 4. Connect a Miner
```bash
# Example with T-Rex miner
t-rex -a ethash -o stratum+tcp://localhost:3333 -u YOUR_WALLET.worker1 -p x
```

## API Endpoints

### Get Stats
```bash
curl http://localhost:3334/stats
```

**Response:**
```json
{
  "workers": {
    "total": 5,
    "ai": 3,
    "mining": 2,
    "idle": 0
  },
  "jobs": {
    "aiQueue": 2,
    "miningQueue": 1,
    "aiCompleted": 47,
    "miningCompleted": 120
  },
  "revenue": {
    "ai": 245.50,
    "mining": 12.30,
    "total": 257.80
  }
}
```

### Add AI Job
```bash
curl -X POST http://localhost:3334/ai-job \
  -H "Content-Type: application/json" \
  -d '{
    "task": "inference",
    "model": "llama-3-8b",
    "requirements": {
      "minVRAM": 8,
      "capabilities": ["cuda"]
    },
    "reward": 0.50,
    "priority": 9
  }'
```

## Configuration

**Environment Variables:**
```bash
STRATUM_PORT=3333          # Stratum server port
STRATUM_HOST=0.0.0.0       # Stratum bind address
API_PORT=3334              # HTTP API port
NODE_ENV=development       # Enable test mode
```

**Config Object:**
```javascript
const pool = new HybridPool({
  // Orchestrator
  aiJobCheckInterval: 5000,      // Check for AI jobs every 5s
  miningFallbackDelay: 10000,    // Wait 10s before mining
  maxJobSwitchPerHour: 12,       // Limit switching overhead

  // Fees
  poolFee: {
    ai: 0.30,      // 30% for AI jobs
    mining: 0.03   // 3% for mining
  },

  // Stratum
  stratum: {
    port: 3333,
    host: '0.0.0.0'
  }
});
```

## How It Works

### Worker Registration
1. Miner connects via Stratum
2. Sends `mining.subscribe` + `mining.authorize`
3. Orchestrator registers worker with GPU info
4. Job immediately assigned

### Job Assignment Priority
```
IF (AI job available AND worker capable)
  → Assign AI job (30% fee)
ELSE IF (mining job available)
  → Assign mining job (3% fee)
ELSE
  → Worker idle, wait for job
```

### Job Switching
- **AI job arrives** → Pull worker from mining immediately
- **AI job completes** → Return to mining
- **Rate limited** → Max 12 switches/hour to prevent thrashing

### Revenue Distribution
```
AI Job:    $10 revenue → $3 to pool (30%) → $7 to worker
Mining:    $10 revenue → $0.30 to pool (3%) → $9.70 to worker
```

## Development Roadmap

### Phase 1: Core (Current)
- [x] Job orchestrator
- [x] Stratum protocol
- [x] Basic routing logic
- [x] Mining fallback

### Phase 2: Production
- [ ] Share validation (real hash checking)
- [ ] Payment processor
- [ ] Database (Redis/MongoDB)
- [ ] Multi-algorithm support

### Phase 3: AI Integration
- [ ] AI job queue API
- [ ] Model serving integration
- [ ] GPU capability detection
- [ ] Advanced routing (profitability-based)

### Phase 4: Scale
- [ ] Load balancer
- [ ] Multi-server support
- [ ] Advanced monitoring
- [ ] Auto-scaling

## Comparison: Forked vs Custom

| Feature | Foundation v2 (Fork) | Custom (This) |
|---------|---------------------|---------------|
| **Development Time** | 3-4 weeks | 1-2 weeks |
| **Code Ownership** | GPL (must open-source) | MIT (your choice) |
| **Modularity** | 9/10 | 10/10 |
| **Learning Curve** | Medium (existing codebase) | Low (built from scratch) |
| **Production Ready** | ✅ Yes (battle-tested) | ⚠️ Needs hardening |
| **AI Routing** | Requires modification | ✅ Built-in |
| **Multi-coin** | ✅ Yes | ⚠️ Basic (ethash/kawpow) |

**Recommendation:**
- Use **Custom** for MVP and testing (faster)
- Switch to **Foundation v2** for production scale

## Testing Strategy

### Local Testing (This Weekend)
1. Run `npm test` → Verify orchestrator logic
2. Run `npm start` → Start full pool
3. Connect your RTX 4060 → Validate Stratum protocol
4. Simulate AI jobs → Test job switching

### Production Testing (Next Week)
1. Deploy to DigitalOcean ($10/month)
2. Connect 5-10 external miners
3. Monitor job routing
4. Optimize based on real data

## Next Steps

**Immediate (Today):**
1. ✅ Review this code
2. ⏳ Run `npm test` to verify orchestrator
3. ⏳ Connect your laptop to test Stratum

**This Weekend:**
1. Add real share validation
2. Implement payment tracking
3. Deploy to VPS

**Next Week:**
1. Recruit beta miners (Reddit/Discord)
2. Add AI job integration
3. Measure real profitability

## License

MIT - Full code ownership, modify as needed

---

**Built for HashNHedge** | Making GPU compute profitable 🚀
