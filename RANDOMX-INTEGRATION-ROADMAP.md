# 🔬 RandomX Integration Roadmap - Mobile CPU Mining

**Start Date:** November 4, 2025
**Target:** 2-4 weeks to production
**Goal:** Enable mobile/CPU users to mine real Monero (XMR)

---

## 🎯 Why RandomX?

### Problem: Current Solutions Don't Fit Mobile
- ❌ SHA256 (Bitcoin): ASIC-dominated, GPUs worthless
- ❌ Ethash (Ethereum): GPU-only, requires 4GB+ VRAM
- ❌ Your custom PhoneProof: Unproven, no liquidity

### Solution: RandomX (Monero)
- ✅ **ASIC-resistant** - Designed for CPUs
- ✅ **Mobile-friendly** - Works on ARM processors
- ✅ **Battle-tested** - Since 2019
- ✅ **Instant liquidity** - XMR on 50+ exchanges
- ✅ **Privacy** - Untraceable transactions
- ✅ **Profitable** - $1-3/day on good phones

---

## 📋 Phase 1: Local Development (Week 1)

### Milestone 1.1: Build XMRig for Windows ✅
**Goal:** Get XMRig mining on your development machine

#### Step 1: Install Build Tools
```bash
# Download Visual Studio 2022 Community
# https://visualstudio.microsoft.com/downloads/
# Select: "Desktop development with C++"

# Install CMake
winget install Kitware.CMake

# Install Git
winget install Git.Git
```

#### Step 2: Clone XMRig Source
```bash
cd C:\Users\gnul\Desktop
git clone https://github.com/xmrig/xmrig.git
cd xmrig
mkdir build
cd build
```

#### Step 3: Build XMRig
```bash
# Open "Developer Command Prompt for VS 2022"
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release

# Output: xmrig.exe in build/Release/
```

#### Step 4: Test with MoneroOcean
```bash
cd Release
xmrig.exe -o gulf.moneroocean.stream:10128 \
          -u YOUR_XMR_WALLET \
          -p desktop-test \
          -a rx/0
```

**Expected Output:**
```
[2025-11-04 15:00:00.000] READY threads=8 huge_pages=100%
[2025-11-04 15:00:01.000] miner speed 10s/60s/15m 1500.0 1500.0 1500.0 H/s
[2025-11-04 15:00:10.000] accepted (1/0) diff 50000 (1 ms)
```

**Deliverable:** ✅ XMRig.exe mining real XMR on MoneroOcean

---

### Milestone 1.2: Create Simple Node.js Wrapper
**Goal:** Control XMRig from JavaScript (like pool-miner.js)

#### Create: `randomx-miner.js`
```javascript
const { spawn } = require('child_process');
const EventEmitter = require('events');

class RandomXMiner extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      pool: config.pool || 'gulf.moneroocean.stream:10128',
      wallet: config.wallet,
      worker: config.worker || 'node-miner',
      threads: config.threads || 4,
      xmrigPath: config.xmrigPath || './xmrig.exe'
    };
    this.process = null;
    this.stats = {
      hashrate: 0,
      shares: { accepted: 0, rejected: 0 },
      uptime: 0
    };
  }

  start() {
    const args = [
      '-o', this.config.pool,
      '-u', this.config.wallet,
      '-p', this.config.worker,
      '-t', this.config.threads.toString(),
      '--cpu-max-threads-hint', '75',
      '--donate-level', '1',
      '--log-file', 'xmrig.log'
    ];

    this.process = spawn(this.config.xmrigPath, args);

    this.process.stdout.on('data', (data) => {
      this.parseOutput(data.toString());
    });

    this.emit('started');
  }

  parseOutput(line) {
    // Parse hashrate: "miner speed 10s/60s/15m 1500.0..."
    const hashrateMatch = line.match(/speed.*?([\d.]+)\s+H\/s/);
    if (hashrateMatch) {
      this.stats.hashrate = parseFloat(hashrateMatch[1]);
      this.emit('hashrate', this.stats.hashrate);
    }

    // Parse shares: "accepted (42/2)"
    const shareMatch = line.match(/accepted \((\d+)\/(\d+)\)/);
    if (shareMatch) {
      this.stats.shares.accepted = parseInt(shareMatch[1]);
      this.stats.shares.rejected = parseInt(shareMatch[2]);
      this.emit('share', this.stats.shares);
    }
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.emit('stopped');
    }
  }
}

// Usage:
const miner = new RandomXMiner({
  wallet: 'YOUR_XMR_WALLET_HERE',
  worker: 'test-rig',
  threads: 4
});

miner.on('hashrate', (h) => console.log(`Hashrate: ${h} H/s`));
miner.on('share', (s) => console.log(`Shares: ${s.accepted}/${s.rejected}`));

miner.start();
```

**Test:**
```bash
node randomx-miner.js
```

**Deliverable:** ✅ Node.js wrapper controlling XMRig

