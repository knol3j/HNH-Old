# ARMgeddon PhoneProof Mining Pool

## Overview

The PhoneProof Mining Pool is a specialized mining pool designed specifically for mobile devices using the revolutionary PhoneProof algorithm. This pool is optimized for battery-friendly mining operations on ARM processors.

## Features

- **Battery-Optimized Mining**: Smart power management prevents battery drain
- **Thermal Protection**: Automatic mining stops when device temperature is too high
- **Cross-Platform Support**: Works on Android and iOS devices
- **Real-Time WebSocket Updates**: Live statistics and notifications
- **Mobile-First Algorithm**: PhoneProof algorithm designed for ARM processors
- **Low Pool Fee**: Only 1.5% fee for mobile miners
- **Fast Payouts**: Hourly payout system with 5 HNH minimum

## Algorithm Specifications

### PhoneProof Algorithm
- **Target Block Time**: 30 seconds (mobile-friendly)
- **Difficulty Adjustment**: Every 2 minutes
- **Base Difficulty**: 0x0000ffff (lower for mobile devices)
- **Hash Function**: SHA-256 with mobile optimizations
- **Reward per Share**: 0.05 HNH (with bonuses)

### Mobile Optimizations
- **Battery Threshold**: Minimum 20% battery to mine
- **Thermal Threshold**: Maximum 40°C device temperature
- **Mining Duration Limit**: 5 minutes continuous mining
- **Cooldown Period**: 1 minute break after max duration
- **Performance Scaling**: Adjusts based on device capabilities

## Quick Start

### Prerequisites
- Node.js 16.0.0 or higher
- npm 8.0.0 or higher

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Pool Server**
   ```bash
   # Development mode
   npm run dev:phoneproof

   # Production mode
   npm run start:phoneproof

   # Windows batch file
   start-phoneproof-pool.bat
   ```

3. **Access Dashboard**
   - Open browser to: `http://localhost:3003`
   - Dashboard: `phoneproof-dashboard.html`
   - WebSocket: `ws://localhost:3004`

### Pool Configuration

The pool can be configured via environment variables:

```bash
PORT=3003                    # API server port
WS_PORT=3004                # WebSocket server port
POOL_NAME="PhoneProof Pool" # Pool display name
ALGORITHM="PhoneProof"      # Mining algorithm
NODE_ENV=production         # Environment mode
```

## API Endpoints

### Pool Information
- **GET** `/api/pool-info` - Get pool details and configuration
- **GET** `/api/stats` - Get real-time pool statistics
- **GET** `/health` - Health check endpoint

### Miner Operations
- **POST** `/api/miner/register` - Register a new mobile miner
- **POST** `/api/miner/job` - Request mining job
- **POST** `/api/miner/submit` - Submit completed work/share

### Statistics & Leaderboard
- **GET** `/api/leaderboard` - Get top miners leaderboard
- **GET** `/api/miner/:minerId/stats` - Get individual miner statistics

## Mobile Client Integration

### JavaScript Client

```javascript
// Initialize PhoneProof miner
const miner = new PhoneProofMiner({
    poolUrl: 'http://localhost:3003',
    walletAddress: 'YOUR_SOLANA_WALLET_ADDRESS',
    workerName: 'my_phone_miner'
});

// Start mining
await miner.startMining();

// Stop mining
miner.stopMining();
```

### Device Requirements

| Platform | Minimum Version | RAM | Storage |
|----------|----------------|-----|---------|
| Android  | 6.0 (API 23)   | 2GB | 50MB    |
| iOS      | 12.0           | 2GB | 50MB    |

## Safety Features

### Battery Protection
- Monitors battery level in real-time
- Automatically stops mining below 20% battery
- Provides low battery notifications

### Thermal Protection
- Estimates device temperature based on usage
- Stops mining if temperature exceeds 40°C
- Implements cooling periods

### Performance Management
- Limits continuous mining to 5 minutes
- Enforces 1-minute cooldown periods
- Adjusts hash rate based on device capabilities

## Pool Statistics

### Real-Time Metrics
- Active mobile miners count
- Total pool hashrate
- Device distribution (Android vs iOS)
- Recent blocks found
- Top miners leaderboard

### Historical Data
- Hashrate history charts
- Block finding frequency
- Miner participation over time
- Platform usage statistics

## Deployment

### Production Deployment

1. **Using PM2** (Recommended)
   ```bash
   npm run deploy     # Start with PM2
   npm run stop       # Stop pool
   npm run restart    # Restart pool
   npm run logs       # View logs
   ```

2. **Docker Deployment**
   ```bash
   docker build -t phoneproof-pool .
   docker run -p 3003:3003 -p 3004:3004 phoneproof-pool
   ```

3. **Cloud Deployment**
   - Supports Heroku, DigitalOcean, AWS, etc.
   - WebSocket support required
   - Configure environment variables

### Environment Variables

```bash
NODE_ENV=production
PORT=3003
WS_PORT=3004
POOL_FEE=1.5
BLOCK_TIME=30000
DIFFICULTY_ADJUSTMENT=120000
MIN_BATTERY=20
MAX_TEMPERATURE=40
MAX_MINING_DURATION=300000
COOLDOWN_PERIOD=60000
```

## Monitoring & Logs

### Log Files
- Pool operations logged to console
- Miner connections and disconnections
- Share submissions and validations
- Block discoveries and rewards

### Monitoring Endpoints
- `/health` - Pool health status
- `/api/stats` - Real-time statistics
- WebSocket events for live updates

## Security

### Protection Measures
- Rate limiting on API endpoints
- CORS protection for web requests
- Input validation and sanitization
- Device fingerprinting for authenticity

### Mobile-Specific Security
- Battery level verification
- Temperature monitoring
- Device capability validation
- Anti-bot measures

## Troubleshooting

### Common Issues

1. **Pool Won't Start**
   - Check Node.js version (16.0.0+)
   - Verify port availability (3003, 3004)
   - Install missing dependencies

2. **Miners Can't Connect**
   - Check firewall settings
   - Verify CORS configuration
   - Test network connectivity

3. **WebSocket Issues**
   - Ensure WebSocket port is open
   - Check proxy/firewall settings
   - Verify browser WebSocket support

### Debug Mode

Enable detailed logging:
```bash
DEBUG=phoneproof:* npm run dev:phoneproof
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/phoneproof-enhancement`
3. Commit changes: `git commit -am 'Add PhoneProof feature'`
4. Push to branch: `git push origin feature/phoneproof-enhancement`
5. Submit pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/knol3j/hashnhedge/issues)
- **Documentation**: [HashNHedge Docs](https://hashnhedge.com/docs)
- **Community**: [Discord](https://discord.gg/hashnhedge)

## Roadmap

### Phase 1 (Current)
- ✅ PhoneProof algorithm implementation
- ✅ Mobile-optimized pool server
- ✅ Web dashboard interface
- ✅ Real-time WebSocket updates

### Phase 2 (Next)
- 🔄 Mobile app integration
- 🔄 Enhanced security features
- 🔄 Advanced analytics
- 🔄 Multi-pool federation

### Phase 3 (Future)
- 📋 iOS App Store submission
- 📋 Google Play Store submission
- 📋 Enterprise mining solutions
- 📋 Cross-chain compatibility

---

**Built with ❤️ for the mobile mining community**