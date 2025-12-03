#!/bin/bash
# Start script with automatic database migration
# This runs the schema push before starting the server

echo "🔄 Checking database schema..."

# Try to push schema changes (will skip if schema is up to date)
npx prisma db push --accept-data-loss --skip-generate 2>&1 | grep -v "warning" || echo "⚠️  Schema push skipped or failed - continuing with startup"

echo "🚀 Starting server..."

# Start the unified API server
exec npm run start:unified
