# HashNHedge Vault Configuration
# HashiCorp Vault setup for encryption key management

# Storage backend - use Consul or file for dev
storage "file" {
  path = "/vault/data"
}

# Listener for API requests
listener "tcp" {
  address     = "127.0.0.1:8200"
  tls_disable = 0  # Enable TLS in production

  # TLS configuration (production)
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
}

# API address
api_addr = "http://127.0.0.1:8200"

# Cluster address (for HA setups)
cluster_addr = "https://127.0.0.1:8201"

# UI
ui = true

# Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}

# Max lease TTL
max_lease_ttl = "768h"
default_lease_ttl = "768h"
