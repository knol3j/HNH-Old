/**
 * HashNHedge Common JavaScript
 * Shared functions across all pages
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:10000'
    : 'https://hashnhedge-api.onrender.com';

// Global state
let OFFICIAL_WALLET = null;

// ====================
// UTILITY FUNCTIONS
// ====================

/**
 * Fetch data from API with error handling
 */
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        ${type === 'error' ? 'background: #ef4444;' : ''}
        ${type === 'success' ? 'background: #22c55e;' : ''}
        ${type === 'info' ? 'background: #3b82f6;' : ''}
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ====================
// MENU FUNCTIONS
// ====================

/**
 * Toggle side menu
 */
function toggleMenu() {
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');

    if (menu && overlay) {
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

/**
 * Close menu when clicking a link
 */
function initializeMenu() {
    const menuLinks = document.querySelectorAll('.side-menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Only close menu if it's an anchor link
            if (link.getAttribute('href').startsWith('#')) {
                toggleMenu();
            }
        });
    });
}

// ====================
// WALLET FUNCTIONS
// ====================

/**
 * Initialize wallet configuration
 */
async function initializeWallet() {
    try {
        const data = await fetchAPI('/api/config/wallet');
        if (data.success) {
            OFFICIAL_WALLET = data.walletAddress;
            console.log('✅ Wallet configured');
        }
    } catch (error) {
        console.error('Failed to fetch wallet configuration:', error);
    }
}

/**
 * Connect user wallet
 */
async function connectWallet() {
    // Check if Phantom wallet is installed
    if (typeof window.solana === 'undefined') {
        showToast('Please install Phantom wallet', 'error');
        window.open('https://phantom.app/', '_blank');
        return;
    }

    try {
        const resp = await window.solana.connect();
        const publicKey = resp.publicKey.toString();

        // Verify with backend
        const data = await fetchAPI('/api/connect-wallet', {
            method: 'POST',
            body: JSON.stringify({ address: publicKey })
        });

        if (data.success) {
            showToast('Wallet connected successfully!', 'success');
            updateWalletUI(publicKey);
            return publicKey;
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        showToast('Failed to connect wallet', 'error');
    }
}

/**
 * Update UI after wallet connection
 */
function updateWalletUI(address) {
    const walletButtons = document.querySelectorAll('.connect-wallet-btn');
    walletButtons.forEach(btn => {
        btn.textContent = `${address.slice(0, 4)}...${address.slice(-4)}`;
        btn.classList.add('connected');
    });
}

// ====================
// NETWORK STATS
// ====================

/**
 * Fetch and display network statistics
 */
async function updateNetworkStats() {
    try {
        const stats = await fetchAPI('/api/network-stats');

        // Update DOM elements if they exist
        const elements = {
            'gpu-nodes': stats.totalNodes,
            'mobile-miners': stats.totalNodes, // Update when mobile pool integrated
            'gpu-hashrate': `${(stats.totalHashrate / 1e12).toFixed(2)} TH/s`,
            'mobile-hashrate': '0 MH/s',
            'daily-revenue': `$${stats.rewardsDistributed.toFixed(2)}`,
            'utilization': `${stats.networkUtilization.toFixed(1)}%`
        };

        for (const [id, value] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
    } catch (error) {
        console.error('Failed to update network stats:', error);
    }
}

// ====================
// FORM VALIDATION
// ====================

/**
 * Validate Solana wallet address
 */
function isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * Sanitize user input (comprehensive XSS prevention)
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

    // More comprehensive sanitization
    let sanitized = input
        .replace(/[<>'"]/g, '') // Remove dangerous characters
        .replace(/javascript\s*:/gi, '') // Remove javascript: protocol (with whitespace)
        .replace(/data\s*:/gi, '') // Remove data: protocol
        .replace(/vbscript\s*:/gi, '') // Remove vbscript: protocol
        .replace(/file\s*:/gi, '') // Remove file: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/&lt;/gi, '') // Remove encoded <
        .replace(/&gt;/gi, '') // Remove encoded >
        .trim()
        .slice(0, 1000); // Limit length

    // Additional check: if input contains suspicious patterns, return empty
    const dangerousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
        /<script/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
            return '';
        }
    }

    return sanitized;
}

// ====================
// SMOOTH SCROLLING
// ====================

/**
 * Initialize smooth scrolling for anchor links
 */
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ====================
// LOADING STATES
// ====================

/**
 * Show loading spinner
 */
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="spinner mx-auto"></div>';
    }
}

/**
 * Hide loading spinner
 */
function hideLoading(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = content;
    }
}

// ====================
// CLIPBOARD FUNCTIONS
// ====================

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Failed to copy', 'error');
    }
}

// ====================
// INITIALIZATION
// ====================

/**
 * Initialize all common functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initializeWallet();
    initializeMenu();
    initializeSmoothScroll();

    // Update network stats if element exists
    if (document.getElementById('gpu-nodes')) {
        updateNetworkStats();
        // Update every 30 seconds
        setInterval(updateNetworkStats, 30000);
    }

    // Log initialization
    console.log('✅ HashNHedge initialized');
});

// ====================
// EXPORT FOR MODULE USE
// ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchAPI,
        showToast,
        toggleMenu,
        connectWallet,
        updateNetworkStats,
        isValidSolanaAddress,
        isValidEmail,
        sanitizeInput,
        copyToClipboard
    };
}
