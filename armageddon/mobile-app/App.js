import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Switch, ScrollView, StatusBar } from 'react-native';
import * as Battery from 'expo-battery';
import * as Device from 'expo-device';

const POOL_URL = 'ws://localhost:3002';

class PhoneProof {
  constructor(rounds = 1000) {
    this.rounds = rounds;
    this.SCRATCH_SIZE = 16384;
  }

  arx(a, b, c, rot) {
    a = (a + b) >>> 0;
    c ^= a;
    c = ((c << rot) | (c >>> (32 - rot))) >>> 0;
    return [a, c];
  }

  hash(blockHeader, nonce, rounds = null) {
    rounds = rounds || this.rounds;

    const initData = blockHeader + nonce.toString();
    let h = this.simpleHash(initData) >>> 0;

    const state = new Uint32Array(8);
    state[0] = h;
    state[1] = initData.length >>> 0;

    for (let i = 2; i < 8; i++) {
      state[i] = (state[i-1] ^ (state[i-2] << 5) ^ state[0]) >>> 0;
    }

    const scratch = new Uint32Array(this.SCRATCH_SIZE);
    for (let i = 0; i < Math.min(8, this.SCRATCH_SIZE); i++) {
      scratch[i] = state[i];
    }

    for (let i = 8; i < this.SCRATCH_SIZE; i++) {
      scratch[i] = (scratch[i-1] ^ (i * 0x9e3779b9)) >>> 0;
    }

    for (let rnd = 0; rnd < rounds; rnd++) {
      const rotBase = 7 + (nonce % 5);

      for (let i = 0; i < 8; i += 2) {
        let rot;
        if (state[i] & 1) {
          rot = (rotBase + i) % 32;
          const idx = (i * 2048 + (state[(i+1) % 8] % 256)) % this.SCRATCH_SIZE;
          state[i] ^= scratch[idx];
        } else {
          rot = (rotBase + (i+1)) % 32;
          const idx = ((i+1) * 2048 + rnd % 256) % this.SCRATCH_SIZE;
          state[(i+1) % 8] ^= scratch[idx];
        }

        const [newA, newC] = this.arx(state[i], state[(i + 1) % 8], state[(i + 2) % 8], rot);
        state[i] = newA;
        state[(i + 1) % 8] = newC;
      }

      if (rnd % 10 === 0) {
        for (let j = 0; j < this.SCRATCH_SIZE; j += 16) {
          if (scratch[j] % 2) {
            const idxNext = (j + 1) % this.SCRATCH_SIZE;
            [scratch[j], scratch[idxNext]] = [scratch[idxNext], scratch[j]];
          }
        }
      }
    }

    let final = 0n;
    for (const s of state) {
      final = (final * 31n + BigInt(s)) % (1n << 256n);
    }

    const scratchSum = scratch.reduce((sum, val) => (sum + val) >>> 0, 0);
    final = final ^ (BigInt(scratchSum) << 128n);

    return final;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  verify(blockHeader, nonce, target) {
    const h = this.hash(blockHeader, nonce);
    return h < target;
  }
}

export default function App() {
  const [isMining, setIsMining] = useState(false);
  const [hashrate, setHashrate] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [shares, setShares] = useState(0);
  const [poolUrl, setPoolUrl] = useState(POOL_URL);
  const [connected, setConnected] = useState(false);
  const [autoStop, setAutoStop] = useState(true);

  const wsRef = useRef(null);
  const miningRef = useRef(false);
  const currentWorkRef = useRef(null);
  const phoneProofRef = useRef(new PhoneProof(1000));

  useEffect(() => {
    const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryLevel(batteryLevel);
      if (autoStop && batteryLevel < 0.2 && isMining) {
        stopMining();
        alert('Mining stopped: Battery below 20%');
      }
    });

    return () => subscription.remove();
  }, [isMining, autoStop]);

  const connectToPool = () => {
    const ws = new WebSocket(poolUrl);

    ws.onopen = () => {
      setConnected(true);
      console.log('Connected to pool');
      ws.send(JSON.stringify({ method: 'mining.subscribe', id: 1, params: [] }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.method === 'mining.notify') {
        currentWorkRef.current = {
          jobId: data.params.jobId,
          blockHeader: data.params.blockHeader,
          target: BigInt('0x' + data.params.target),
          difficulty: data.params.difficulty
        };
        console.log('New work received:', currentWorkRef.current.jobId);
      }

      if (data.method === 'mining.block_found') {
        console.log('🎉 Block found by pool!');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('Disconnected from pool');
    };

    wsRef.current = ws;
  };

  const startMining = () => {
    if (!connected) {
      connectToPool();
    }

    setIsMining(true);
    miningRef.current = true;

    let nonce = 0;
    let hashCount = 0;
    let startTime = Date.now();

    const mine = () => {
      if (!miningRef.current) return;

      const work = currentWorkRef.current;
      if (!work) {
        setTimeout(mine, 100);
        return;
      }

      for (let i = 0; i < 100; i++) {
        const hash = phoneProofRef.current.hash(work.blockHeader, nonce);
        hashCount++;

        if (hash < work.target) {
          console.log('✅ Share found!', nonce);
          setShares(s => s + 1);

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              method: 'mining.submit',
              id: Date.now(),
              params: {
                jobId: work.jobId,
                nonce: nonce,
                hash: hash.toString(16)
              }
            }));
          }
        }

        nonce++;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > 0) {
        setHashrate(Math.round(hashCount / elapsed));

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            method: 'mining.hashrate',
            params: { hashrate: Math.round(hashCount / elapsed) }
          }));
        }
      }

      setTimeout(mine, 10);
    };

    mine();
  };

  const stopMining = () => {
    setIsMining(false);
    miningRef.current = false;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>📱 ARMgeddon Miner</Text>
        <Text style={styles.subtitle}>PhoneProof Mobile Mining</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Hashrate</Text>
            <Text style={styles.statValue}>{(hashrate/1000).toFixed(2)} KH/s</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Battery</Text>
            <Text style={styles.statValue}>{Math.round(batteryLevel * 100)}%</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Shares</Text>
            <Text style={styles.statValue}>{shares}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, connected && styles.connected]}>
              {connected ? '🟢' : '🔴'}
            </Text>
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Auto-stop at 20% battery</Text>
            <Switch
              value={autoStop}
              onValueChange={setAutoStop}
              trackColor={{ false: '#767577', true: '#ef4444' }}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title={isMining ? 'Stop Mining' : 'Start Mining'}
              onPress={isMining ? stopMining : startMining}
              color={isMining ? '#dc2626' : '#ef4444'}
            />
          </View>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoTitle}>Device Info</Text>
          <Text style={styles.infoText}>Model: {Device.modelName}</Text>
          <Text style={styles.infoText}>OS: {Device.osName} {Device.osVersion}</Text>
          <Text style={styles.infoText}>Pool: {poolUrl}</Text>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: '#1f2937',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  connected: {
    color: '#10b981',
  },
  controls: {
    padding: 20,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  settingLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 10,
  },
  info: {
    margin: 20,
    padding: 20,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 5,
  },
});