---

## 📋 Phase 2: Android/Mobile Build (Week 2)

### Milestone 2.1: Cross-Compile XMRig for Android

#### Step 1: Install Android NDK
```bash
# Download Android Studio
# https://developer.android.com/studio

# Install NDK via SDK Manager:
# Tools → SDK Manager → SDK Tools → NDK (Side by side)

# Set environment variable:
set ANDROID_NDK=C:\Users\gnul\AppData\Local\Android\Sdk\ndk\26.1.10909125
```

#### Step 2: Build for ARM64
```bash
cd xmrig
mkdir build-android
cd build-android

cmake .. -DCMAKE_TOOLCHAIN_FILE=%ANDROID_NDK%/build/cmake/android.toolchain.cmake \
         -DANDROID_ABI=arm64-v8a \
         -DANDROID_PLATFORM=android-24 \
         -DCMAKE_BUILD_TYPE=Release \
         -DWITH_HWLOC=OFF

cmake --build . --config Release

# Output: libxmrig.so
```

#### Step 3: Test on Android Device
```bash
# Push to device
adb push build-android/libxmrig.so /data/local/tmp/

# Test execution
adb shell
cd /data/local/tmp
chmod +x libxmrig.so
./libxmrig.so --help
```

**Deliverable:** ✅ XMRig running on Android ARM64

---

### Milestone 2.2: React Native Integration

#### Create Native Module Bridge

**File: `android/app/src/main/java/com/hashnhedge/XMRigModule.java`**
```java
package com.hashnhedge;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class XMRigModule extends ReactContextBaseJavaModule {
    private Process xmrigProcess;

    XMRigModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "XMRigMiner";
    }

    @ReactMethod
    public void startMining(String pool, String wallet, String worker, Promise promise) {
        try {
            String[] cmd = {
                "/data/local/tmp/xmrig",
                "-o", pool,
                "-u", wallet,
                "-p", worker,
                "-t", "4",
                "--cpu-max-threads-hint", "75"
            };

            ProcessBuilder pb = new ProcessBuilder(cmd);
            xmrigProcess = pb.start();

            promise.resolve("Mining started");
        } catch (Exception e) {
            promise.reject("START_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopMining(Promise promise) {
        if (xmrigProcess != null) {
            xmrigProcess.destroy();
            promise.resolve("Mining stopped");
        }
    }

    @ReactMethod
    public void getHashrate(Promise promise) {
        // Parse xmrig.log for hashrate
        // Return to JavaScript
        promise.resolve(1500.0); // Placeholder
    }
}
```

**JavaScript Usage:**
```javascript
import { NativeModules } from 'react-native';
const { XMRigMiner } = NativeModules;

// Start mining
await XMRigMiner.startMining(
  'gulf.moneroocean.stream:10128',
  userWallet,
  'mobile-app'
);

// Get stats
const hashrate = await XMRigMiner.getHashrate();
console.log(`Mining at ${hashrate} H/s`);

// Stop
await XMRigMiner.stopMining();
```

**Deliverable:** ✅ React Native app mining XMR

---

## 📋 Phase 3: Pool Deployment (Week 3)

### Milestone 3.1: Deploy MoneroOcean Pool Software

#### Option A: Use MoneroOcean Directly (Fastest)
```bash
# Users mine to MoneroOcean, you track via wallet
# No pool setup needed!
# Users: mining → MoneroOcean → 70% to user wallet
# You: Take 30% fee via separate wallet tracking
```

**Pros:**
- ✅ Zero infrastructure cost
- ✅ Instant deployment
- ✅ Proven reliability

**Cons:**
- ❌ Less control over payouts
- ❌ Can't customize fee structure easily

#### Option B: Self-Hosted Pool (Full Control)
```bash
# Provision VPS
# Hetzner CPX31: 8GB RAM, 4 vCPUs = $17.50/month

ssh root@YOUR_VPS_IP

# Install dependencies
apt update && apt upgrade -y
apt install -y build-essential git redis-server nginx nodejs npm

# Clone MoneroOcean pool
cd /opt
git clone https://github.com/MoneroOcean/nodejs-pool.git
cd nodejs-pool
npm install

# Configure
cp config_example.json config.json
nano config.json
```

**Key Configuration:**
```json
{
  "poolHost": "pool.hashnhedge.com",
  "coin": "xmr",
  "algorithm": "randomx",
  "poolFee": 30,  // Your 30% cut
  "poolAddress": "YOUR_XMR_WALLET",
  "ports": [
    {
      "port": 3333,
      "difficulty": 10000,
      "desc": "Mobile devices"
    },
    {
      "port": 5555,
      "difficulty": 50000,
      "desc": "Desktop CPUs"
    }
  ],
  "api": {
    "enabled": true,
    "port": 8117
  }
}
```

**Start Pool:**
```bash
npm install -g pm2
pm2 start init.js --name "xmr-pool"
pm2 save
pm2 startup
```

