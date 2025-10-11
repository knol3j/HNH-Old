# HashNHedge Cleanup Plan - Remove Redundancies

## Duplicate Files Identified

### CRITICAL DUPLICATES (Same Content, Multiple Locations)

#### 1. Dashboard Pages (5 copies)
- `/docs/dashboard.html`
- `/pages/dashboard.html`
- `/HNH-pool/dashboard.html`
- **KEEP:** `/docs/gpu-farm-dashboard.html` (this is the main one)
- **DELETE:** Other dashboard copies

#### 2. Mining Platform (4 copies)
- `/docs/mining-platform.html`
- `/pages/mining-platform.html`
- `/HNH-pool/mining-platform.html`
- `/docs/dynamic-mining-platform.html`
- **KEEP:** `/docs/gpu-farm-dashboard.html` (consolidate all features)
- **DELETE:** Other mining platform copies

#### 3. Token Creator (4 copies)
- `/docs/token-creator.html`
- `/pages/token-creator.html`
- `/HNH-pool/token-creator.html`
- `/docs/solana-token-creator.html`
- `/pages/solana-token-creator.html`
- **KEEP:** `/docs/solana-token-creator.html` (most complete)
- **DELETE:** Others

#### 4. Revenue Calculator (3 copies)
- `/docs/revenue-calculator.html`
- `/pages/revenue-calculator.html`
- `/HNH-pool/revenue-calculator.html`
- **KEEP:** `/docs/revenue-calculator.html`
- **DELETE:** Others

#### 5. Compute Marketplace (2 copies)
- `/docs/compute-marketplace.html`
- `/HNH-pool/compute-marketplace.html`
- **KEEP:** `/docs/compute-marketplace.html`
- **DELETE:** HNH-pool version

#### 6. Security Platform (2 copies)
- `/docs/security-platform.html`
- `/pages/mining-security-platform.html`
- **KEEP:** `/docs/security-platform.html`
- **DELETE:** Pages version

#### 7. White Label Generator (3 copies)
- `/docs/white-label-generator.html`
- `/pages/white-label-generator.html`
- `/HNH-pool/white-label-generator.html`
- **KEEP:** `/docs/white-label-generator.html`
- **DELETE:** Others

#### 8. Navigation Menu (2 copies)
- `/docs/hashnhedge_navigation.html`
- `/pages/hashnhedge_navigation.html`
- `/HNH-pool/navigation-menu-addition.html`
- **DELETE:** All (navigation is in index.html now)

#### 9. Node Setup (2 copies)
- `/docs/node_setup_downloads.html`
- `/pages/node_setup_downloads.html`
- **KEEP:** `/downloads/index.html` (consolidate into this)
- **DELETE:** Others

#### 10. Index Pages (3 copies)
- `/index.html` (MAIN - KEEP)
- `/pages/index.html`
- `/docs/index.html`
- `/HNH-pool/index.html`
- **KEEP:** `/index.html` only
- **DELETE:** Others

### SERVER DUPLICATES

#### Multiple Server Files
- `/server.js` (MAIN - KEEP)
- `/api/server.js` (KEEP - different purpose)
- `/pool_server_file.js` (DELETE - old version)
- `/HNH-pool/pool_server_file.js` (KEEP - mining pool)
- `/armageddon/pool/server.js` (KEEP - mobile pool)
- `/hybrid-pool/index.js` (KEEP - hybrid pool)

---

## NEW CONSOLIDATED STRUCTURE

