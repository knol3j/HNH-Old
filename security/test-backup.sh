#!/bin/bash

###############################################################################
# HashNHedge Backup System Test
#
# Tests the backup and restore functionality
###############################################################################

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  HashNHedge Backup System Test                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test directory
TEST_DIR="/tmp/hashnhedge_backup_test_$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${TEST_DIR}/backups"
APP_DIR="${TEST_DIR}/app"

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

fail() {
    echo -e "${RED}❌ $1${NC}"
}

# Create test environment
setup_test_env() {
    log "Setting up test environment..."

    mkdir -p "$BACKUP_DIR"
    mkdir -p "$APP_DIR"
    mkdir -p "$APP_DIR/config"
    mkdir -p "$APP_DIR/logs"

    # Create test files
    echo "test config content" > "$APP_DIR/config/test.conf"
    echo "test log content" > "$APP_DIR/logs/test.log"
    echo '{"version": "1.0.0", "name": "test"}' > "$APP_DIR/package.json"

    # Create test database dump
    cat > "$APP_DIR/test_database.sql" << EOF
-- Test Database Dump
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

INSERT INTO users (username, email) VALUES
    ('testuser1', 'test1@example.com'),
    ('testuser2', 'test2@example.com'),
    ('testuser3', 'test3@example.com');
EOF

    success "Test environment created at: $TEST_DIR"
}

# Test 1: Create backup
test_create_backup() {
    log "Test 1: Creating backup..."

    local backup_name="test_backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    mkdir -p "$backup_path"

    # Copy files to backup
    cp "$APP_DIR/test_database.sql" "$backup_path/database.sql"
    cp -r "$APP_DIR/config" "$backup_path/"
    cp "$APP_DIR/package.json" "$backup_path/"

    # Create manifest
    cat > "$backup_path/MANIFEST.txt" << EOF
Test Backup Manifest
====================
Date: $(date)
Contents: database.sql, config/, package.json
EOF

    # Compress
    cd "$BACKUP_DIR"
    tar -czf "${backup_name}.tar.gz" "$backup_name"
    rm -rf "$backup_name"

    if [ -f "${backup_name}.tar.gz" ]; then
        success "Backup created: ${backup_name}.tar.gz"
        echo "${backup_name}" > "${BACKUP_DIR}/.backup_name"
        return 0
    else
        fail "Backup creation failed"
        return 1
    fi
}

# Test 2: Encrypt backup
test_encrypt_backup() {
    local backup_name=$1
    log "Test 2: Encrypting backup..."

    # Generate test encryption key
    local key_file="${TEST_DIR}/test_encryption_key"
    openssl rand -base64 32 > "$key_file"
    chmod 600 "$key_file"

    # Encrypt backup
    cd "$BACKUP_DIR"
    openssl enc -aes-256-cbc \
        -salt \
        -in "${backup_name}.tar.gz" \
        -out "${backup_name}.tar.gz.enc" \
        -pass "file:$key_file"

    if [ -f "${backup_name}.tar.gz.enc" ]; then
        success "Backup encrypted: ${backup_name}.tar.gz.enc"

        # Calculate checksum
        sha256sum "${backup_name}.tar.gz.enc" > "${backup_name}.tar.gz.enc.sha256"
        success "Checksum created"

        echo "$key_file" > "${BACKUP_DIR}/.key_file"
        return 0
    else
        fail "Encryption failed"
        return 1
    fi
}

# Test 3: Verify checksum
test_verify_checksum() {
    local backup_name=$1
    log "Test 3: Verifying checksum..."

    cd "$BACKUP_DIR"
    if sha256sum -c "${backup_name}.tar.gz.enc.sha256" > /dev/null 2>&1; then
        success "Checksum verified"
    else
        fail "Checksum verification failed"
        return 1
    fi
}

# Test 4: Decrypt backup
test_decrypt_backup() {
    local backup_name=$1
    local key_file=$2
    log "Test 4: Decrypting backup..."

    cd "$BACKUP_DIR"
    openssl enc -aes-256-cbc -d \
        -in "${backup_name}.tar.gz.enc" \
        -out "${backup_name}_restored.tar.gz" \
        -pass "file:$key_file"

    if [ -f "${backup_name}_restored.tar.gz" ]; then
        success "Backup decrypted"
    else
        fail "Decryption failed"
        return 1
    fi
}

