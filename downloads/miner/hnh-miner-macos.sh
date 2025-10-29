#!/bin/bash

##############################################################################
#                                                                            #
#                  HashNHedge Mining Client v2.0                            #
#                  MacOS Installation & Execution Script                     #
#                                                                            #
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HNH_DIR="$HOME/.hashnhedge"
NODE_VERSION="18"

echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          HashNHedge Mining Client v2.0                   ║
║          MacOS Installation Script                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Homebrew
install_homebrew() {
    echo -e "${YELLOW}📦 Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
}

# Function to install Node.js
install_nodejs() {
    echo -e "${YELLOW}📦 Installing Node.js...${NC}"

    if ! command_exists brew; then
        echo -e "${YELLOW}⚠️  Homebrew is not installed${NC}"
        read -p "Would you like to install Homebrew now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_homebrew
        else
            echo -e "${RED}❌ Homebrew is required. Exiting.${NC}"
            exit 1
        fi
    fi

    brew install node
}

# Check if Node.js is installed
if ! command_exists node; then
    echo -e "${YELLOW}⚠️  Node.js is not installed${NC}"
    read -p "Would you like to install Node.js now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_nodejs
    else
        echo -e "${RED}❌ Node.js is required to run the miner. Exiting.${NC}"
        exit 1
    fi
fi

# Verify Node.js version
NODE_VERSION_INSTALLED=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION_INSTALLED" -lt 16 ]; then
    echo -e "${RED}❌ Node.js version 16+ is required. You have v$NODE_VERSION_INSTALLED${NC}"
    echo -e "${CYAN}Please upgrade Node.js: brew upgrade node${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Create HashNHedge directory
mkdir -p "$HNH_DIR"

# Download miner if not present
MINER_FILE="$HNH_DIR/hashnhedge-miner.js"
if [ ! -f "$MINER_FILE" ]; then
    echo -e "${YELLOW}📥 Downloading HashNHedge miner...${NC}"

    # Download from GitHub
    curl -fsSL "https://raw.githubusercontent.com/knol3j/HNH/main/HNH-pool/hashnhedge-miner.js" -o "$MINER_FILE"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Miner downloaded successfully${NC}"
    else
        echo -e "${RED}❌ Failed to download miner${NC}"
        exit 1
    fi
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$HNH_DIR"
if [ ! -d "node_modules" ]; then
    npm init -y > /dev/null 2>&1
    npm install axios > /dev/null 2>&1
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

# Parse command line arguments
WALLET=""
POOL="https://hashnhedge-pool.onrender.com"
WORKER=$(hostname)

while [[ $# -gt 0 ]]; do
    case $1 in
        -w|--wallet)
            WALLET="$2"
            shift 2
            ;;
        -p|--pool)
            POOL="$2"
            shift 2
            ;;
        -n|--worker)
            WORKER="$2"
            shift 2
            ;;
        -h|--help)
            echo -e "${CYAN}Usage: $0 --wallet YOUR_WALLET_ADDRESS [OPTIONS]${NC}"
            echo ""
            echo "Options:"
            echo "  -w, --wallet <address>    Your Solana wallet address (REQUIRED)"
            echo "  -p, --pool <url>          Pool URL (default: https://hashnhedge-pool.onrender.com)"
            echo "  -n, --worker <name>       Worker name (default: hostname)"
            echo "  -h, --help                Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check if wallet is provided
if [ -z "$WALLET" ]; then
    echo -e "${RED}❌ Error: Wallet address is required!${NC}"
    echo -e "${CYAN}Usage: $0 --wallet YOUR_WALLET_ADDRESS${NC}"
    echo -e "${CYAN}Run with --help for more options${NC}"
    exit 1
fi

# Display configuration
echo ""
echo -e "${GREEN}🚀 Starting HashNHedge Miner${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}💳 Wallet:${NC} $WALLET"
echo -e "${BLUE}🏊 Pool:${NC} $POOL"
echo -e "${BLUE}🖥️  Worker:${NC} $WORKER"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Start mining
node "$MINER_FILE" --wallet "$WALLET" --pool "$POOL" --worker "$WORKER"
