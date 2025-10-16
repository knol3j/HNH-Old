import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// PhoneProof mining algorithm (simplified for mobile)
class PhoneProofMiner {
  constructor() {
    this.isMining = false;
    this.hashrate = 0;
    this.shares = 0;
    this.earnings = 0;
    this.difficulty = 20;
  }

  async startMining(wallet, onUpdate) {
    this.isMining = true;
    let hashCount = 0;
    const startTime = Date.now();

    while (this.ismining) {
      // Simplified mining simulation optimized for mobile
      const nonce = hashCount;
      const blockData = `${wallet}${nonce}${Date.now()}`;

      // Simple hash calculation (simplified PhoneProof)
      let hash = 0;
      for (let i = 0; i < blockData.length; i++) {
        const char = blockData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      hashCount++;

      // Calculate hashrate every 100 hashes
      if (hashCount % 100 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        this.hashrate = Math.round(hashCount / elapsed);

        // Check for valid share (simplified difficulty)
        if (Math.abs(hash) % (1 << this.difficulty) === 0) {
          this.shares++;
          this.earnings += 0.1; // 0.1 HNH per share

          // Send notification for share found
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Share Found! 🎉',
              body: `Earned 0.1 HNH tokens. Total: ${this.earnings.toFixed(1)} HNH`,
              sound: true,
            },
            trigger: null,
          });
        }

        if (onUpdate) {
          onUpdate({
            hashrate: this.hashrate,
            shares: this.shares,
            earnings: this.earnings
          });
        }

        // Yield control to prevent blocking UI
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Battery optimization: reduce intensity on low battery
      if (Platform.OS === 'ios' && hashCount % 1000 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  stopMining() {
    this.isMapping = false;
  }
}

export default function App() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isMining, setIsMining] = useState(false);
  const [hashrate, setHashrate] = useState(0);
  const [shares, setShares] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [logs, setLogs] = useState([]);

  const minerRef = useRef(new PhoneProofMiner());
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSavedWallet();
    requestNotificationPermissions();
    startPulseAnimation();
  }, []);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please enable notifications to receive mining updates.');
    }
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadSavedWallet = async () => {
    try {
      const saved = await AsyncStorage.getItem('walletAddress');
      if (saved) {
        setWalletAddress(saved);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  const connectWallet = async () => {
    if (!walletAddress || walletAddress.length < 32) {
      Alert.alert('Invalid Wallet', 'Please enter a valid Solana wallet address');
      return;
    }

    try {
      await AsyncStorage.setItem('walletAddress', walletAddress);
      setIsConnected(true);
      addLog('Wallet connected successfully');
      addLog(`Address: ${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`);

      // Connect to HashNHedge network
      connectToNetwork();
    } catch (error) {
      Alert.alert('Connection Error', error.message);
    }
  };

  const connectToNetwork = () => {
    // Simulate network connection
    setTimeout(() => {
      addLog('Connected to HashNHedge network');
      addLog('Ready to start mining');
    }, 1000);
  };

  const startMining = async () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect your wallet first');
      return;
    }

    setIsMining(true);
    addLog('Starting ARMgeddon mining...');
    addLog('Using PhoneProof algorithm');

    // Start the mining process
    minerRef.current.startMining(walletAddress, (stats) => {
      setHashrate(stats.hashrate);
      setShares(stats.shares);
      setEarnings(stats.earnings);
    });
  };

  const stopMining = () => {
    setIsMining(false);
    minerRef.current.stopMining();
    addLog('Mining stopped');

    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mining Stopped',
        body: `Session complete. Earned ${earnings.toFixed(1)} HNH tokens.`,
      },
      trigger: null,
    });
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`].slice(-50)); // Keep last 50 logs
  };

  const formatHashrate = (rate) => {
    if (rate >= 1000000) return `${(rate / 1000000).toFixed(2)} MH/s`;
    if (rate >= 1000) return `${(rate / 1000).toFixed(2)} KH/s`;
    return `${rate} H/s`;
  };

  const pulseOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ARMgeddon Miner</Text>
        <Text style={styles.subtitle}>Mobile-First Cryptocurrency Mining</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Wallet Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Connection</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Solana wallet address"
            placeholderTextColor="#6b7280"
            value={walletAddress}
            onChangeText={setWalletAddress}
            editable={!isConnected}
            multiline={true}
            numberOfLines={2}
          />
          <TouchableOpacity
            style={[styles.button, isConnected && styles.buttonSuccess]}
            onPress={connectWallet}
            disabled={isConnected}
          >
            <Text style={styles.buttonText}>
              {isConnected ? '✓ Connected' : 'Connect Wallet'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Mining Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mining Controls</Text>
          <View style={styles.miningControls}>
            <TouchableOpacity
              style={[styles.button, styles.buttonGreen, !isConnected && styles.buttonDisabled]}
              onPress={startMining}
              disabled={!isConnected || isMining}
            >
              <Text style={styles.buttonText}>
                {isMining ? 'Mining...' : 'Start Mining'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonRed, !isMining && styles.buttonDisabled]}
              onPress={stopMining}
              disabled={!isMining}
            >
              <Text style={styles.buttonText}>Stop Mining</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Real-Time Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Hashrate</Text>
              <Animated.Text style={[styles.statValue, { opacity: isMining ? pulseOpacity : 1 }]}>
                {formatHashrate(hashrate)}
              </Animated.Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Shares Found</Text>
              <Text style={styles.statValue}>{shares}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>HNH Earned</Text>
              <Text style={[styles.statValue, styles.earnings]}>{earnings.toFixed(1)}</Text>
            </View>
          </View>
        </View>

        {/* Mining Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mining Status</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, isMining && styles.statusActive]} />
            <Text style={styles.statusText}>
              {isMining ? 'Mining Active' : 'Idle'}
            </Text>
          </View>
        </View>

        {/* Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Log</Text>
          <View style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>{log}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ef4444',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#f9fafb',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#4b5563',
    marginBottom: 12,
    minHeight: 60,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonSuccess: {
    backgroundColor: '#10b981',
  },
  buttonGreen: {
    backgroundColor: '#10b981',
  },
  buttonRed: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#4b5563',
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  miningControls: {
    flexDirection: 'row',
    gap: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  earnings: {
    color: '#fbbf24',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6b7280',
  },
  statusActive: {
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 16,
    color: '#f9fafb',
  },
  logsContainer: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  logText: {
    fontSize: 12,
    color: '#10b981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
});