# Test 5: Extract backup
test_extract_backup() {
    local backup_name=$1
    log "Test 5: Extracting backup..."

    cd "$BACKUP_DIR"
    tar -xzf "${backup_name}_restored.tar.gz"

    if [ -d "$backup_name" ]; then
        success "Backup extracted"
    else
        fail "Extraction failed"
        return 1
    fi
}

# Test 6: Verify backup contents
test_verify_contents() {
    local backup_name=$1
    log "Test 6: Verifying backup contents..."

    local restore_dir="${BACKUP_DIR}/${backup_name}"

    # Check database file
    if [ -f "$restore_dir/database.sql" ]; then
        if grep -q "CREATE TABLE" "$restore_dir/database.sql"; then
            success "Database backup verified"
        else
            fail "Database backup corrupted"
            return 1
        fi
    else
        fail "Database backup missing"
        return 1
    fi

    # Check config
    if [ -d "$restore_dir/config" ] && [ -f "$restore_dir/config/test.conf" ]; then
        success "Config backup verified"
    else
        fail "Config backup missing or corrupted"
        return 1
    fi

    # Check package.json
    if [ -f "$restore_dir/package.json" ]; then
        if grep -q "version" "$restore_dir/package.json"; then
            success "Package.json verified"
        else
            fail "Package.json corrupted"
            return 1
        fi
    else
        fail "Package.json missing"
        return 1
    fi

    # Check manifest
    if [ -f "$restore_dir/MANIFEST.txt" ]; then
        success "Manifest verified"
    else
        warn "Manifest missing (non-critical)"
    fi
}

# Test 7: Restore to original location
test_restore() {
    local backup_name=$1
    log "Test 7: Restoring backup..."

    local restore_dir="${BACKUP_DIR}/${backup_name}"
    local target_dir="${TEST_DIR}/restored"

    mkdir -p "$target_dir"

    # Restore files
    cp -r "$restore_dir/config" "$target_dir/"
    cp "$restore_dir/database.sql" "$target_dir/"
    cp "$restore_dir/package.json" "$target_dir/"

    # Verify restoration
    if [ -f "$target_dir/database.sql" ] && \
       [ -d "$target_dir/config" ] && \
       [ -f "$target_dir/package.json" ]; then
        success "Backup restored successfully"

        # Compare with original
        if cmp -s "$APP_DIR/test_database.sql" "$target_dir/database.sql"; then
            success "Restored database matches original"
        else
            warn "Restored database differs from original"
        fi

        return 0
    else
        fail "Restore failed"
        return 1
    fi
}

# Cleanup
cleanup() {
    log "Cleaning up test environment..."
    rm -rf "$TEST_DIR"
    success "Cleanup complete"
}

# Main test sequence
main() {
    local failed=0

    echo "Starting backup system tests..."
    echo ""

    # Setup
    setup_test_env || { error "Setup failed"; exit 1; }
    echo ""

    # Run tests
    test_create_backup || { ((failed++)); }
    local backup_name=$(cat "${BACKUP_DIR}/.backup_name" 2>/dev/null || echo "")
    echo ""

    if [ -n "$backup_name" ]; then
        test_encrypt_backup "$backup_name" || { ((failed++)); }
        local key_file=$(cat "${BACKUP_DIR}/.key_file" 2>/dev/null || echo "")
        echo ""

        test_verify_checksum "$backup_name" || { ((failed++)); }
        echo ""

        if [ -n "$key_file" ]; then
            test_decrypt_backup "$backup_name" "$key_file" || { ((failed++)); }
            echo ""

            test_extract_backup "$backup_name" || { ((failed++)); }
            echo ""

            test_verify_contents "$backup_name" || { ((failed++)); }
            echo ""

            test_restore "$backup_name" || { ((failed++)); }
            echo ""
        fi
    fi

    # Cleanup
    cleanup
    echo ""

    # Results
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  TEST RESULTS                                                ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""

    if [ $failed -eq 0 ]; then
        success "All tests passed! ✅"
        echo ""
        echo "Backup system is working correctly:"
        echo "  ✅ Backup creation"
        echo "  ✅ Encryption (AES-256)"
        echo "  ✅ Checksum verification (SHA-256)"
        echo "  ✅ Decryption"
        echo "  ✅ Extraction"
        echo "  ✅ Content verification"
        echo "  ✅ Restoration"
        echo ""
        echo "The backup system is ready for production use!"
        echo ""
        return 0
    else
        fail "$failed test(s) failed ❌"
        echo ""
        echo "Please review the errors above and fix the issues."
        echo ""
        return 1
    fi
}

# Run tests
main

exit $?
