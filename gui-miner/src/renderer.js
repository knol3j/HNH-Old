const { ipcRenderer } = require('electron');

// DOM Elements
const walletInput = document.getElementById('walletAddress');
const poolInput = document.getElementById('poolUrl');
const workerInput = document.getElementById('workerName');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const hashrateEl = document.getElementById('hashrate');
const runtimeEl = document.getElementById('runtime');
const acceptedSharesEl = document.getElementById('acceptedShares');
const rejectedSharesEl = document.getElementById('rejectedShares');
const earningsEl = document.getElementById('earnings');
const acceptanceRateEl = document.getElementById('acceptanceRate');
const activityLog = document.getElementById('activityLog');

let isMining = false;

// Load saved configuration
async function loadConfig() {
    const config = await ipcRenderer.invoke('get-config');
    walletInput.value = config.walletAddress || '';
    poolInput.value = config.poolUrl || 'https://hashnhedge-pool.onrender.com';
    workerInput.value = config.workerName || '';
}

// Save configuration
async function saveConfig() {
    const config = {
        walletAddress: walletInput.value.trim(),
        poolUrl: poolInput.value.trim() || 'https://hashnhedge-pool.onrender.com',
        workerName: workerInput.value.trim() || require('os').hostname()
    };
    await ipcRenderer.invoke('save-config', config);
    return config;
}

// Add log entry
function addLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    activityLog.appendChild(entry);
    activityLog.scrollTop = activityLog.scrollHeight;

    // Keep only last 100 entries
    while (activityLog.children.length > 100) {
        activityLog.removeChild(activityLog.firstChild);
    }
}

// Start mining
startBtn.addEventListener('click', async () => {
    const wallet = walletInput.value.trim();

    if (!wallet) {
        addLog('Error: Wallet address is required!', 'error');
        return;
    }

    const config = await saveConfig();

    startBtn.disabled = true;
    addLog('Starting miner...', 'info');

    try {
        const result = await ipcRenderer.invoke('start-mining', config);

        if (result.success) {
            isMining = true;
            statusIndicator.className = 'status-indicator active';
            statusText.textContent = 'Mining';
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            addLog('Mining started successfully!', 'success');
            addLog(`Connected to pool: ${config.poolUrl}`, 'info');
            addLog(`Wallet: ${config.walletAddress}`, 'info');
            addLog(`Worker: ${config.workerName}`, 'info');
        } else {
            addLog(`Error: ${result.error}`, 'error');
            startBtn.disabled = false;
        }
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
        startBtn.disabled = false;
    }
});

// Stop mining
stopBtn.addEventListener('click', async () => {
    stopBtn.disabled = true;
    addLog('Stopping miner...', 'info');

    try {
        const result = await ipcRenderer.invoke('stop-mining');

        if (result.success) {
            isMining = false;
            statusIndicator.className = 'status-indicator inactive';
            statusText.textContent = 'Stopped';
            stopBtn.classList.add('hidden');
            startBtn.classList.remove('hidden');
            startBtn.disabled = false;
            addLog('Mining stopped', 'info');
        } else {
            addLog(`Error: ${result.error}`, 'error');
            stopBtn.disabled = false;
        }
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
        stopBtn.disabled = false;
    }
});

// Listen for mining stats updates
ipcRenderer.on('mining-stats', (event, stats) => {
    hashrateEl.textContent = stats.hashrateFormatted;
    runtimeEl.textContent = stats.runtimeFormatted;
    acceptedSharesEl.textContent = stats.acceptedShares;
    rejectedSharesEl.textContent = stats.rejectedShares;
    earningsEl.textContent = stats.totalEarnings.toFixed(2) + ' HNH';
    acceptanceRateEl.textContent = stats.acceptanceRate.toFixed(1) + '%';

    // Log share acceptance
    if (stats.acceptedShares > 0 && stats.acceptedShares % 10 === 0) {
        addLog(`Milestone: ${stats.acceptedShares} shares accepted!`, 'success');
    }
});

// Update stats periodically
setInterval(async () => {
    if (isMining) {
        const status = await ipcRenderer.invoke('get-mining-status');
        if (status.stats) {
            hashrateEl.textContent = status.stats.hashrateFormatted;
            runtimeEl.textContent = status.stats.runtimeFormatted;
            acceptedSharesEl.textContent = status.stats.acceptedShares;
            rejectedSharesEl.textContent = status.stats.rejectedShares;
            earningsEl.textContent = status.stats.totalEarnings.toFixed(2) + ' HNH';
            acceptanceRateEl.textContent = status.stats.acceptanceRate.toFixed(1) + '%';
        }
    }
}, 2000);

// Initialize
loadConfig();
addLog('HashNHedge Miner initialized', 'success');
addLog('Enter your wallet address and click Start Mining', 'info');
