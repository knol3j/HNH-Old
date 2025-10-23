# Mobile Proof Pool - HashNHedge

Battery-aware, mobile-optimized cryptocurrency mining pool with adaptive difficulty and thermal management.

## Features

- **Mobile-First Design**: Optimized for smartphones and tablets
- **Battery Awareness**: Automatically adjusts difficulty based on battery level
- **Thermal Management**: Monitors device temperature and throttles when needed
- **Device Tiering**: Classifies devices (Flagship, High-End, Mid-Range, Low-End)
- **Progressive Mining**: Non-blocking proof generation for smooth UI
- **Real-time Dashboard**: Live hashrate monitoring and statistics
- **Stratum Protocol**: Standard mining protocol support
- **WebSocket API**: Real-time updates for connected clients
- **Docker Support**: Easy deployment with Docker Compose

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start the pool server
npm start
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f pool-server

# Stop services
docker-compose down
```

## Architecture

```
mobile-proof-pool/
├── lib/
│   └── mobile-proof-algorithm.js   # Core PoW algorithm
├── src/
│   └── mobile-pool-server.js       # Pool server (Stratum + WebSocket)
├── mobile-sdk/
│   └── mobile-miner-sdk.js         # Client SDK for miners
├── dashboard/
│   └── index.html                  # Real-time monitoring dashboard
├── docker-compose.yml              # Docker orchestration
└── Dockerfile                      # Container definition
```

## Mining with SDK

### Web Browser

```html
<script src="mobile-sdk/mobile-miner-sdk.js"></script>
<script>
  const miner = new MobileMinerSDK({
    poolUrl: 'ws://your-pool.com:8081',
    address: 'your_wallet_address',
    autoStart: true,
    batteryThreshold: 20
  });

  miner.on('Connect', () => console.log('Connected!'));
  miner.on('ShareAccepted', () => console.log('Share accepted!'));

  await miner.initialize();
</script>
```

### React Native

```javascript
import MobileMinerSDK from './mobile-sdk/mobile-miner-sdk';

const miner = new MobileMinerSDK({
  poolUrl: 'ws://your-pool.com:8081',
  address: 'your_wallet_address',
  batteryThreshold: 30
});

await miner.initialize();
await miner.startMining();

// Get stats
const stats = miner.getStats();
console.log('Hashrate:', stats.hashrate);
console.log('Shares:', stats.shares);
```

## API Endpoints

### GET /api/stats
Get pool statistics

```json
{
  "success": true,
  "data": {
    "totalHashrate": 1500000,
    "activeMiners": 42,
    "totalShares": 1234,
    "validShares": 1200,
    "invalidShares": 34,
    "blocksFound": 3,
    "difficulty": 4,
    "miners": [...]
  }
}
```

### GET /api/miner/:address
Get miner-specific statistics

### GET /api/blocks
Get recent blocks found

### POST /api/payout/:address
Request payout for a miner

## Dashboard

Access the real-time dashboard at `http://localhost:8080/dashboard`

Features:
- Live hashrate monitoring
- Active miners table with device tiers
- Block discovery notifications
- Share accuracy tracking
- Device tier distribution charts

## Configuration

### Algorithm Parameters

```javascript
const algorithm = new MobileProofAlgorithm({
  memorySize: 32 * 1024 * 1024,  // 32MB
  targetTime: 5000,               // 5 seconds
  batteryThreshold: 30,           // 30%
  thermalThrottleTemp: 45,        // 45°C
  thermalStopTemp: 50             // 50°C
});
```

### Device Tiers

| Tier | Cores | RAM | Difficulty Multiplier |
|------|-------|-----|----------------------|
| Flagship | 8+ | 8GB+ | 1.5x |
| High-End | 6+ | 6GB+ | 1.2x |
| Mid-Range | 4+ | 4GB+ | 1.0x |
| Low-End | 2+ | 2GB+ | 0.7x |

## Performance

- Memory usage: ~32MB per mining instance
- Target block time: 5 seconds
- Hashrate estimates:
  - Flagship devices: ~500 KH/s
  - High-end devices: ~300 KH/s
  - Mid-range devices: ~150 KH/s
  - Low-end devices: ~50 KH/s

## Integration with HashNHedge

This pool integrates seamlessly with the main HashNHedge platform:

1. ARMgeddon mobile app uses the SDK for mining
2. Pool connects to Solana network for HNH token rewards
3. Dashboard accessible from main HashNHedge site
4. Revenue sharing with 70% to miners, 30% to pool/platform

## Security

- Rate limiting on API endpoints
- Share validation to prevent cheating
- DDoS protection via connection limits
- Secure WebSocket connections (wss://)
- Environment variable configuration for secrets

## Monitoring

Access monitoring tools:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` (default: admin/admin)

## License

MIT License - see LICENSE file

## Support

- Email: nolij@ik.me
- GitHub: https://github.com/knol3j/HNH
- Discord: https://discord.gg/hashnhedge
