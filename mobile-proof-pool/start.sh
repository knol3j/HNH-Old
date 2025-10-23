#!/bin/bash

# Mobile Proof Pool Startup Script
# HashNHedge - PhoneProof Network

echo "=================================="
echo "  Mobile Proof Pool - Starting"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✓ Dependencies installed"
    echo ""
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file. Please edit it with your configuration."
    echo ""
fi

# Start the pool server
echo "🚀 Starting Mobile Proof Pool..."
echo ""
echo "Access points:"
echo "  - Dashboard: http://localhost:8080/dashboard"
echo "  - API:       http://localhost:8080/api/stats"
echo "  - Stratum:   stratum+tcp://localhost:3333"
echo "  - WebSocket: ws://localhost:8081"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
