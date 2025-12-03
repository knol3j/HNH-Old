#!/bin/bash

#############################################################################
# HashNHedge Automated Backup Script
#
# Comprehensive backup solution for:
# - Database (PostgreSQL/MySQL)
# - Configuration files
# - Application code
# - Logs
# - User data
#
# Features:
# - Automated scheduling (cron)
# - Compression and encryption
# - Retention policy
# - Cloud sync (optional)
# - Backup verification
#############################################################################

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================

# Backup directory
BACKUP_DIR="/var/backups/hashnhedge"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="hashnhedge_${BACKUP_DATE}"

# Application directory
APP_DIR="/home/user/HNH"

# Database configuration
DB_TYPE="postgresql"  # or "mysql"
DB_NAME="${DB_NAME:-hashnhedge}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Encryption
ENCRYPTION_ENABLED=true
ENCRYPTION_KEY_FILE="/root/.hashnhedge_backup_key"

# Retention policy (days)
RETENTION_DAYS=30

# Cloud backup (optional)
CLOUD_BACKUP_ENABLED=false
CLOUD_PROVIDER="s3"  # s3, gcs, azure
CLOUD_BUCKET="hashnhedge-backups"

# Notification
NOTIFY_EMAIL=""  # Set email for notifications

# ============================================================================
# FUNCTIONS
# ============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory: ${BACKUP_DIR}/${BACKUP_NAME}"
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
}

# Backup database
backup_database() {
    log "Backing up database: ${DB_NAME}"

    local db_backup_file="${BACKUP_DIR}/${BACKUP_NAME}/database.sql"

    if [ "$DB_TYPE" = "postgresql" ]; then
        # PostgreSQL backup
        if [ -n "$DATABASE_URL" ]; then
            # Use DATABASE_URL if available
            pg_dump "$DATABASE_URL" > "$db_backup_file"
        else
            # Use individual parameters
            PGPASSWORD="$DB_PASSWORD" pg_dump \
                -h "$DB_HOST" \
                -p "$DB_PORT" \
                -U "$DB_USER" \
                -d "$DB_NAME" \
                > "$db_backup_file"
        fi
    elif [ "$DB_TYPE" = "mysql" ]; then
        # MySQL backup
        mysqldump \
            -h "$DB_HOST" \
            -P "$DB_PORT" \
            -u "$DB_USER" \
            -p"$DB_PASSWORD" \
            "$DB_NAME" \
            > "$db_backup_file"
    fi

    # Verify database backup
    if [ ! -s "$db_backup_file" ]; then
        error "Database backup is empty!"
        return 1
    fi

    log "Database backup complete: $(du -h "$db_backup_file" | cut -f1)"
}

# Backup configuration files
backup_config() {
    log "Backing up configuration files"

    local config_dir="${BACKUP_DIR}/${BACKUP_NAME}/config"
    mkdir -p "$config_dir"

    # Copy important config files (excluding secrets)
    cp -r "${APP_DIR}/hybrid-pool/config" "$config_dir/" 2>/dev/null || true
    cp "${APP_DIR}/.env.example" "$config_dir/" 2>/dev/null || true
    cp "${APP_DIR}/package.json" "$config_dir/" 2>/dev/null || true
    cp "${APP_DIR}/package-lock.json" "$config_dir/" 2>/dev/null || true

    # ⚠️ DO NOT backup .env with secrets!
    # Instead, backup encrypted version
    if [ -f "${APP_DIR}/.env" ]; then
        log "⚠️  Skipping .env (contains secrets)"
    fi

    log "Configuration backup complete"
}

# Backup application code
backup_code() {
    log "Backing up application code"

    local code_dir="${BACKUP_DIR}/${BACKUP_NAME}/code"
    mkdir -p "$code_dir"

    # Create git archive if in git repo
    if [ -d "${APP_DIR}/.git" ]; then
        cd "$APP_DIR"
        git archive --format=tar.gz -o "${code_dir}/code.tar.gz" HEAD
        log "Code backup complete (git archive): $(du -h "${code_dir}/code.tar.gz" | cut -f1)"
    else
        # Fallback: copy entire directory (excluding node_modules, logs, etc.)
        tar -czf "${code_dir}/code.tar.gz" \
            -C "$APP_DIR" \
            --exclude='node_modules' \
            --exclude='.git' \
            --exclude='*.log' \
            --exclude='logs' \
            --exclude='tmp' \
            .
        log "Code backup complete (tar): $(du -h "${code_dir}/code.tar.gz" | cut -f1)"
    fi
}

