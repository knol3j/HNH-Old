#!/bin/bash

##############################################################################
#                                                                            #
#           HashNHedge GUI Miner - Build Script                            #
#           Builds executables for Windows, Linux, and MacOS                 #
#                                                                            #
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     HashNHedge GUI Miner - Build Script v2.0            ║
║     Building for Windows, Linux, and MacOS               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo -e "${YELLOW}Please install Node.js from: https://nodejs.org/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
echo ""

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo -e "${YELLOW}Please run this script from the gui-miner directory${NC}"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist/
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

# Build for all platforms
echo -e "${CYAN}🔨 Building for all platforms...${NC}"
echo ""

echo -e "${BLUE}🪟 Building Windows executable...${NC}"
npm run build:windows
echo -e "${GREEN}✅ Windows build complete${NC}"
echo ""

echo -e "${BLUE}🐧 Building Linux packages...${NC}"
npm run build:linux
echo -e "${GREEN}✅ Linux build complete${NC}"
echo ""

echo -e "${BLUE}🍎 Building MacOS application...${NC}"
npm run build:macos
echo -e "${GREEN}✅ MacOS build complete${NC}"
echo ""

# Show build summary
echo -e "${PURPLE}"
echo "═══════════════════════════════════════════════════════════"
echo "                   BUILD COMPLETE! 🎉                      "
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${CYAN}📦 Built files:${NC}"
ls -lh dist/ | grep -E '\.(exe|AppImage|deb|rpm|dmg|zip)$' | awk '{print $9 " (" $5 ")"}'

echo ""
echo -e "${GREEN}✨ All builds completed successfully!${NC}"
echo -e "${CYAN}Find your executables in the dist/ directory${NC}"
echo ""