**Deliverable:** ✅ MoneroOcean pool accepting miners

---

### Milestone 3.2: Update Mobile App

#### Update Pool Configuration
```javascript
// mobile-proof-pool/src/mobile-pool-server.js

// Add RandomX support
class RandomXPoolServer extends MobilePoolServer {
  constructor(options) {
    super(options);
    this.randomxEnabled = true;
    this.upstreamPool = 'gulf.moneroocean.stream:10128';
  }

  // Proxy RandomX shares to MoneroOcean
  async submitRandomXShare(share, wallet) {
    // Forward to MoneroOcean
    // Track for 30% fee calculation
  }
}
```

**Deliverable:** ✅ Mobile app mining real XMR

---

## 📋 Phase 4: Testing & Optimization (Week 4)

### Milestone 4.1: Performance Testing

**Test Matrix:**
- [ ] Android 12+ (ARM64) - Target: 100-500 H/s
- [ ] Android 10-11 (ARM64) - Target: 50-300 H/s
- [ ] Windows Desktop - Target: 1000-5000 H/s
- [ ] Linux Desktop - Target: 1500-7000 H/s

**Battery Impact Testing:**
- [ ] Mining 1 hour: Battery drain < 10%
- [ ] Mining 8 hours (night): Battery drain < 50%
- [ ] Temperature monitoring: Keep < 45°C

### Milestone 4.2: Difficulty Adjustment

```javascript
// Auto-adjust based on device performance
function calculateOptimalDifficulty(hashrate, deviceType) {
  // Mobile: shares every 30-60 seconds
  // Desktop: shares every 10-20 seconds

  const targetShareTime = deviceType === 'mobile' ? 45 : 15;
  return Math.floor(hashrate * targetShareTime);
}
```

**Deliverable:** ✅ Optimized for mobile battery life

---

## 💰 Economics

### User Earnings (70%)
**Mobile (200 H/s):**
- Daily: 0.0001 XMR × $160 = $0.016/day = $0.48/month
- ⚠️ Too low! Need 10x more hashrate or different approach

**Desktop (2000 H/s):**
- Daily: 0.001 XMR × $160 = $0.16/day = $4.80/month
- ✅ Decent for passive income

**Recommendation:** Target desktop/laptop users first, mobile as bonus

### Your Revenue (30% Pool Fee)
**With 1000 users @ 500 H/s avg:**
- Total pool: 500,000 H/s = 0.5 MH/s
- Daily XMR: ~0.25 XMR = $40/day
- Your cut: 30% = **$12/day = $360/month**

**With 10,000 users:**
- **$120/day = $3,600/month** 💰

---

## 🎯 Critical Success Factors

### Must Have:
1. ✅ Battery-friendly (< 10% drain/hour)
2. ✅ Temperature monitoring (auto-pause if > 45°C)
3. ✅ Easy onboarding (1-click start)
4. ✅ Real XMR payouts (build trust)

### Nice to Have:
- Profit calculator
- Auto-convert XMR → USDC
- Referral bonuses
- Leaderboards

---

## 📅 Timeline Summary

| Week | Milestone | Deliverable | Status |
|------|-----------|-------------|--------|
| 1 | Build XMRig Windows | xmrig.exe + Node wrapper | ⏳ Pending |
| 2 | Android cross-compile | libxmrig.so for ARM64 | ⏳ Pending |
| 3 | Deploy pool | MoneroOcean pool live | ⏳ Pending |
| 4 | Mobile integration | React Native mining | ⏳ Pending |
| 5 | Beta testing | 10-50 test users | ⏳ Pending |
| 6 | Public launch | Open to all | ⏳ Pending |

**Total: 4-6 weeks to production**

---

## 🚀 Next Actions (This Week)

### Monday (Today):
- [x] Complete hybrid pool deployment ✅
- [ ] Download XMRig source
- [ ] Install Visual Studio 2022

### Tuesday-Wednesday:
- [ ] Build XMRig for Windows
- [ ] Test with MoneroOcean
- [ ] Create Node.js wrapper

### Thursday-Friday:
- [ ] Install Android NDK
- [ ] Attempt ARM64 build
- [ ] Document build process

### Weekend:
- [ ] React Native bridge prototype
- [ ] Test on physical Android device
- [ ] Benchmark performance

---

## 📚 Resources

**XMRig:**
- GitHub: https://github.com/xmrig/xmrig
- Docs: https://xmrig.com/docs
- Build Guide: https://xmrig.com/docs/miner/build

**MoneroOcean:**
- Pool: https://moneroocean.stream/
- GitHub: https://github.com/MoneroOcean/nodejs-pool
- API Docs: https://moneroocean.stream/api

**Monero:**
- Website: https://www.getmonero.org/
- Price: https://www.coingecko.com/en/coins/monero
- Explorer: https://xmrchain.net/

---

**Ready to build? Start with Week 1 tasks! 🚀**
