#!/bin/bash

# HashNHedge Cleanup Script
# Removes duplicate and redundant files
# BACKUP YOUR FILES BEFORE RUNNING THIS!

echo "🧹 HashNHedge Cleanup Script"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will DELETE 63+ files"
echo "Make sure you have a backup before proceeding!"
echo ""
read -p "Continue? (type 'yes' to proceed): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Create backup
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "✅ Created backup directory: $BACKUP_DIR"

# Function to backup and delete
backup_and_delete() {
    if [ -f "$1" ]; then
        cp "$1" "$BACKUP_DIR/"
        rm "$1"
        echo "  🗑️  Deleted: $1"
    fi
}

echo ""
echo "📂 Removing duplicate HTML pages from /pages/..."
backup_and_delete "pages/dashboard.html"
backup_and_delete "pages/mining-platform.html"
backup_and_delete "pages/dynamic-mining-platform.html"
backup_and_delete "pages/gpu-farm-dashboard.html"
backup_and_delete "pages/token-creator.html"
backup_and_delete "pages/solana-token-creator.html"
backup_and_delete "pages/revenue-calculator.html"
backup_and_delete "pages/white-label-generator.html"
backup_and_delete "pages/hashnhedge_navigation.html"
backup_and_delete "pages/node_setup_downloads.html"
backup_and_delete "pages/mining-security-platform.html"
backup_and_delete "pages/index.html"

echo ""
echo "📂 Removing duplicate HTML pages from /HNH-pool/..."
backup_and_delete "HNH-pool/dashboard.html"
backup_and_delete "HNH-pool/mining-platform.html"
backup_and_delete "HNH-pool/dynamic-mining-platform.html"
backup_and_delete "HNH-pool/gpu-farm-dashboard.html"
backup_and_delete "HNH-pool/token-creator.html"
backup_and_delete "HNH-pool/revenue-calculator.html"
backup_and_delete "HNH-pool/compute-marketplace.html"
backup_and_delete "HNH-pool/white-label-generator.html"
backup_and_delete "HNH-pool/navigation-menu-addition.html"
backup_and_delete "HNH-pool/pool-api-status.html"
backup_and_delete "HNH-pool/mining-pool-landing.html"
backup_and_delete "HNH-pool/index.html"

echo ""
echo "📂 Removing duplicate HTML pages from /docs/..."
backup_and_delete "docs/dashboard.html"
backup_and_delete "docs/mining-platform.html"
backup_and_delete "docs/dynamic-mining-platform.html"
backup_and_delete "docs/token-creator.html"
backup_and_delete "docs/hashnhedge_navigation.html"
backup_and_delete "docs/node_setup_downloads.html"
backup_and_delete "docs/mining-security-platform.html"
backup_and_delete "docs/index.html"

echo ""
echo "📂 Removing old/unused server files..."
backup_and_delete "pool_server_file.js"
backup_and_delete "miner_client_file.js"
backup_and_delete "token_deploy_file.js"
backup_and_delete "deploy.js"

echo ""
echo "📂 Removing old configuration files..."
backup_and_delete "package_json_file.json"
backup_and_delete "hnh-deployment.json"
backup_and_delete "HNH-pool/hnh-deployment.json"

echo ""
echo "📂 Removing old text/script files..."
backup_and_delete "start_scripts.txt"
backup_and_delete "setup_commands.txt"
backup_and_delete "windows_fix_script.txt"
backup_and_delete "HNH-pool/windows_fix_script.txt"
backup_and_delete "PUBLISH_NOW.bat"
backup_and_delete "readme_final.md"

echo ""
echo "📂 Removing old whitepaper duplicate..."
backup_and_delete "whitepaper/hnh-token-whitepaper.md"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Files backed up to: $BACKUP_DIR/"
echo "  - Duplicate HTML pages removed"
echo "  - Old server files removed"
echo "  - Configuration files cleaned up"
echo ""
echo "📍 Remaining structure:"
echo "  ✅ /index.html - Main landing page"
echo "  ✅ /docs/ - Public documentation pages (8 files)"
echo "  ✅ /pages/ - Community pages (2 files)"
echo "  ✅ /downloads/ - Download pages (2 files)"
echo "  ✅ /HNH-pool/ - Mining pool pages (3 files)"
echo "  ✅ /armageddon/ - Mobile mining"
echo "  ✅ /hnh-vendor-portal/ - Enterprise portal"
echo ""
echo "🔍 Next steps:"
echo "  1. Test all navigation links"
echo "  2. Update any broken links in index.html"
echo "  3. Run: npm start"
echo "  4. Verify all pages load correctly"
echo ""
