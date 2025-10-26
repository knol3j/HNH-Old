# Encryption Key Backup Documentation

**Generated:** $(date)
**System:** HashNHedge Production

---

## 🔐 Critical Encryption Keys

### Backup Encryption Key

**Location:** `/home/user/HNH/.secure/backup_encryption_key`

**Purpose:** Encrypts all automated backups (database, config, code, logs)

**Backup Locations:**
1. Primary: `/home/user/HNH/.secure/backup_encryption_key`
2. Secure copy: `/home/user/HNH/.secure/backup_encryption_key.bak`
3. **REQUIRED:** Store offline in secure vault/password manager

---

## ⚠️ CRITICAL WARNINGS

### WITHOUT THIS KEY YOU CANNOT:
- Decrypt backup files
- Restore from encrypted backups
- Recover data in disaster scenarios

### SECURITY REQUIREMENTS:
- ✅ Never commit to git (already in .gitignore)
- ✅ Never share via email/chat
- ✅ Never store in plain text documents
- ✅ Store in encrypted password vault (1Password, LastPass, Bitwarden, etc.)
- ✅ Keep offline backup in secure physical location
- ✅ Restrict file permissions (chmod 600)

---

## 📋 Key Rotation Schedule

- **Initial Creation:** $(date)
- **Last Rotation:** $(date)
- **Next Rotation:** $(date -d "+90 days" 2>/dev/null || date -v +90d 2>/dev/null || echo "3 months from now")

### Rotation Procedure:

1. **Before Rotating:**
   ```bash
   # Ensure all recent backups can be decrypted with current key
   bash security/restore-backup.sh
   # Select a recent backup and test restore
   ```

2. **Generate New Key:**
   ```bash
   # Backup old key
   cp .secure/backup_encryption_key .secure/backup_encryption_key.old

   # Generate new key
   openssl rand -base64 32 > .secure/backup_encryption_key
   chmod 600 .secure/backup_encryption_key
   ```

3. **After Rotating:**
   ```bash
   # Create new backup with new key
   bash security/automated-backup.sh

   # Test restoration with new key
   bash security/restore-backup.sh
   ```

4. **Keep Old Key:**
   - Keep old key for 90 days to decrypt old backups
   - Store with label "OLD - Valid until $(date -d "+90 days" 2>/dev/null || echo "3 months")"

---

## 🔄 Disaster Recovery - Key Lost

If encryption key is lost:

### Option 1: Restore from Key Backup
```bash
# If you have offline backup of key
cp /path/to/backup/key .secure/backup_encryption_key
chmod 600 .secure/backup_encryption_key
```

### Option 2: Use Unencrypted Backups
```bash
# If you have older unencrypted backups
# Located in: /var/backups/hashnhedge/
# Look for files without .enc extension
tar -xzf backup_filename.tar.gz
```

### Option 3: Emergency Database Export
```bash
# If database is still accessible, export directly
pg_dump $DATABASE_URL > emergency_backup.sql
```

---

## 📍 Key Storage Locations

### Primary Storage
```bash
/home/user/HNH/.secure/backup_encryption_key
```

### Backup Storage (Create These)
```bash
# Create secure backup
cp .secure/backup_encryption_key .secure/backup_encryption_key.bak

# Create encrypted archive for offline storage
tar -czf backup_key_$(date +%Y%m%d).tar.gz .secure/backup_encryption_key
openssl enc -aes-256-cbc -salt -in backup_key_*.tar.gz -out backup_key_encrypted.tar.gz.enc
# Use strong passphrase you'll remember
rm backup_key_*.tar.gz  # Remove unencrypted archive
```

### Recommended External Storage
1. **Password Manager:** Store in secure note (1Password, LastPass, Bitwarden)
2. **Encrypted USB:** Store encrypted copy on USB drive in safe
3. **Paper Backup:** Print QR code or Base64, store in safe deposit box
4. **Cloud Backup:** Encrypted with separate strong passphrase

---

## 🔍 Verification

### Verify Key Exists and Has Correct Permissions:
```bash
ls -la /home/user/HNH/.secure/backup_encryption_key
# Should show: -rw------- (600 permissions)
```

### Verify Key Can Decrypt Backups:
```bash
# Test decryption
openssl enc -aes-256-cbc -d \
    -in /var/backups/hashnhedge/latest.tar.gz.enc \
    -out /tmp/test.tar.gz \
    -pass file:.secure/backup_encryption_key

# Verify file is valid tar.gz
file /tmp/test.tar.gz
# Should show: gzip compressed data

# Clean up
rm /tmp/test.tar.gz
```

---

## 📞 Emergency Contacts

**System Administrator:** [Your Name]
**Email:** [your-email@example.com]
**Phone:** [your-phone]

**Backup Storage Locations:**
- [ ] Password Manager: _______________
- [ ] Physical Safe: _______________
- [ ] Bank Safe Deposit Box: _______________
- [ ] Trusted Person: _______________

---

## ✅ Checklist

After creating encryption key:

- [x] Key generated with OpenSSL (32 bytes, base64)
- [x] Key file permissions set to 600
- [x] Key location documented
- [ ] Key backed up to password manager
- [ ] Key backed up to encrypted USB drive
- [ ] Key backed up to offline storage
- [ ] Emergency contacts documented
- [ ] Team members notified of key location
- [ ] Rotation schedule added to calendar
- [ ] Test backup/restore with new key

---

**Last Updated:** $(date)
**Document Version:** 1.0
**Maintained By:** HashNHedge Operations Team

---

## 🔗 Related Documentation

- **Security Guide:** `SECURITY_GUIDE.md`
- **Backup Script:** `security/automated-backup.sh`
- **Restore Script:** `security/restore-backup.sh`
- **Credential Rotation:** `SECURITY_INCIDENT_CREDENTIALS.md`