# Backup logs
backup_logs() {
    log "Backing up logs"

    local logs_dir="${BACKUP_DIR}/${BACKUP_NAME}/logs"
    mkdir -p "$logs_dir"

    # Copy logs from last 7 days
    find "${APP_DIR}/logs" -type f -mtime -7 -exec cp {} "$logs_dir/" \; 2>/dev/null || true

    # Compress logs
    if [ -n "$(ls -A "$logs_dir")" ]; then
        tar -czf "${logs_dir}.tar.gz" -C "$logs_dir" .
        rm -rf "$logs_dir"
        log "Logs backup complete: $(du -h "${logs_dir}.tar.gz" | cut -f1)"
    else
        log "No recent logs to backup"
        rmdir "$logs_dir"
    fi
}

# Backup user data (if applicable)
backup_user_data() {
    log "Backing up user data"

    local data_dir="${BACKUP_DIR}/${BACKUP_NAME}/data"

    # Add your user data directories here
    # Example:
    # mkdir -p "$data_dir"
    # cp -r "${APP_DIR}/uploads" "$data_dir/" 2>/dev/null || true

    log "User data backup complete"
}

# Create backup manifest
create_manifest() {
    log "Creating backup manifest"

    local manifest_file="${BACKUP_DIR}/${BACKUP_NAME}/MANIFEST.txt"

    cat > "$manifest_file" <<EOF
HashNHedge Backup Manifest
==========================

Backup Date: $(date)
Backup Name: ${BACKUP_NAME}
Hostname: $(hostname)
User: $(whoami)

Contents:
---------
$(ls -lh "${BACKUP_DIR}/${BACKUP_NAME}")

Database:
---------
Type: ${DB_TYPE}
Name: ${DB_NAME}
Host: ${DB_HOST}

System Information:
------------------
OS: $(uname -a)
Disk Usage: $(df -h "${BACKUP_DIR}" | tail -1)

Git Information (if available):
------------------------------
$(cd "$APP_DIR" && git log -1 --oneline 2>/dev/null || echo "Not a git repository")

EOF

    log "Manifest created"
}

# Compress backup
compress_backup() {
    log "Compressing backup"

    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"

    local compressed_size=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    log "Backup compressed: ${compressed_size}"

    # Remove uncompressed directory
    rm -rf "$BACKUP_NAME"
}

# Encrypt backup
encrypt_backup() {
    if [ "$ENCRYPTION_ENABLED" = false ]; then
        log "Encryption disabled, skipping"
        return
    fi

    log "Encrypting backup"

    # Generate encryption key if doesn't exist
    if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
        log "Generating new encryption key"
        openssl rand -base64 32 > "$ENCRYPTION_KEY_FILE"
        chmod 600 "$ENCRYPTION_KEY_FILE"
        log "⚠️  Encryption key saved to: $ENCRYPTION_KEY_FILE"
        log "⚠️  STORE THIS KEY SECURELY! You'll need it to restore backups"
    fi

    # Encrypt with AES-256
    openssl enc -aes-256-cbc \
        -salt \
        -in "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
        -out "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.enc" \
        -pass "file:$ENCRYPTION_KEY_FILE"

    # Remove unencrypted file
    rm "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

    local encrypted_size=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz.enc" | cut -f1)
    log "Backup encrypted: ${encrypted_size}"
}

# Verify backup
verify_backup() {
    log "Verifying backup integrity"

    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    if [ "$ENCRYPTION_ENABLED" = true ]; then
        backup_file="${backup_file}.enc"
    fi

    # Check file exists and has size
    if [ ! -s "$backup_file" ]; then
        error "Backup file is empty or missing!"
        return 1
    fi

    # Calculate checksum
    local checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
    echo "$checksum  $backup_file" > "${backup_file}.sha256"

    log "Backup verified - SHA256: $checksum"
}

