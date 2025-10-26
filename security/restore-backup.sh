#!/bin/bash

#############################################################################
# HashNHedge Backup Restore Script
#
# Restore backups created by automated-backup.sh
#
# Features:
# - List available backups
# - Decrypt and decompress
# - Restore database
# - Restore configuration
# - Restore code
# - Verify restoration
#############################################################################

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================

BACKUP_DIR="/var/backups/hashnhedge"
APP_DIR="/home/user/HNH"
ENCRYPTION_KEY_FILE="/root/.hashnhedge_backup_key"

# Database configuration
DB_TYPE="postgresql"  # or "mysql"
DB_NAME="${DB_NAME:-hashnhedge}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# List available backups
list_backups() {
    log "Available backups:"
    echo ""

    local count=0
    for backup in $(ls -1t "${BACKUP_DIR}"/hashnhedge_*.tar.gz* 2>/dev/null | grep -v ".sha256$"); do
        count=$((count + 1))
        local size=$(du -h "$backup" | cut -f1)
        local date=$(stat -c %y "$backup" | cut -d' ' -f1,2 | cut -d'.' -f1)
        local name=$(basename "$backup")

        echo "$count) $name"
        echo "   Size: $size"
        echo "   Date: $date"
        echo ""
    done

    if [ $count -eq 0 ]; then
        error "No backups found in $BACKUP_DIR"
        exit 1
    fi
}

