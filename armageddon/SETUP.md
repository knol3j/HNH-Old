# ARMgeddon Complete Setup Guide

## Quick Start

### 1. Install Prerequisites

#### Node.js & npm
- Download from [nodejs.org](https://nodejs.org/) (v16 or higher)
- Verify: `node --version` and `npm --version`

#### Python (for pool)
- Download from [python.org](https://www.python.org/) (v3.8 or higher)
- Verify: `python --version`

#### Expo CLI (for mobile app)
```bash
npm install -g expo-cli
```

### 2. Setup Mining Pool

```bash
cd armageddon/pool
npm install
npm start
```

Pool will be running at:
- HTTP API: http://localhost:3002
- WebSocket: ws://localhost:3002
- Stats: http://localhost:3002/api/stats

### 3. Setup Mobile App

```bash
cd armageddon/mobile-app
npm install
```

#### Run on Physical Device (Recommended)

1. Install Expo Go app on your phone:
   - [Android - Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Start dev server:
```bash
npm start
```

3. Scan QR code with your phone

#### Update Pool URL for Mobile

In `App.js`, update the pool URL to your computer's local IP:

```javascript
const POOL_URL = 'ws://192.168.1.XXX:3002';  // Replace XXX with your IP
```

To find your IP:
- Windows: `ipconfig` (look for IPv4 Address)
- Mac/Linux: `ifconfig` or `ip addr`

### 4. View Dashboard

Open in browser:
```
file:///path/to/armageddon/dashboard/index.html
```

Or serve with:
```bash
cd armageddon/dashboard
npx http-server -p 8080
```

Then visit: http://localhost:8080

## Project Structure

```
armageddon/
├── pool/                      # Mining Pool Backend
│   ├── server.js             # Node.js pool server (port 3002)
│   ├── phoneproof.py         # PhoneProof algorithm
│   ├── package.json
│   └── index.html            # Pool landing page
│
├── mobile-app/               # React Native Mobile Miner
│   ├── App.js                # Main app component
│   ├── app.json              # Expo configuration
│   ├── package.json
│   ├── babel.config.js
│   └── assets/               # App assets (icons, splash)
│
├── dashboard/                # Web Dashboard
│   └── index.html            # Real-time stats & charts
│
├── index.html                # ARMgeddon landing page
└── README.md                 # Main documentation
```

## Testing the PhoneProof Algorithm

```bash
cd armageddon/pool
python phoneproof.py
```

Expected output:
```
============================================================
PhoneProof Mining Demo
============================================================
Block: ARMgeddon genesis block - mobile mining revolution
Difficulty: 24 bits
Target: < 2^232
------------------------------------------------------------
✅ Block mined successfully!
Nonce: [number]
Hash: 0x[hash]
Time: [time]s
Hashrate: ~[rate] H/s
Verification: ✅ PASS
============================================================
```

## Common Issues & Solutions

### Mobile App Can't Connect to Pool

**Problem**: WebSocket connection fails

**Solutions**:
1. Make sure pool server is running (`npm start` in pool directory)
2. Check that phone and computer are on same WiFi network
3. Update `POOL_URL` in App.js with your computer's IP address
4. Disable firewall temporarily to test
5. Try using your computer's IP instead of `localhost`

### Pool Server Won't Start

**Problem**: Port 3002 already in use

**Solution**: Change port in `server.js`:
```javascript
const PORT = process.env.PORT || 3003;  // Use different port
```

### Expo App Build Errors

**Problem**: Missing dependencies

**Solutions**:
```bash
# Clear cache and reinstall
expo start -c
rm -rf node_modules package-lock.json
npm install
```

### Python Script Errors

**Problem**: Module not found

**Solution**: Install required packages:
```bash
pip install hashlib  # Usually built-in, but just in case
```

## Development Workflow

1. **Start Pool Server** (Terminal 1):
```bash
cd armageddon/pool
npm run dev  # Uses nodemon for auto-reload
```

2. **Start Mobile App** (Terminal 2):
```bash
cd armageddon/mobile-app
npm start
```

3. **Open Dashboard** (Browser):
```
armageddon/dashboard/index.html
```

4. **Monitor Pool Stats**:
```
http://localhost:3002/api/stats
```

## Production Deployment

### Deploy Pool to Cloud

**Heroku**:
```bash
cd armageddon/pool
heroku create armageddon-pool
git push heroku master
```

**Render/Railway**:
- Connect GitHub repo
- Set build command: `npm install`
- Set start command: `npm start`
- Expose port 3002

### Build Mobile App

**Android APK**:
```bash
cd armageddon/mobile-app
eas build --platform android
```

**iOS IPA** (requires Apple Developer account):
```bash
eas build --platform ios
```

### Update Mobile App Pool URL

For production, update `POOL_URL` in `App.js`:
```javascript
const POOL_URL = 'wss://your-production-pool.com';  // Use wss:// for secure WebSocket
```

## Performance Tuning

### Optimize Mining Speed

In `App.js`, adjust mining parameters:
```javascript
const phoneProofRef = useRef(new PhoneProof(500));  // Reduce rounds from 1000 to 500
```

### Reduce Battery Usage

In the mining loop:
```javascript
setTimeout(mine, 50);  // Increase from 10ms to 50ms
```

### Adjust Difficulty

In `pool/server.js`:
```javascript
difficulty: 16  // Lower = easier (more blocks found)
```

## API Reference

### Pool Stats Endpoint
```
GET http://localhost:3002/api/stats

Response:
{
  "miners": 5,
  "totalHashrate": 25000,
  "totalShares": 150,
  "blocks": 3,
  "difficulty": 20,
  "recentBlocks": [...]
}
```

### Miners Endpoint
```
GET http://localhost:3002/api/miners

Response:
{
  "miners": [
    {
      "id": "miner_123...",
      "hashrate": 5000,
      "shares": 10,
      "lastShare": 1234567890,
      "connected": 1234567800
    }
  ]
}
```

### WebSocket Mining Protocol

**Subscribe**:
```json
{"method": "mining.subscribe", "id": 1, "params": []}
```

**Receive Work**:
```json
{
  "method": "mining.notify",
  "params": {
    "jobId": "123",
    "blockHeader": "...",
    "target": "00000fff...",
    "difficulty": 20
  }
}
```

**Submit Share**:
```json
{
  "method": "mining.submit",
  "id": 2,
  "params": {
    "jobId": "123",
    "nonce": 42,
    "hash": "..."
  }
}
```

## Next Steps

1. ✅ Get pool running locally
2. ✅ Test mobile app on device
3. ✅ Verify mining and share submission
4. 📝 Deploy pool to production
5. 📝 Build mobile app for distribution
6. 📝 Submit to App Store / Play Store
7. 📝 Launch mainnet

## Support

For issues or questions:
- Check [README.md](README.md)
- Review [mobile-app/README.md](mobile-app/README.md)
- Open issue on GitHub

---

**Ready to mine on mobile!** 📱⚡