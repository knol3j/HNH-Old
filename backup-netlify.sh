#!/bin/bash

# Netlify Backup Script
# Creates a complete backup before removing Netlify dependencies

BACKUP_DIR="netlify_backup_$(date +%Y%m%d_%H%M%S)"

echo "🔄 Creating Netlify backup..."
echo "Backup directory: $BACKUP_DIR"
echo ""

mkdir -p "$BACKUP_DIR"

# Function to backup with structure
backup_item() {
    if [ -e "$1" ]; then
        echo "  ✅ Backing up: $1"
        cp -r "$1" "$BACKUP_DIR/" 2>/dev/null || echo "  ⚠️  Warning: Could not backup $1"
    else
        echo "  ⏭️  Skipping (not found): $1"
    fi
}

# Backup .netlify directory
echo "📁 Backing up .netlify directory..."
backup_item ".netlify"

# Backup netlify configuration files
echo ""
echo "📄 Backing up Netlify config files..."
backup_item "netlify.toml"
backup_item "netlify-config.toml"
backup_item "_redirects"
backup_item ".netlify.toml"

# Backup HNH-pool netlify files
echo ""
echo "📂 Backing up HNH-pool Netlify files..."
backup_item "HNH-pool/.netlify"
backup_item "HNH-pool/netlify.toml"

# Backup hybrid-pool netlify files
echo ""
echo "📂 Backing up hybrid-pool Netlify files..."
backup_item "hybrid-pool/netlify.toml"

# Backup Netlify functions
echo ""
echo "⚡ Backing up Netlify functions..."
backup_item "netlify"
backup_item "functions"

# Backup package.json (before changes)
echo ""
echo "📦 Backing up package.json files..."
backup_item "package.json"
backup_item "package-lock.json"
backup_item "HNH-pool/package.json"
backup_item "HNH-pool/package-lock.json"

# Create inventory file
echo ""
echo "📝 Creating inventory file..."
cat > "$BACKUP_DIR/INVENTORY.txt" << EOF
Netlify Backup Inventory
========================
Created: $(date)

Backed up files and directories:
- .netlify/ (entire directory with plugins, functions, state)
- netlify.toml (root config)
- netlify-config.toml (if exists)
- _redirects (if exists)
- HNH-pool/.netlify/
- HNH-pool/netlify.toml
- hybrid-pool/netlify.toml
- netlify/ (functions directory if exists)
- package.json (before modifications)
- package-lock.json (before modifications)

Purpose:
This backup contains all Netlify-related files before removal.
Use this to restore Netlify functionality if needed.

Restoration:
To restore, copy files from this backup back to their original locations.

EOF

# List what was backed up
echo ""
echo "📊 Backup contents:"
ls -lah "$BACKUP_DIR/"

echo ""
echo "✅ Backup complete!"
echo "📁 Location: $BACKUP_DIR"
echo ""
echo "You can now safely remove Netlify dependencies."
