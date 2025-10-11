#!/bin/bash

# Optional: Remove .netlify directories to save space
# Run this only if you're sure you don't need them

echo "⚠️  WARNING: This will DELETE .netlify directories (~100MB)"
echo "Backup is in netlify_backup_manual/"
echo ""
read -p "Continue? (type 'yes' to proceed): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Removing .netlify directories..."

# Remove root .netlify
if [ -d ".netlify" ]; then
    echo "  🗑️  Removing: .netlify/"
    rm -rf .netlify
    echo "  ✅ Deleted"
else
    echo "  ⏭️  .netlify/ not found"
fi

# Remove HNH-pool .netlify
if [ -d "HNH-pool/.netlify" ]; then
    echo "  🗑️  Removing: HNH-pool/.netlify/"
    rm -rf HNH-pool/.netlify
    echo "  ✅ Deleted"
else
    echo "  ⏭️  HNH-pool/.netlify/ not found"
fi

echo ""
echo "✅ Complete!"
echo ""
echo "Space saved: ~100MB"
echo "Backup location: netlify_backup_manual/"