# Upload to cloud (optional)
upload_to_cloud() {
    if [ "$CLOUD_BACKUP_ENABLED" = false ]; then
        log "Cloud backup disabled, skipping"
        return
    fi

    log "Uploading to cloud: $CLOUD_PROVIDER"

    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    if [ "$ENCRYPTION_ENABLED" = true ]; then
        backup_file="${backup_file}.enc"
    fi

    case "$CLOUD_PROVIDER" in
        s3)
            # AWS S3
            aws s3 cp "$backup_file" "s3://${CLOUD_BUCKET}/${BACKUP_NAME}.tar.gz.enc"
            aws s3 cp "${backup_file}.sha256" "s3://${CLOUD_BUCKET}/${BACKUP_NAME}.tar.gz.enc.sha256"
            ;;
        gcs)
            # Google Cloud Storage
            gsutil cp "$backup_file" "gs://${CLOUD_BUCKET}/${BACKUP_NAME}.tar.gz.enc"
            gsutil cp "${backup_file}.sha256" "gs://${CLOUD_BUCKET}/${BACKUP_NAME}.tar.gz.enc.sha256"
            ;;
        azure)
            # Azure Blob Storage
            az storage blob upload \
                --container-name "$CLOUD_BUCKET" \
                --file "$backup_file" \
                --name "${BACKUP_NAME}.tar.gz.enc"
            ;;
        *)
            error "Unknown cloud provider: $CLOUD_PROVIDER"
            return 1
            ;;
    esac

    log "Cloud upload complete"
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days"

    # Local cleanup
    find "$BACKUP_DIR" -name "hashnhedge_*.tar.gz*" -mtime "+${RETENTION_DAYS}" -delete
    log "Local cleanup complete"

    # Cloud cleanup (if enabled)
    if [ "$CLOUD_BACKUP_ENABLED" = true ]; then
        local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)

        case "$CLOUD_PROVIDER" in
            s3)
                aws s3 ls "s3://${CLOUD_BUCKET}/" | \
                    awk '{print $4}' | \
                    grep "hashnhedge_" | \
                    while read file; do
                        file_date=$(echo "$file" | grep -oP '\d{8}')
                        if [ "$file_date" -lt "$cutoff_date" ]; then
                            aws s3 rm "s3://${CLOUD_BUCKET}/${file}"
                            log "Deleted from S3: $file"
                        fi
                    done
                ;;
            # Add other cloud providers as needed
        esac

        log "Cloud cleanup complete"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    if [ -z "$NOTIFY_EMAIL" ]; then
        return
    fi

    local subject="HashNHedge Backup ${status}: ${BACKUP_NAME}"

    echo "$message" | mail -s "$subject" "$NOTIFY_EMAIL"
}

# ============================================================================
# MAIN BACKUP PROCESS
# ============================================================================

main() {
    log "========================================="
    log "HashNHedge Automated Backup"
    log "========================================="

    local start_time=$(date +%s)

    # Create backup directory
    create_backup_dir

    # Run backup steps
    backup_database || { error "Database backup failed"; exit 1; }
    backup_config
    backup_code
    backup_logs
    backup_user_data

    # Create manifest
    create_manifest

    # Compress and encrypt
    compress_backup
    encrypt_backup

    # Verify
    verify_backup || { error "Backup verification failed"; exit 1; }

    # Upload to cloud (if enabled)
    upload_to_cloud

    # Cleanup old backups
    cleanup_old_backups

    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log "========================================="
    log "Backup completed successfully in ${duration}s"
    log "========================================="

    # Send success notification
    send_notification "SUCCESS" "Backup completed successfully in ${duration}s\nBackup: ${BACKUP_NAME}"
}

# ============================================================================
# ERROR HANDLING
# ============================================================================

trap 'error "Backup failed!"; send_notification "FAILED" "Backup failed at line $LINENO"; exit 1' ERR

# ============================================================================
# EXECUTION
# ============================================================================

# Check if running as root (recommended for database backups)
if [ "$EUID" -ne 0 ]; then
    log "⚠️  Warning: Not running as root. Some backups may fail."
fi

# Check required tools
for cmd in tar gzip openssl; do
    if ! command -v $cmd &> /dev/null; then
        error "Required command not found: $cmd"
        exit 1
    fi
done

# Check database tools
if [ "$DB_TYPE" = "postgresql" ]; then
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found. Install postgresql-client"
        exit 1
    fi
elif [ "$DB_TYPE" = "mysql" ]; then
    if ! command -v mysqldump &> /dev/null; then
        error "mysqldump not found. Install mysql-client"
        exit 1
    fi
fi

# Run main backup
main

# ============================================================================
# CRON SETUP INSTRUCTIONS
# ============================================================================

# To schedule automatic backups, add to crontab:
#
# Daily backup at 2 AM:
# 0 2 * * * /home/user/HNH/security/automated-backup.sh >> /var/log/hashnhedge-backup.log 2>&1
#
# Weekly backup on Sunday at 3 AM:
# 0 3 * * 0 /home/user/HNH/security/automated-backup.sh >> /var/log/hashnhedge-backup.log 2>&1
#
# Setup:
# sudo crontab -e
# Add the line above
# Save and exit
#
# View cron logs:
# tail -f /var/log/hashnhedge-backup.log
