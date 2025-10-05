# HashNHedge Vendor Portal

**Secure admin and vendor management portal**

## 🔐 Security by Obscurity

This directory is intentionally named `hnh-vendor-portal` instead of `/admin` to reduce automated attack surface. Common admin paths like `/admin`, `/administrator`, `/dashboard` are frequently targeted by bots.

## 📁 Structure

```
hnh-vendor-portal/
├── index.html                  # Admin login page
├── marketplace.html            # Compute marketplace (admin only)
├── vendor-management.html      # Vendor approval workflow
├── vendor-registration.html    # Public vendor signup form
├── vendor-api.js              # Vendor management API
└── README.md                  # This file
```

## 🚪 Access URLs

### Admin Portal
**URL:** `https://hashnhedge.com/hnh-vendor-portal`

**Default Credentials:**
- Username: `admin`
- Password: `hashnhedge2025`

**⚠️ IMPORTANT:** Change these credentials immediately in production!

### Vendor Registration (Public)
**URL:** `https://hashnhedge.com/hnh-vendor-portal/vendor-registration.html`

This is the only publicly accessible page in this directory. Vendors can submit registration applications here.

## 🔒 Security Features

1. **Session-based authentication** - Admin must login
2. **Protected routes** - All admin pages check auth before loading
3. **Encrypted storage** - Tax IDs and bank details encrypted with AES-256
4. **Obscure directory name** - Reduces automated scanning hits
5. **No directory listing** - Configure web server to block listings

## 🛡️ Recommended Security Setup

### 1. Change Directory Name (Optional)
For even better security, rename to something unique:
```bash
mv hnh-vendor-portal hnh-{random-string}
# Example: hnh-9k2m4p8x
```

### 2. Nginx Configuration
```nginx
location /hnh-vendor-portal {
    # Disable directory listing
    autoindex off;

    # Rate limiting
    limit_req zone=admin burst=5;

    # IP whitelist (optional)
    # allow 1.2.3.4;
    # deny all;
}
```

### 3. Apache .htaccess
```apache
# Disable directory browsing
Options -Indexes

# Password protect (additional layer)
AuthType Basic
AuthName "Restricted Area"
AuthUserFile /path/to/.htpasswd
Require valid-user
```

### 4. Cloudflare WAF Rules
- Block requests from known bad actors
- Challenge requests from VPNs/Tor
- Rate limit login attempts

## 📊 Vendor Management Workflow

### 1. Vendor Submits Registration
- Fills out form at `/vendor-registration.html`
- Provides tax info, business details, banking info
- Data encrypted and stored in `data/vendors/pending/`

### 2. Admin Reviews
- Login to admin portal
- Navigate to vendor management
- Review vendor details (tax ID shown masked)
- Approve or reject

### 3. Approved Vendors
- Moved to `data/vendors/approved/`
- Receive API key for job submission
- Can access marketplace to submit AI/ML jobs

### 4. Job Submission
- Approved vendors submit compute jobs via API
- Jobs routed to mining pool automatically
- Vendors billed based on compute usage

## 🔑 API Endpoints

All endpoints require admin API key in header:
```bash
X-API-Key: your-secret-key
```

### Vendor Registration
```bash
POST /api/vendor/register
```

### Get Pending Vendors
```bash
GET /api/vendor/pending
```

### Approve Vendor
```bash
POST /api/vendor/:vendorId/approve
```

### Reject Vendor
```bash
POST /api/vendor/:vendorId/reject
```

## 💾 Data Storage

### Development (Current)
- JSON files in `data/vendors/`
- localStorage for demo purposes
- Encryption using Node.js crypto module

### Production (Recommended)
- PostgreSQL or MongoDB database
- Vault for sensitive credentials
- S3 for document storage (W-9 forms, etc.)

## 🔐 Encryption

Sensitive fields are encrypted with AES-256-CBC:
- Tax ID numbers
- Bank account numbers
- Routing numbers

Encryption key from `VENDOR_ENCRYPTION_KEY` environment variable.

## 📧 Email Notifications

TODO: Configure SendGrid/AWS SES for:
- Vendor registration confirmation
- Admin notification of new registrations
- Approval/rejection emails
- Monthly statements

## 🧪 Testing

### Test Vendor Registration
1. Go to `/vendor-registration.html`
2. Fill out form with test data
3. Check localStorage for stored data
4. Login to admin portal
5. Verify vendor appears in pending queue

### Test Approval Workflow
1. Click "View" on pending vendor
2. Review details
3. Click "Approve" or "Reject"
4. Verify vendor moves to approved list

## 📝 TODO

- [ ] Integrate with actual database (PostgreSQL)
- [ ] Set up SendGrid for email notifications
- [ ] Add 2FA for admin login
- [ ] Implement API key generation for vendors
- [ ] Add document upload (W-9, insurance certs)
- [ ] Create vendor self-service dashboard
- [ ] Add audit logging for all admin actions
- [ ] Implement GDPR data export/deletion

## 🚨 Security Checklist

- [ ] Change default admin password
- [ ] Set strong `ADMIN_API_KEY` environment variable
- [ ] Set secure `VENDOR_ENCRYPTION_KEY` (32 bytes)
- [ ] Enable HTTPS only
- [ ] Configure rate limiting
- [ ] Set up fail2ban for repeated login failures
- [ ] Regular security audits
- [ ] Monitor access logs
- [ ] Backup vendor data regularly

## 📞 Support

For security issues or questions:
- Email: security@hashnhedge.com
- PGP Key: [fingerprint]

---

**Built for HashNHedge** | Secure vendor management 🔒