```
hashnhedge-consolidated/
├── index.html                          # Main landing page
├── server.js                          # Main API server
│
├── api/                               # Production API
│   ├── server.js
│   └── routes/
│
├── docs/                              # Public-facing pages
│   ├── gpu-farm-dashboard.html       # Main dashboard
│   ├── security-platform.html        # Security/Hashcat
│   ├── solana-token-creator.html     # Token creation
│   ├── revenue-calculator.html       # Profitability calc
│   ├── compute-marketplace.html      # AI/ML marketplace
│   └── white-label-generator.html    # White label tool
│
├── downloads/                         # Download pages
│   ├── index.html                    # Windows miner
│   └── mobile.html                   # Mobile apps
│
├── pages/                            # Community pages
│   ├── community-support.html
│   └── whitepaper.html
│
├── HNH-pool/                         # Mining pool backend
│   ├── pool-dashboard.html          # Pool stats
│   ├── start-mining.html            # Getting started
│   └── security-dashboard.html      # Pool security
│
├── armageddon/                       # Mobile mining
│   ├── index.html
│   └── pool/
│
├── hnh-vendor-portal/               # Enterprise portal
│   ├── index.html
│   ├── vendor-registration.html
│   └── marketplace.html
│
└── hybrid-pool/                      # Hybrid pool server
    └── miner-gui.html
```

---

## FILES TO DELETE (63 files)

### Duplicate HTML Pages (40 files)
```
pages/dashboard.html
pages/mining-platform.html
pages/dynamic-mining-platform.html
pages/gpu-farm-dashboard.html
pages/token-creator.html
pages/solana-token-creator.html
pages/revenue-calculator.html
pages/white-label-generator.html
pages/hashnhedge_navigation.html
pages/node_setup_downloads.html
pages/mining-security-platform.html
pages/index.html

HNH-pool/dashboard.html
HNH-pool/mining-platform.html
HNH-pool/dynamic-mining-platform.html
HNH-pool/gpu-farm-dashboard.html
HNH-pool/token-creator.html
HNH-pool/revenue-calculator.html
HNH-pool/compute-marketplace.html
HNH-pool/white-label-generator.html
HNH-pool/navigation-menu-addition.html
HNH-pool/index.html

docs/dashboard.html
docs/mining-platform.html
docs/dynamic-mining-platform.html
docs/token-creator.html
docs/hashnhedge_navigation.html
docs/node_setup_downloads.html
docs/mining-security-platform.html
docs/index.html
docs/white-label-generator.html
```

### Old/Unused Files (23 files)
```
pool_server_file.js
miner_client_file.js
token_deploy_file.js
deploy.js
package_json_file.json
start_scripts.txt
setup_commands.txt
windows_fix_script.txt
PUBLISH_NOW.bat
hnh-deployment.json
readme_final.md

HNH-pool/windows_fix_script.txt
HNH-pool/hnh-deployment.json
HNH-pool/pool-api-status.html
HNH-pool/mining-pool-landing.html

whitepaper/hnh-token-whitepaper.md (duplicate of pages/whitepaper.html)
```

---

## CSS/JS CLEANUP

### Remove Inline Duplicate Styles
All HTML files have duplicate Tailwind CDN + custom CSS. We should:
1. Create `/assets/css/common.css` with shared styles
2. Remove duplicate style blocks from each HTML file
3. Use single Tailwind CDN reference

### Consolidate JavaScript
Common functions repeated across files:
- `toggleMenu()` - In every page
- `connectWallet()` - In multiple pages
- Network stats fetching - In multiple pages

**Solution:** Create `/assets/js/common.js` with shared functions

---

## PACKAGE.JSON CLEANUP

### Unused Dependencies to Remove
```json
{
  "nodemon": "^3.0.1",           // Only needed in dev
  "simple-update-notifier": "^2.0.0",  // Not used
}
```

### Dev Dependencies to Move
```json
{
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## ESTIMATED SAVINGS

- **Files deleted:** 63 files
- **Lines of code removed:** ~15,000+ lines
- **Duplicate CSS removed:** ~5,000 lines
- **Duplicate JS removed:** ~2,000 lines
- **Repository size reduction:** ~2-3 MB
- **Improved maintainability:** 100% (single source of truth)

---

## CLEANUP SCRIPT

See `cleanup-duplicates.sh` for automated cleanup
