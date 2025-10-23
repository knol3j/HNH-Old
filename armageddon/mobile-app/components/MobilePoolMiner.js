import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import * as Battery from 'expo-battery';

// Import Mobile Miner SDK
// In production, install via: npm install @hashnhedge/mobile-miner-sdk
// For now, we'll use the local implementation
class MobileMinerSDK {
    constructor(options = {}) {
        this.poolUrl = options.poolUrl || 'ws://localhost:8081';
        this.walletAddress = options.address || '';
        this.autoStart = options.autoStart || false;
        this.batteryThreshold = options.batteryThreshold || 20;
        this.thermalThreshold = options.thermalThreshold || 45;

        this.mining = false;
        this.stats = {
            hashrate: 0,
            shares: { valid: 0, invalid: 0 },
            uptime: 0,
            balance: 0
        };

        this.deviceInfo = {
            batteryLevel: 100,
            isCharging: false,
            temperature: 25,
            cores: 4,
            ram: 4096
        };

        this.callbacks = {
            onConnect: () => {},
            onDisconnect: () => {},
            onShareAccepted: () => {},
            onShareRejected: () => {},
            onHashrateUpdate: () => {},
            onError: () => {}
        };
    }

    async initialize() {
        console.log('[MobileMiner] Initializing...');
        await this.detectDevice();
        await this.connect();
        return true;
    }

    async detectDevice() {
        // Detect CPU cores and RAM
        // In React Native, these would come from native modules
        this.deviceInfo.cores = 4; // Default, should be detected
        this.deviceInfo.ram = 4096; // Default
    }

    async connect() {
        return new Promise((resolve) => {
            // WebSocket connection simulation for React Native
            this.connected = true;
            this.callbacks.onConnect();
            resolve(true);
        });
    }

    async startMining() {
        if (this.deviceInfo.batteryLevel < this.batteryThreshold && !this.deviceInfo.isCharging) {
            console.log('[MobileMiner] Battery too low');
            return false;
        }

        this.mining = true;
        this.stats.uptime = Date.now();
        this.simulateMining();
        return true;
    }

    simulateMining() {
        // Simulate mining for demo
        this.miningInterval = setInterval(() => {
            if (!this.mining) return;

            // Simulate hashrate based on device tier
            const baseHashrate = this.deviceInfo.cores * 50000; // 50 KH/s per core
            this.stats.hashrate = baseHashrate + Math.random() * 10000;

            // Occasionally find a share
            if (Math.random() < 0.1) {
                this.stats.shares.valid++;
                this.callbacks.onShareAccepted();
            }

            this.callbacks.onHashrateUpdate(this.stats.hashrate);
        }, 1000);
    }

    stopMining() {
        this.mining = false;
        if (this.miningInterval) {
            clearInterval(this.miningInterval);
        }
    }

    getStats() {
        return {
            ...this.stats,
            uptime: this.mining ? Date.now() - this.stats.uptime : 0,
            mining: this.mining,
            deviceInfo: this.deviceInfo
        };
    }