# Select backup interactively
select_backup() {
    list_backups

    read -p "Select backup number (or enter filename): " selection

    # Check if numeric selection
    if [[ "$selection" =~ ^[0-9]+$ ]]; then
        local backups=($(ls -1t "${BACKUP_DIR}"/hashnhedge_*.tar.gz* 2>/dev/null | grep -v ".sha256$"))
        local index=$((selection - 1))

        if [ $index -ge 0 ] && [ $index -lt ${#backups[@]} ]; then
            BACKUP_FILE="${backups[$index]}"
        else
            error "Invalid selection"
            exit 1
        fi
    else
        # Assume filename
        if [ -f "${BACKUP_DIR}/${selection}" ]; then
            BACKUP_FILE="${BACKUP_DIR}/${selection}"
        else
            error "Backup file not found: ${selection}"
            exit 1
        fi
    fi

    log "Selected: $(basename "$BACKUP_FILE")"
}

# Verify backup integrity
verify_backup() {
    log "Verifying backup integrity"

    if [ ! -f "${BACKUP_FILE}.sha256" ]; then
        log "⚠️  Warning: No checksum file found, skipping verification"
        return
    fi

    cd "$(dirname "$BACKUP_FILE")"
    if sha256sum -c "$(basename "${BACKUP_FILE}.sha256")" >/dev/null 2>&1; then
        log "✅ Backup integrity verified"
    else
        error "Backup integrity check failed! Backup may be corrupted."
        exit 1
    fi
}

# Decrypt backup
decrypt_backup() {
    if [[ "$BACKUP_FILE" != *.enc ]]; then
        log "Backup is not encrypted, skipping decryption"
        return
    fi

    log "Decrypting backup"

    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        error "Encryption key not found: $ENCRYPTION_KEY_FILE"
        error "Cannot decrypt backup without encryption key!"
        exit 1
    fi

    local decrypted_file="${BACKUP_FILE%.enc}"

    openssl enc -aes-256-cbc -d \
        -in "$BACKUP_FILE" \
        -out "$decrypted_file" \
        -pass "file:$ENCRYPTION_KEY_FILE"

    BACKUP_FILE="$decrypted_file"
    log "Backup decrypted"
}

# Extract backup
extract_backup() {
    log "Extracting backup"

    cd "$BACKUP_DIR"
    tar -xzf "$(basename "$BACKUP_FILE")"

    # Get extracted directory name
    EXTRACTED_DIR="${BACKUP_FILE%.tar.gz}"
    EXTRACTED_DIR="${EXTRACTED_DIR%.enc}"
    EXTRACTED_DIR="$(basename "$EXTRACTED_DIR")"

    if [ ! -d "${BACKUP_DIR}/${EXTRACTED_DIR}" ]; then
        error "Failed to extract backup"
        exit 1
    fi

    log "Backup extracted to: ${BACKUP_DIR}/${EXTRACTED_DIR}"
}

# Show backup manifest
show_manifest() {
    local manifest_file="${BACKUP_DIR}/${EXTRACTED_DIR}/MANIFEST.txt"

    if [ -f "$manifest_file" ]; then
        log "Backup Manifest:"
        echo "----------------------------------------"
        cat "$manifest_file"
        echo "----------------------------------------"
    else
        log "⚠️  No manifest file found"
    fi
}

# Restore database
restore_database() {
    log "Restoring database: ${DB_NAME}"

    local db_file="${BACKUP_DIR}/${EXTRACTED_DIR}/database.sql"

    if [ ! -f "$db_file" ]; then
        error "Database backup not found: $db_file"
        return 1
    fi

    # Confirmation
    read -p "⚠️  This will OVERWRITE the current database. Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Database restore cancelled"
        return
    fi

    # Backup current database first
    log "Creating backup of current database before restore..."
    local current_backup="/tmp/hashnhedge_pre_restore_$(date +%Y%m%d_%H%M%S).sql"

    if [ "$DB_TYPE" = "postgresql" ]; then
        if [ -n "$DATABASE_URL" ]; then
            pg_dump "$DATABASE_URL" > "$current_backup"
        else
            PGPASSWORD="$DB_PASSWORD" pg_dump \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                > "$current_backup"
        fi
        log "Current database backed up to: $current_backup"

        # Restore
        if [ -n "$DATABASE_URL" ]; then
            psql "$DATABASE_URL" < "$db_file"
        else
            PGPASSWORD="$DB_PASSWORD" psql \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                < "$db_file"
        fi

    elif [ "$DB_TYPE" = "mysql" ]; then
        mysqldump \
            -h "$DB_HOST" \
            -P "$DB_PORT" \
            -u "$DB_USER" \
            -p"$DB_PASSWORD" \
            "$DB_NAME" \
            > "$current_backup"
        log "Current database backed up to: $current_backup"

        # Restore
        mysql \
            -h "$DB_HOST" \
            -P "$DB_PORT" \
            -u "$DB_USER" \
            -p"$DB_PASSWORD" \
            "$DB_NAME" \
            < "$db_file"
    fi

    log "✅ Database restored successfully"
    log "If something went wrong, restore from: $current_backup"
}

# Restore configuration
restore_config() {
    log "Restoring configuration files"

    local config_dir="${BACKUP_DIR}/${EXTRACTED_DIR}/config"

    if [ ! -d "$config_dir" ]; then
        log "⚠️  No configuration backup found"
        return
    fi

    # Confirmation
    read -p "⚠️  This will overwrite configuration files. Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Configuration restore cancelled"
        return
    fi

    # Backup current config
    log "Backing up current configuration..."
    cp -r "${APP_DIR}/hybrid-pool/config" "${APP_DIR}/hybrid-pool/config.backup_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

    # Restore config
    cp -r "${config_dir}/config" "${APP_DIR}/hybrid-pool/" 2>/dev/null || true
    cp "${config_dir}/package.json" "${APP_DIR}/" 2>/dev/null || true

    log "✅ Configuration restored"
}

# Restore code
restore_code() {
    log "Restoring application code"

    local code_file="${BACKUP_DIR}/${EXTRACTED_DIR}/code/code.tar.gz"

    if [ ! -f "$code_file" ]; then
        log "⚠️  No code backup found"
        return
    fi

    # Confirmation
    read -p "⚠️  This will overwrite application code. Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log "Code restore cancelled"
        return
    fi

    # Backup current code
    log "Backing up current code..."
    tar -czf "${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S).tar.gz" \
        -C "$(dirname "$APP_DIR")" \
        "$(basename "$APP_DIR")" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log'

    # Restore code
    tar -xzf "$code_file" -C "$APP_DIR"

    log "✅ Code restored"
    log "⚠️  Run 'npm install' to restore dependencies"
}

# Restore logs
restore_logs() {
    log "Restoring logs"

    local logs_file="${BACKUP_DIR}/${EXTRACTED_DIR}/logs.tar.gz"

    if [ ! -f "$logs_file" ]; then
        log "⚠️  No logs backup found"
        return
    fi

    mkdir -p "${APP_DIR}/logs"
    tar -xzf "$logs_file" -C "${APP_DIR}/logs"

    log "✅ Logs restored"
}

# Cleanup
cleanup() {
    log "Cleaning up temporary files"

    # Remove extracted directory
    rm -rf "${BACKUP_DIR}/${EXTRACTED_DIR}"

    # Remove decrypted file if it exists
    local decrypted_file="${BACKUP_FILE%.enc}"
    if [ -f "$decrypted_file" ] && [[ "$BACKUP_FILE" == *.enc ]]; then
        rm "$decrypted_file"
    fi

    log "Cleanup complete"
}

# ============================================================================
# MAIN RESTORE PROCESS
# ============================================================================

main() {
    log "========================================="
    log "HashNHedge Backup Restore"
    log "========================================="
    echo ""

    # Select backup
    if [ -z "$1" ]; then
        select_backup
    else
        BACKUP_FILE="$1"
        if [ ! -f "$BACKUP_FILE" ]; then
            error "Backup file not found: $BACKUP_FILE"
            exit 1
        fi
    fi

    # Verify backup
    verify_backup

    # Decrypt if encrypted
    decrypt_backup

    # Extract backup
    extract_backup

    # Show manifest
    show_manifest

    echo ""
    log "Select components to restore:"
    echo "1) Database only"
    echo "2) Configuration only"
    echo "3) Code only"
    echo "4) Logs only"
    echo "5) Everything (database + config + code + logs)"
    echo "6) Custom selection"
    echo ""

    read -p "Enter selection (1-6): " restore_choice

    case $restore_choice in
        1)
            restore_database
            ;;
        2)
            restore_config
            ;;
        3)
            restore_code
            ;;
        4)
            restore_logs
            ;;
        5)
            restore_database
            restore_config
            restore_code
            restore_logs
            ;;
        6)
            read -p "Restore database? (y/n): " db_choice
            [ "$db_choice" = "y" ] && restore_database

            read -p "Restore configuration? (y/n): " config_choice
            [ "$config_choice" = "y" ] && restore_config

            read -p "Restore code? (y/n): " code_choice
            [ "$code_choice" = "y" ] && restore_code

            read -p "Restore logs? (y/n): " logs_choice
            [ "$logs_choice" = "y" ] && restore_logs
            ;;
        *)
            error "Invalid selection"
            exit 1
            ;;
    esac

    # Cleanup
    cleanup

    log "========================================="
    log "Restore completed successfully"
    log "========================================="
    echo ""
    log "⚠️  Important next steps:"
    echo "1. Verify restored data is correct"
    echo "2. Run 'npm install' if code was restored"
    echo "3. Restart application services"
    echo "4. Test application functionality"
}

# ============================================================================
# ERROR HANDLING
# ============================================================================

trap 'error "Restore failed!"; cleanup; exit 1' ERR

# ============================================================================
# EXECUTION
# ============================================================================

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log "⚠️  Warning: Not running as root. Some operations may fail."
fi

# Run main restore
main "$@"

# ============================================================================
# USAGE
# ============================================================================

# Interactive mode:
# sudo ./restore-backup.sh
#
# Specify backup file:
# sudo ./restore-backup.sh /var/backups/hashnhedge/hashnhedge_20250126_020000.tar.gz.enc
#
# Quick database restore:
# sudo ./restore-backup.sh /path/to/backup.tar.gz.enc
# Select option 1 (Database only)
