/**
 * Auto-Switcher - Intelligent coin switching based on profitability
 * Integrates with hybrid-pool backend and T-Rex miner
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ProfitabilityAPI = require('./profitability-api');

class AutoSwitcher {
    constructor(configPath = './wallets.json') {
        this.configPath = configPath;
        this.config = this.loadConfig();
        this.profitabilityAPI = new ProfitabilityAPI();

        this.currentCoin = null;
        this.currentProcess = null;
        this.switchTimer = null;
        this.statsTimer = null;

        this.stats = {
            totalSwitches: 0,
            startTime: Date.now(),
            coinHistory: [],
            totalProfit: 0
        };

        this.trexPath = path.join(__dirname, 't-rex.exe');
    }

    /**
     * Load configuration from JSON file
     */
    loadConfig() {
        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error('❌ Failed to load config:', error);
            process.exit(1);
        }
    }

    /**
     * Save configuration to JSON file
     */
    saveConfig() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            console.log('✅ Config saved');
        } catch (error) {
            console.error('❌ Failed to save config:', error);
        }
    }

    /**
     * Start mining a specific coin
     */
    startMining(coin) {
        const walletConfig = this.config.wallets[coin];
        if (!walletConfig) {
            console.error(`❌ No wallet configured for ${coin}`);
            return;
        }

        if (!walletConfig.enabled) {
            console.log(`⏭️  ${coin} is disabled, skipping...`);
            return;
        }

        // Get primary pool
        const pool = walletConfig.pools[0];

        // Build T-Rex command
        const args = [
            '-a', walletConfig.algorithm,
            '-o', pool.url,
            '-u', walletConfig.address,
            '-p', 'x',
            '-w', this.config.settings.default_worker_name,
            '--api-bind-http', '127.0.0.1:4067',
            '--no-watchdog'
        ];

        console.log(`\n🚀 Starting T-Rex Miner...`);
        console.log(`   Coin: ${coin} (${walletConfig.coin})`);
        console.log(`   Algorithm: ${walletConfig.algorithm}`);
        console.log(`   Pool: ${pool.name}`);
        console.log(`   Wallet: ${walletConfig.address.substring(0, 10)}...`);
        console.log('');

        // Spawn T-Rex process
        this.currentProcess = spawn(this.trexPath, args, {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.currentCoin = coin;

        // Log output
        this.currentProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
        });

        this.currentProcess.stderr.on('data', (data) => {
            process.stderr.write(data);
        });

        this.currentProcess.on('close', (code) => {
            console.log(`\n⚠️  T-Rex exited with code ${code}`);
            if (this.switchTimer) {
                // Restart if unexpected exit
                console.log('🔄 Restarting miner in 10 seconds...');
                setTimeout(() => this.checkAndSwitch(), 10000);
            }
        });

        // Update stats
        this.stats.coinHistory.push({
            coin,
            startTime: Date.now(),
            algorithm: walletConfig.algorithm
        });
    }

    /**
     * Stop current mining process
     */
    stopMining() {
        if (this.currentProcess) {
            console.log('\n⏹️  Stopping miner...');
            this.currentProcess.kill('SIGTERM');

            // Force kill if not stopped after 5 seconds
            setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill('SIGKILL');
                }
            }, 5000);

            this.currentProcess = null;
        }
    }

    /**
     * Check profitability and switch if needed
     */
    async checkAndSwitch() {
        try {
            console.log('\n🔍 Checking profitability...');

            const result = await this.profitabilityAPI.getMostProfitable(
                this.config.gpu_hashrates,
                this.config.settings.power_consumption,
                this.config.settings.electricity_cost
            );

            const mostProfitable = result.mostProfitable;

            console.log(`\n📊 Most Profitable: ${mostProfitable.coin}`);
            console.log(`   Daily Profit: $${mostProfitable.dailyProfit.toFixed(2)}`);
            console.log(`   Current Coin: ${this.currentCoin || 'None'}`);

            // Display top 3 coins
            console.log('\n📈 Top 3 Profitable Coins:');
            result.allCoins.slice(0, 3).forEach((coin, idx) => {
                const icon = coin.coin === this.currentCoin ? '✓' : ' ';
                console.log(`   ${icon} ${idx + 1}. ${coin.coin}: $${coin.dailyProfit.toFixed(2)}/day`);
            });

            // Check if switch is needed
            if (this.currentCoin !== mostProfitable.coin) {
                // Calculate profit difference
                const currentCoinData = result.allCoins.find(c => c.coin === this.currentCoin);
                const profitDiff = currentCoinData
                    ? ((mostProfitable.dailyProfit - currentCoinData.dailyProfit) / currentCoinData.dailyProfit)
                    : 1;

                const minDiff = this.config.settings.min_profit_difference;

                if (profitDiff >= minDiff || !this.currentCoin) {
                    console.log(`\n🔄 Switching to ${mostProfitable.coin} (${(profitDiff * 100).toFixed(1)}% more profitable)`);

                    this.stopMining();

                    // Wait for process to stop
                    setTimeout(() => {
                        this.startMining(mostProfitable.coin);
                        this.stats.totalSwitches++;
                    }, 2000);
                } else {
                    console.log(`\n✓ Staying with ${this.currentCoin} (difference ${(profitDiff * 100).toFixed(1)}% < ${(minDiff * 100)}% threshold)`);
                }
            } else {
                console.log(`\n✓ Already mining most profitable coin: ${this.currentCoin}`);
            }

        } catch (error) {
            console.error('❌ Error checking profitability:', error);
        }
    }

    /**
     * Display statistics
     */
    displayStats() {
        const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Auto-Switcher Statistics');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`⏱️  Uptime: ${hours}h ${minutes}m`);
        console.log(`🔄 Total Switches: ${this.stats.totalSwitches}`);
        console.log(`⛏️  Current Coin: ${this.currentCoin || 'None'}`);
        console.log(`📅 Mining History: ${this.stats.coinHistory.length} sessions`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    /**
     * Start auto-switching
     */
    start() {
        console.log('═══════════════════════════════════════════');
        console.log('  🤖 HashNHedge Auto-Switcher Starting...  ');
        console.log('═══════════════════════════════════════════');
        console.log('');
        console.log('⚙️  Configuration:');
        console.log(`   Check Interval: ${this.config.settings.profitability_check_interval / 1000}s`);
        console.log(`   Min Profit Diff: ${(this.config.settings.min_profit_difference * 100)}%`);
        console.log(`   Electricity Cost: $${this.config.settings.electricity_cost}/kWh`);
        console.log(`   Power Consumption: ${this.config.settings.power_consumption}W`);
        console.log(`   Auto-Switch: ${this.config.settings.enable_auto_switch ? 'Enabled' : 'Disabled'}`);
        console.log('');
        console.log('💰 Configured Wallets:');
        Object.entries(this.config.wallets).forEach(([coin, config]) => {
            const status = config.enabled ? '✓' : '✗';
            console.log(`   ${status} ${coin}: ${config.address.substring(0, 20)}...`);
        });
        console.log('');

        // Initial check and start
        this.checkAndSwitch();

        // Schedule periodic checks
        if (this.config.settings.enable_auto_switch) {
            this.switchTimer = setInterval(
                () => this.checkAndSwitch(),
                this.config.settings.profitability_check_interval
            );

            console.log(`✅ Auto-switching enabled (checks every ${this.config.settings.profitability_check_interval / 1000}s)`);
        }

        // Display stats every 5 minutes
        this.statsTimer = setInterval(
            () => this.displayStats(),
            300000
        );

        // Handle shutdown
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    /**
     * Stop auto-switching
     */
    stop() {
        console.log('\n\n⚠️  Shutting down Auto-Switcher...');

        if (this.switchTimer) {
            clearInterval(this.switchTimer);
            this.switchTimer = null;
        }

        if (this.statsTimer) {
            clearInterval(this.statsTimer);
            this.statsTimer = null;
        }

        this.stopMining();
        this.displayStats();

        console.log('✅ Auto-Switcher stopped');
        process.exit(0);
    }

    /**
     * Force switch to specific coin
     */
    forceSwitchTo(coin) {
        if (!this.config.wallets[coin]) {
            console.error(`❌ Unknown coin: ${coin}`);
            return;
        }

        console.log(`\n🔧 Manual switch to ${coin}...`);
        this.stopMining();
        setTimeout(() => this.startMining(coin), 2000);
    }
}

// CLI interface
if (require.main === module) {
    const switcher = new AutoSwitcher();

    // Handle command line arguments
    const args = process.argv.slice(2);

    if (args.length > 0) {
        const command = args[0].toUpperCase();

        if (switcher.config.wallets[command]) {
            // Start with specific coin
            switcher.startMining(command);
        } else if (command === 'TEST') {
            // Test mode - check profitability only
            switcher.checkAndSwitch().then(() => process.exit(0));
        } else {
            console.log('Usage:');
            console.log('  node auto-switcher.js          - Start auto-switching');
            console.log('  node auto-switcher.js ETC      - Start mining ETC');
            console.log('  node auto-switcher.js TEST     - Test profitability check');
            process.exit(1);
        }
    } else {
        // Start auto-switching
        switcher.start();
    }
}

module.exports = AutoSwitcher;
