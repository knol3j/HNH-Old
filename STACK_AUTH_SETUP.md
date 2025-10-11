# Stack Auth + Neon Database Integration

Complete setup guide for connecting to Neon database via Stack Auth on Netlify.

## 🔐 Stack Auth Configuration

Your Stack Auth credentials are configured for Neon database access:

```env
NEXT_PUBLIC_STACK_PROJECT_ID=039f2a9b-2563-48b6-894b-5e80021afc51
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_agfnrqk3dym95bw43pv065e6aj11szf6jtzzcvgker5d0
STACK_SECRET_SERVER_KEY=ssk_qdps2yy1pw9af7c5hak75731dj6bfzsbxh36axrxq3t2g
```

## 📦 What Was Created

### 1. Netlify Function: `neon-db.js`

Location: `netlify/functions/neon-db.js`

A serverless function that connects to your Neon PostgreSQL database with Stack Auth integration.

**Features:**
- ✅ PostgreSQL connection pool
- ✅ Stack Auth token verification
- ✅ CORS enabled
- ✅ SSL support for Neon
- ✅ Error handling

**Endpoints:**

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/db/health` | GET | Public | Database health check |
| `/db/vendors` | GET | Required | List all vendors |
| `/db/vendors/:id` | GET | Required | Get vendor by ID |
| `/db/vendors` | POST | Public | Create vendor (registration) |
| `/db/vendors/:id/status` | PUT | Required | Update vendor status |
| `/db/pool/stats` | GET | Public | Get pool statistics |
| `/db/query` | POST | Admin | Execute custom query |

### 2. Updated Configuration Files

**netlify.toml:**
- Added Stack Auth environment variables
- Created `/db/*` redirect to neon-db function
- Configured for both production and preview deployments

**.env.example:**
- Added Stack Auth credentials template
- Updated for all deployment environments

**netlify/functions/package.json:**
- Added `pg` (PostgreSQL client)
- Added `cors` for cross-origin requests

## 🚀 Deployment

### Netlify Environment Variables

These are already configured in `netlify.toml`, but you should also set them in Netlify UI for security:

1. Go to **Netlify Dashboard** → Your Site → **Site Settings** → **Environment Variables**

2. Add these variables:

```
NEXT_PUBLIC_STACK_PROJECT_ID = 039f2a9b-2563-48b6-894b-5e80021afc51
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = pck_agfnrqk3dym95bw43pv065e6aj11szf6jtzzcvgker5d0
STACK_SECRET_SERVER_KEY = ssk_qdps2yy1pw9af7c5hak75731dj6bfzsbxh36axrxq3t2g
DATABASE_URL = <your-neon-database-url>
```

3. **Get your Neon DATABASE_URL:**
   - Go to [Neon Console](https://console.neon.tech/)
   - Select your project
   - Copy the connection string (starts with `postgresql://`)
   - Add it as `DATABASE_URL` in Netlify

### Deploy to Netlify

```bash
# Install dependencies
npm install

# Deploy
netlify deploy --prod

# Or push to GitHub (if auto-deploy enabled)
git add .
git commit -m "Add Stack Auth + Neon DB integration"
git push
```

## 🧪 Testing

### 1. Health Check

```bash
# Test database connection
curl https://hashnhedge.com/db/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-05T...",
  "stack": {
    "projectId": "039f2a9b-2563-48b6-894b-5e80021afc51",
    "configured": true
  }
}
```

### 2. Create Vendor (Public)

```bash
curl -X POST https://hashnhedge.com/db/vendors \
  -H "Content-Type: application/json" \
  -d '{
    "legal_business_name": "Test Corp",
    "business_type": "LLC",
    "contact_email": "test@example.com",
    "contact_phone": "+1-555-0100",
    "contact_first_name": "John",
    "contact_last_name": "Doe"
  }'

# Expected response:
{
  "success": true,
  "vendor": {
    "vendor_id": "...",
    "legal_business_name": "Test Corp",
    "status": "pending_review",
    "created_at": "2025-01-05T..."
  }
}
```

### 3. List Vendors (Authenticated)

```bash
curl https://hashnhedge.com/db/vendors \
  -H "X-Stack-Auth: Bearer YOUR_AUTH_TOKEN"

# Expected response:
{
  "vendors": [
    {
      "vendor_id": "...",
      "legal_business_name": "Test Corp",
      "business_type": "LLC",
      "contact_email": "test@example.com",
      "status": "pending_review",
      "created_at": "2025-01-05T..."
    }
  ],
  "count": 1
}
```

### 4. Get Pool Stats (Public)

```bash
curl https://hashnhedge.com/db/pool/stats

# Expected response:
{
  "total_workers": 0,
  "total_hashrate": 0,
  "total_shares": 0,
  "total_balance": 0
}
```

## 🔧 Database Schema

The function expects these tables in your Neon database:

### vendors table

```sql
CREATE TABLE vendors (
    vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legal_business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(50),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    contact_first_name VARCHAR(100),
    contact_last_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending_review',
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### vendor_stats table (optional)

```sql
CREATE TABLE vendor_stats (
    vendor_id UUID PRIMARY KEY REFERENCES vendors(vendor_id),
    total_jobs INTEGER DEFAULT 0,
    total_spend DECIMAL(10,2) DEFAULT 0,
    avg_job_cost DECIMAL(10,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### miners table (for pool stats)

```sql
CREATE TABLE miners (
    worker_id VARCHAR(100) PRIMARY KEY,
    wallet_address VARCHAR(100),
    hashrate DECIMAL(10,2) DEFAULT 0,
    shares_accepted INTEGER DEFAULT 0,
    shares_rejected INTEGER DEFAULT 0,
    balance DECIMAL(18,8) DEFAULT 0,
    last_seen TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Initialize Schema in Neon

1. Go to [Neon Console](https://console.neon.tech/)
2. Select your project
3. Open **SQL Editor**
4. Copy and paste the schema from `hnh-vendor-portal/database/schema.sql`
5. Execute the SQL

Or use the Neon CLI:

```bash
# Install Neon CLI
npm install -g neonctl

# Login
neonctl auth

# Execute schema
neonctl sql < hnh-vendor-portal/database/schema.sql
```

## 🔐 Authentication Flow

### For Public Endpoints (Registration)

No authentication required:
- `/db/health`
- `/db/vendors` (POST)
- `/db/pool/stats`

### For Protected Endpoints (Admin)

Include Stack Auth token in request:

```javascript
// Frontend - Get Stack Auth token
import { useUser } from '@stackframe/react';

const { user } = useUser();
const token = await user.getAuthToken();

// Make authenticated request
fetch('https://hashnhedge.com/db/vendors', {
  headers: {
    'X-Stack-Auth': `Bearer ${token}`
  }
});
```

### Backend Authentication

The `neon-db.js` function automatically verifies tokens:

```javascript
const verifyAuth = async (event) => {
    const authHeader = event.headers['x-stack-auth'];
    const token = authHeader.replace('Bearer ', '');

    // Verify token with Stack Auth
    // Returns user info if valid, null if invalid
};
```

## 📊 Usage Examples

### Frontend Integration

```javascript
// Register new vendor (public)
async function registerVendor(vendorData) {
    const response = await fetch('https://hashnhedge.com/db/vendors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(vendorData)
    });

    return response.json();
}

// Get vendors list (authenticated)
async function getVendors(authToken) {
    const response = await fetch('https://hashnhedge.com/db/vendors', {
        headers: {
            'X-Stack-Auth': `Bearer ${authToken}`
        }
    });

    return response.json();
}

// Update vendor status (authenticated)
async function approveVendor(vendorId, authToken) {
    const response = await fetch(`https://hashnhedge.com/db/vendors/${vendorId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Stack-Auth': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: 'approved' })
    });

    return response.json();
}
```

### React Component Example

```jsx
import { useUser } from '@stackframe/react';
import { useState, useEffect } from 'react';

function VendorList() {
    const { user } = useUser();
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchVendors() {
            if (!user) return;

            const token = await user.getAuthToken();
            const response = await fetch('https://hashnhedge.com/db/vendors', {
                headers: {
                    'X-Stack-Auth': `Bearer ${token}`
                }
            });

            const data = await response.json();
            setVendors(data.vendors);
            setLoading(false);
        }

        fetchVendors();
    }, [user]);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <h2>Vendors ({vendors.length})</h2>
            {vendors.map(vendor => (
                <div key={vendor.vendor_id}>
                    <h3>{vendor.legal_business_name}</h3>
                    <p>Status: {vendor.status}</p>
                    <p>Email: {vendor.contact_email}</p>
                </div>
            ))}
        </div>
    );
}
```

## 🐛 Troubleshooting

### Database Connection Failed

**Error**: "DATABASE_URL not configured"

**Solution**:
1. Add `DATABASE_URL` to Netlify environment variables
2. Get connection string from Neon Console
3. Format: `postgresql://user:pass@host/db?sslmode=require`

### SSL Certificate Error

**Error**: "SSL certificate problem"

**Solution**: Connection uses `ssl: { rejectUnauthorized: false }` by default for Neon compatibility.

### Authentication Failed

**Error**: 401 Unauthorized

**Solution**:
1. Verify Stack Auth token is valid
2. Check token is sent in `X-Stack-Auth` header
3. Ensure `STACK_SECRET_SERVER_KEY` is configured in Netlify

### Query Timeout

**Error**: "Connection timeout"

**Solution**:
1. Check Neon database is active (auto-pauses after inactivity)
2. Increase `connectionTimeoutMillis` in pool config
3. Verify network connectivity to Neon

## 📚 Resources

- [Stack Auth Docs](https://docs.stack-auth.com/)
- [Neon Database Docs](https://neon.tech/docs)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [PostgreSQL Node.js Client](https://node-postgres.com/)

## 🔒 Security Best Practices

1. **Never commit credentials** to git
2. **Use environment variables** for all secrets
3. **Validate all user input** before database queries
4. **Use parameterized queries** to prevent SQL injection
5. **Implement rate limiting** for public endpoints
6. **Log access attempts** for security monitoring
7. **Rotate secrets regularly** (Stack Auth keys, database passwords)

## 📝 Next Steps

1. ✅ Configure DATABASE_URL in Netlify
2. ✅ Initialize database schema in Neon
3. ✅ Deploy to Netlify
4. ✅ Test all endpoints
5. ✅ Integrate with frontend
6. ✅ Set up monitoring and logging
7. ✅ Configure backup strategy