    on(event, callback) {
        const key = `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
        if (this.callbacks.hasOwnProperty(key)) {
            this.callbacks[key] = callback;
        }
    }

    updateBattery(level, isCharging) {
        this.deviceInfo.batteryLevel = level * 100;
        this.deviceInfo.isCharging = isCharging;

        if (level * 100 < this.batteryThreshold && !isCharging && this.mining) {
            this.stopMining();
            this.callbacks.onError('Battery too low, mining stopped');
        }
    }

    disconnect() {
        this.stopMining();
        this.connected = false;
        this.callbacks.onDisconnect();
    }
}

/**
 * Mobile Pool Miner Component
 * Integrates the HashNHedge Mobile Proof Pool into React Native app
 */
export default function MobilePoolMiner({ walletAddress, onStatsUpdate }) {
  const [miner, setMiner] = useState(null);
  const [mining, setMining] = useState(false);
  const [stats, setStats] = useState({
    hashrate: 0,
    shares: { valid: 0, invalid: 0 },
    uptime: 0,
    balance: 0
  });
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    initializeMiner();
    setupBatteryMonitoring();

    return () => {
      if (miner) {
        miner.disconnect();
      }
    };
  }, []);

  /**
   * Initialize the mobile miner
   */
  const initializeMiner = async () => {
    try {
      const minerInstance = new MobileMinerSDK({
        poolUrl: 'wss://pool.hashnhedge.com:8081', // Change to your production URL
        address: walletAddress,
        autoStart: false,
        batteryThreshold: 20
      });

      // Setup callbacks
      minerInstance.on('Connect', () => {
        setConnectionStatus('connected');
        addLog('Connected to pool');
      });

      minerInstance.on('Disconnect', () => {
        setConnectionStatus('disconnected');
        addLog('Disconnected from pool');
      });

      minerInstance.on('ShareAccepted', () => {
        addLog('✅ Share accepted!');
      });

      minerInstance.on('ShareRejected', () => {
        addLog('❌ Share rejected');
      });

      minerInstance.on('HashrateUpdate', (hashrate) => {
        updateStats();
      });

      minerInstance.on('Error', (error) => {
        Alert.alert('Mining Error', error);
      });

      await minerInstance.initialize();
      setMiner(minerInstance);
      setConnectionStatus('connected');
      addLog('Miner initialized');
    } catch (error) {
      console.error('Failed to initialize miner:', error);
      Alert.alert('Error', 'Failed to initialize miner');
    }
  };

  /**
   * Setup battery monitoring
   */
  const setupBatteryMonitoring = async () => {
    const batteryState = await Battery.getBatteryLevelAsync();
    const chargingState = await Battery.getBatteryStateAsync();

    setBatteryLevel(batteryState * 100);
    setIsCharging(chargingState === Battery.BatteryState.CHARGING);

    // Update miner with battery info
    if (miner) {
      miner.updateBattery(batteryState, chargingState === Battery.BatteryState.CHARGING);
    }

    // Subscribe to battery updates
    Battery.addBatteryLevelListener((state) => {
      setBatteryLevel(state.batteryLevel * 100);
      if (miner) {
        miner.updateBattery(state.batteryLevel, isCharging);
      }
    });

    Battery.addBatteryStateListener((state) => {
      const charging = state.batteryState === Battery.BatteryState.CHARGING;
      setIsCharging(charging);
      if (miner) {
        miner.updateBattery(batteryLevel / 100, charging);
      }
    });
  };

  /**
   * Start mining
   */
  const startMining = async () => {
    if (!miner) {
      Alert.alert('Error', 'Miner not initialized');
      return;
    }

    if (batteryLevel < 20 && !isCharging) {
      Alert.alert(
        'Low Battery',
        'Battery level is too low. Please charge your device before mining.'
      );
      return;
    }

    const success = await miner.startMining();
    if (success) {
      setMining(true);
      addLog('Mining started');

      // Start stats update interval
      statsInterval = setInterval(updateStats, 1000);
    }
  };

  /**
   * Stop mining
   */
  const stopMining = () => {
    if (miner) {
      miner.stopMining();
      setMining(false);
      addLog('Mining stopped');

      if (statsInterval) {
        clearInterval(statsInterval);
      }
    }
  };

  /**
   * Update stats
   */
  let statsInterval = null;
  const updateStats = () => {
    if (miner) {
      const currentStats = miner.getStats();
      setStats(currentStats);

      if (onStatsUpdate) {
        onStatsUpdate(currentStats);
      }
    }
  };

  /**
   * Add log message
   */
  const addLog = (message) => {
    console.log(`[MobilePool] ${message}`);
  };

  /**
   * Format hashrate
   */
  const formatHashrate = (hashrate) => {
    if (hashrate >= 1000000) {
      return `${(hashrate / 1000000).toFixed(2)} MH/s`;
    } else if (hashrate >= 1000) {
      return `${(hashrate / 1000).toFixed(2)} KH/s`;
    }
    return `${hashrate.toFixed(2)} H/s`;
  };

  /**
   * Format uptime
   */
  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <View style={styles.container}>
      {/* Connection Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Pool Status</Text>
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot,
            connectionStatus === 'connected' ? styles.statusConnected : styles.statusDisconnected
          ]} />
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Mining Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Hashrate</Text>
          <Text style={styles.statValue}>{formatHashrate(stats.hashrate)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Shares</Text>
          <Text style={styles.statValue}>{stats.shares.valid}</Text>
          <Text style={styles.statSubtext}>
            {stats.shares.invalid > 0 ? `${stats.shares.invalid} rejected` : 'All valid'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Uptime</Text>
          <Text style={styles.statValue}>{formatUptime(stats.uptime)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Balance</Text>
          <Text style={styles.statValue}>{stats.balance.toFixed(6)}</Text>
          <Text style={styles.statSubtext}>HNH</Text>
        </View>
      </View>

      {/* Battery Warning */}
      {batteryLevel < 30 && !isCharging && (
        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ Low battery ({batteryLevel.toFixed(0)}%). Mining will stop at 20%.
          </Text>
        </View>
      )}

      {/* Mining Control */}
      <TouchableOpacity
        style={[styles.miningButton, mining ? styles.miningButtonActive : styles.miningButtonInactive]}
        onPress={mining ? stopMining : startMining}
        disabled={!miner}
      >
        {!miner ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.miningButtonText}>
            {mining ? '⏸ Stop Mining' : '▶️ Start Mining'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Pool Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>PhoneProof Mining Pool</Text>
        <Text style={styles.infoText}>
          Battery-aware mobile mining optimized for your device.
          Earnings paid in HNH tokens on Solana.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#10B981',
  },
  statusDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
    padding: 16,
    margin: 4,
    flex: 1,
    minWidth: '45%',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statSubtext: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    color: '#FCD34D',
    fontSize: 14,
  },
  miningButton: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  miningButtonActive: {
    backgroundColor: '#EF4444',
  },
  miningButtonInactive: {
    backgroundColor: '#10B981',
  },
  miningButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
});
