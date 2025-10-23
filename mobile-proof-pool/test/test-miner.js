/**
 * Test Script for Mobile Mining Pool
 * Simulates a mobile miner connecting and submitting shares
 */

const MobileMinerSDK = require('../mobile-sdk/mobile-miner-sdk');

async function testMiner() {
    console.log('🧪 Testing Mobile Miner SDK...\n');

    // Create miner instance
    const miner = new MobileMinerSDK({
        poolUrl: 'ws://localhost:8081',
        address: 'test_wallet_' + Date.now(),
        autoStart: false,
        batteryThreshold: 20
    });

    // Setup event listeners
    miner.on('Connect', () => {
        console.log('✅ Connected to pool');
    });

    miner.on('Disconnect', () => {
        console.log('❌ Disconnected from pool');
    });

    miner.on('ShareAccepted', (data) => {
        console.log('✅ Share accepted!', data);
    });

    miner.on('ShareRejected', (data) => {
        console.log('❌ Share rejected:', data);
    });

    miner.on('HashrateUpdate', (hashrate) => {
        console.log(`⚡ Hashrate: ${Math.round(hashrate)} H/s`);
    });

    miner.on('Error', (error) => {
        console.error('❌ Error:', error);
    });

    try {
        // Initialize miner
        console.log('📱 Initializing miner...');
        await miner.initialize();
        console.log('✅ Miner initialized\n');

        // Start mining
        console.log('⛏️  Starting mining...');
        await miner.startMining();
        console.log('✅ Mining started\n');

        // Mine for 30 seconds
        console.log('⏱️  Mining for 30 seconds...\n');

        // Display stats every 5 seconds
        const statsInterval = setInterval(() => {
            const stats = miner.getStats();
            console.log('\n📊 Current Stats:');
            console.log(`   Hashrate: ${Math.round(stats.hashrate)} H/s`);
            console.log(`   Valid Shares: ${stats.shares.valid}`);
            console.log(`   Invalid Shares: ${stats.shares.invalid}`);
            console.log(`   Balance: ${stats.balance} HNH`);
            console.log(`   Uptime: ${Math.round(stats.uptime / 1000)}s`);
        }, 5000);

        // Stop after 30 seconds
        setTimeout(() => {
            clearInterval(statsInterval);
            console.log('\n⏹️  Stopping miner...');
            miner.stopMining();

            setTimeout(() => {
                const finalStats = miner.getStats();
                console.log('\n📊 Final Stats:');
                console.log(`   Total Valid Shares: ${finalStats.shares.valid}`);
                console.log(`   Total Invalid Shares: ${finalStats.shares.invalid}`);
                console.log(`   Total Balance: ${finalStats.balance} HNH`);
                console.log(`   Total Uptime: ${Math.round(finalStats.uptime / 1000)}s`);
                console.log('\n✅ Test completed successfully!\n');

                miner.disconnect();
                process.exit(0);
            }, 2000);
        }, 30000);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run test
testMiner();
