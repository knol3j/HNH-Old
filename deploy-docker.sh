#!/bin/bash
# HashNHedge Docker Deployment Script
# Complete production deployment with health checks

set -e

echo "🚀 HashNHedge Docker Deployment"
echo "================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file with required environment variables"
    echo "Run: cp .env.example .env"
    exit 1
fi

# Load environment variables
source .env

# Verify required variables
REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "VAULT_ROOT_TOKEN"
    "AWS_S3_BUCKET"
    "AWS_ACCESS_KEY_ID"
    "AWS_SECRET_ACCESS_KEY"
    "SENDGRID_API_KEY"
    "ADMIN_API_KEY"
    "SESSION_SECRET"
    "JWT_SECRET"
)

echo "🔍 Checking required environment variables..."
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi
echo -e "${GREEN}✅ All required variables present${NC}"

# Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans || true

# Clean up old volumes (optional - comment out to preserve data)
# echo "🗑️  Removing old volumes..."
# docker volume prune -f

# Build containers
echo ""
echo "🏗️  Building Docker containers..."
docker-compose build --no-cache

# Start infrastructure services first
echo ""
echo "🐘 Starting PostgreSQL..."
docker-compose up -d postgres
echo "Waiting for PostgreSQL to be healthy..."
timeout 60 bash -c 'until docker-compose exec -T postgres pg_isready -U hashnhedge_app -d hashnhedge_vendors; do sleep 2; done'
echo -e "${GREEN}✅ PostgreSQL ready${NC}"

echo ""
echo "🔐 Starting Vault..."
docker-compose up -d vault
echo "Waiting for Vault to be healthy..."
sleep 10
echo -e "${GREEN}✅ Vault ready${NC}"

# Initialize Vault (first time only)
if [ ! -f vault-keys.txt ]; then
    echo ""
    echo "🔑 Initializing Vault (first time setup)..."
    docker-compose exec -T vault vault operator init -key-shares=5 -key-threshold=3 > vault-keys.txt
    chmod 600 vault-keys.txt
    echo -e "${YELLOW}⚠️  IMPORTANT: Vault keys saved to vault-keys.txt - BACK THIS UP SECURELY!${NC}"

    # Unseal vault
    echo "🔓 Unsealing Vault..."
    KEY1=$(grep 'Unseal Key 1:' vault-keys.txt | awk '{print $NF}')
    KEY2=$(grep 'Unseal Key 2:' vault-keys.txt | awk '{print $NF}')
    KEY3=$(grep 'Unseal Key 3:' vault-keys.txt | awk '{print $NF}')

    docker-compose exec -T vault vault operator unseal "$KEY1"
    docker-compose exec -T vault vault operator unseal "$KEY2"
    docker-compose exec -T vault vault operator unseal "$KEY3"

    # Setup transit encryption
    echo "🔐 Setting up Vault transit encryption..."
    docker-compose exec -T vault vault login "$VAULT_ROOT_TOKEN"
    docker-compose exec -T vault vault secrets enable transit
    docker-compose exec -T vault vault write -f transit/keys/vendor-tax-id type=aes256-gcm96 deletion_allowed=false
    docker-compose exec -T vault vault write -f transit/keys/vendor-bank-account type=aes256-gcm96 deletion_allowed=false
    docker-compose exec -T vault vault write -f transit/keys/vendor-routing-number type=aes256-gcm96 deletion_allowed=false

    echo -e "${GREEN}✅ Vault initialized and configured${NC}"
fi

# Start application services
echo ""
echo "📦 Starting Vendor Portal..."
docker-compose up -d vendor-portal
echo "Waiting for Vendor Portal to be healthy..."
timeout 60 bash -c 'until curl -sf http://localhost:3334/health > /dev/null; do sleep 2; done'
echo -e "${GREEN}✅ Vendor Portal ready${NC}"

echo ""
echo "⛏️  Starting Mining Pool..."
docker-compose up -d mining-pool
echo "Waiting for Mining Pool to be healthy..."
timeout 60 bash -c 'until curl -sf http://localhost:3335/health > /dev/null; do sleep 2; done'
echo -e "${GREEN}✅ Mining Pool ready${NC}"

# Start nginx
echo ""
echo "🌐 Starting Nginx reverse proxy..."
docker-compose up -d nginx

# Start certbot for SSL
echo ""
echo "🔒 Starting Certbot..."
docker-compose up -d certbot

# Show status
echo ""
echo "📊 Container Status:"
docker-compose ps

# Show logs
echo ""
echo "📝 Recent logs:"
docker-compose logs --tail=20

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "🌐 Services running:"
echo "  • Vendor Portal: http://localhost:3334"
echo "  • Mining Pool API: http://localhost:3335"
echo "  • Stratum Server: stratum+tcp://localhost:3333"
echo "  • PostgreSQL: localhost:5432"
echo "  • Vault: http://localhost:8200"
echo ""
echo "📚 Useful commands:"
echo "  • View logs: docker-compose logs -f [service]"
echo "  • Stop all: docker-compose down"
echo "  • Restart service: docker-compose restart [service]"
echo "  • Shell access: docker-compose exec [service] /bin/sh"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "  1. Back up vault-keys.txt securely"
echo "  2. Configure DNS to point to this server"
echo "  3. Set up SSL certificates with certbot"
echo "  4. Review security settings in production"
