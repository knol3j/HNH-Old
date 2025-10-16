#!/bin/bash

# HashNHedge Vault Setup Script
# Initializes Vault for vendor data encryption

echo "🔐 Initializing HashNHedge Vault..."

# Start Vault server (run in separate terminal or as service)
# vault server -config=/path/to/vault-config.hcl

# Wait for Vault to be ready
export VAULT_ADDR='http://127.0.0.1:8200'

# Initialize Vault (only run once!)
echo "Initializing Vault (save these keys securely!)..."
vault operator init -key-shares=5 -key-threshold=3 > vault-keys.txt

echo "⚠️  CRITICAL: Vault keys saved to vault-keys.txt"
echo "⚠️  Store these keys in a secure location (1Password, encrypted storage)"
echo ""

# Extract unseal keys and root token
UNSEAL_KEY_1=$(grep 'Unseal Key 1' vault-keys.txt | awk '{print $NF}')
UNSEAL_KEY_2=$(grep 'Unseal Key 2' vault-keys.txt | awk '{print $NF}')
UNSEAL_KEY_3=$(grep 'Unseal Key 3' vault-keys.txt | awk '{print $NF}')
ROOT_TOKEN=$(grep 'Initial Root Token' vault-keys.txt | awk '{print $NF}')

# Unseal Vault (requires 3 of 5 keys)
echo "Unsealing Vault..."
vault operator unseal $UNSEAL_KEY_1
vault operator unseal $UNSEAL_KEY_2
vault operator unseal $UNSEAL_KEY_3

# Login with root token
echo "Logging in to Vault..."
vault login $ROOT_TOKEN

# Enable secrets engines
echo "Enabling secrets engines..."

# KV v2 for general secrets
vault secrets enable -path=hashnhedge kv-v2

# Transit engine for encryption as a service
vault secrets enable transit

# Create encryption keys
echo "Creating encryption keys..."

# Key for vendor tax IDs
vault write -f transit/keys/vendor-tax-id \
  type=aes256-gcm96 \
  deletion_allowed=false \
  exportable=false

# Key for vendor bank accounts
vault write -f transit/keys/vendor-bank-account \
  type=aes256-gcm96 \
  deletion_allowed=false \
  exportable=false

# Key for vendor routing numbers
vault write -f transit/keys/vendor-routing \
  type=aes256-gcm96 \
  deletion_allowed=false \
  exportable=false

# Create application policy
echo "Creating application policy..."

cat > hashnhedge-app-policy.hcl <<EOF
# Policy for HashNHedge application

# Read/write access to hashnhedge KV store
path "hashnhedge/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "hashnhedge/metadata/*" {
  capabilities = ["list", "read"]
}

# Encrypt/decrypt vendor data
path "transit/encrypt/vendor-tax-id" {
  capabilities = ["update"]
}

path "transit/decrypt/vendor-tax-id" {
  capabilities = ["update"]
}

path "transit/encrypt/vendor-bank-account" {
  capabilities = ["update"]
}

path "transit/decrypt/vendor-bank-account" {
  capabilities = ["update"]
}

path "transit/encrypt/vendor-routing" {
  capabilities = ["update"]
}

path "transit/decrypt/vendor-routing" {
  capabilities = ["update"]
}

# Database credentials
path "database/creds/hashnhedge-app" {
  capabilities = ["read"]
}
EOF

vault policy write hashnhedge-app hashnhedge-app-policy.hcl

# Create app role for API authentication
echo "Creating AppRole for API..."

vault auth enable approle

vault write auth/approle/role/hashnhedge-app \
  token_policies="hashnhedge-app" \
  token_ttl=1h \
  token_max_ttl=4h

# Get role ID and secret ID
ROLE_ID=$(vault read -field=role_id auth/approle/role/hashnhedge-app/role-id)
SECRET_ID=$(vault write -f -field=secret_id auth/approle/role/hashnhedge-app/secret-id)

# Save to environment file
cat > .env.vault <<EOF
# Vault Configuration
VAULT_ADDR=http://127.0.0.1:8200
VAULT_ROLE_ID=$ROLE_ID
VAULT_SECRET_ID=$SECRET_ID

# DO NOT COMMIT THIS FILE TO GIT
# Add to .gitignore immediately
EOF

echo ""
echo "✅ Vault setup complete!"
echo ""
echo "📝 Important files created:"
echo "   - vault-keys.txt (KEEP SECURE - needed to unseal Vault)"
echo "   - .env.vault (Application credentials)"
echo ""
echo "⚠️  NEXT STEPS:"
echo "   1. Move vault-keys.txt to secure storage (1Password, hardware token)"
echo "   2. Add .env.vault to .gitignore"
echo "   3. Set up Vault auto-unseal (AWS KMS, GCP KMS, Azure Key Vault)"
echo "   4. Configure Vault backups"
echo ""
echo "🔑 Application credentials:"
echo "   VAULT_ROLE_ID: $ROLE_ID"
echo "   VAULT_SECRET_ID: $SECRET_ID"
echo ""
echo "To test encryption:"
echo "   vault write transit/encrypt/vendor-tax-id plaintext=\$(echo '12-3456789' | base64)"
