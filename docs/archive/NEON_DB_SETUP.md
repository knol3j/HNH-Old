# Neon Database Configuration Guide

Your Neon database endpoint has been configured in the HashNHedge project.

## 🔗 Database Information

**Neon REST API Endpoint:**
```
https://ep-purple-haze-aewduoz4.apirest.c-2.us-east-2.aws.neon.tech/neondb/rest/v1
```

**PostgreSQL Connection String (Template):**
```
postgresql://user:password@ep-purple-haze-aewduoz4.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Region:** `us-east-2` (AWS US East Ohio)

---

## ✅ Files Updated

### 1. `.env.example` (Template)
Updated to include:
- `NEON_API_ENDPOINT` - REST API endpoint
- `DATABASE_URL` - PostgreSQL connection string template

### 2. `netlify.toml` (Production & Staging)
Added Neon database environment variables to:
- `[context.production.environment]`
- `[context.deploy-preview.environment]`

### 3. `.env` (Active Configuration)
Created with your Neon endpoint configured and ready to use.

---

## 🔧 Next Steps

### Step 1: Get Your Neon Database Credentials

1. Go to your [Neon Console](https://console.neon.tech)
2. Select your project: `ep-purple-haze-aewduoz4`
3. Navigate to **Dashboard** → **Connection Details**
4. Copy your credentials:
   - **Username** (usually your Neon user)
   - **Password** (the one you set when creating the database)
   - **Database name** (should be `neondb`)

### Step 2: Update the Connection String

Replace the placeholder in `.env`:

**From:**
```env
DATABASE_URL=postgresql://user:password@ep-purple-haze-aewduoz4.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**To:**
```env
DATABASE_URL=postgresql://YOUR_USERNAME:YOUR_PASSWORD@ep-purple-haze-aewduoz4.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Example:**
```env
DATABASE_URL=postgresql://myuser:myP@ssw0rd123@ep-purple-haze-aewduoz4.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Step 3: Initialize Database Schema

Run the database initialization script:

```bash
# Using psql (if installed)
psql "postgresql://YOUR_USERNAME:YOUR_PASSWORD@ep-purple-haze-aewduoz4.us-east-2.aws.neon.tech/neondb?sslmode=require" -f hybrid-pool/database/schema.sql

# OR using Node.js script
node hybrid-pool/database/init-db.js
```

This will create all required tables:
- `workers` - Mining workers/rigs
- `jobs` - AI and mining jobs
- `shares` - Mining shares submitted
- `payments` - Payment records
- `earnings` - Earnings tracker
- `pool_stats` - Pool statistics
- `blocks` - Blocks found
- `api_keys` - API key management
- `email_queue` - Email notifications
- `community_members` - Community registrations
- `vendors` - Vendor registrations
- Plus all related tables

### Step 4: Update Netlify Environment Variables

If using Netlify:

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add/Update:
   ```
   DATABASE_URL = postgresql://YOUR_USERNAME:YOUR_PASSWORD@ep-purple-haze-aewduoz4.us-east-2.aws.neon.tech/neondb?sslmode=require
   NEON_API_ENDPOINT = https://ep-purple-haze-aewduoz4.apirest.c-2.us-east-2.aws.neon.tech/neondb/rest/v1
   ```

---

## 🧪 Testing Database Connection

### Test with Node.js

Create a test file `test-db.js`:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to Neon database!');

        const result = await client.query('SELECT NOW()');
        console.log('Current time:', result.rows[0].now);

        client.release();
        await pool.end();
    } catch (err) {
        console.error('❌ Database connection error:', err);
    }
}

testConnection();
```

Run:
```bash
node test-db.js
```

### Test with psql

```bash
psql "postgresql://YOUR_USERNAME:YOUR_PASSWORD@ep-purple-haze-aewduoz4.us-east-2.aws.neon.tech/neondb?sslmode=require" -c "SELECT NOW();"
```

---

## 📊 Database Tables Created

After running the schema, you'll have:

### Mining Pool Tables
- `workers` - Connected miners and their stats
- `jobs` - AI and mining job queue
- `shares` - Mining shares (valid/invalid)
- `payments` - Payment history
- `earnings` - Running balance per worker
- `pool_stats` - Pool performance metrics
- `blocks` - Blocks found by pool
- `api_keys` - Admin API authentication

### Community & Vendor Tables
- `community_members` - Community user registrations
- `community_events` - Community events/webinars
- `event_registrations` - Event sign-ups
- `community_contributions` - User contributions
- `vendors` - Vendor registrations
- `vendor_offerings` - Vendor products/services
- `vendor_transactions` - Vendor transaction history
- `vendor_reviews` - Vendor ratings/reviews

### Support Tables
- `documentation` - Help articles and guides
- `email_queue` - Outgoing email queue (SendGrid)

---

## 🔒 Security Best Practices

### 1. Never Commit Database Credentials
The `.env` file is gitignored. **Never commit it!**

### 2. Use Environment Variables
In production, use Netlify/Vercel environment variables, not `.env` files.

### 3. Rotate Credentials Periodically
Change your database password regularly in Neon console.

### 4. Enable Connection Pooling
The registration functions already use connection pooling with `pg.Pool`.

### 5. Use SSL Always
All connections use `sslmode=require` for encryption.

---

## 🚀 Using the Database in Your App

### In Netlify Functions

```javascript
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

exports.handler = async (event) => {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM workers');
        return {
            statusCode: 200,
            body: JSON.stringify(result.rows)
        };
    } finally {
        client.release();
    }
};
```

### In Pool Backend (hybrid-pool)

The pool already uses `DATABASE_URL` from environment:

```javascript
// In hybrid-pool/index.js or payment-tracker.js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
```

---

## 📝 Connection String Breakdown

```
postgresql://user:password@ep-purple-haze-aewduoz4.us-east-2.aws.neon.tech/neondb?sslmode=require
           │    │        │                                                    │      │
           │    │        │                                                    │      └─ SSL required
           │    │        │                                                    └─ Database name
           │    │        └─ Neon host endpoint
           │    └─ Password
           └─ Username
```

---

## ❓ Troubleshooting

### Connection Refused
- Check that your Neon project is active (not suspended)
- Verify credentials are correct
- Ensure SSL is enabled (`sslmode=require`)

### SSL Error
```javascript
ssl: { rejectUnauthorized: false }
```
This allows self-signed certificates (required for Neon).

### Query Timeout
- Neon free tier may suspend after inactivity
- First query after suspension may be slow (cold start)
- Consider upgrading to paid tier for always-on

### Invalid Password
- Password may contain special characters that need URL encoding
- Use `encodeURIComponent()` for special chars:
```javascript
const password = 'my@P@ss!';
const encoded = encodeURIComponent(password); // 'my%40P%40ss!'
```

---

## 🎯 Next Steps

1. ✅ Get your Neon credentials from console
2. ✅ Update `.env` with actual username/password
3. ✅ Run `hybrid-pool/database/schema.sql` to initialize
4. ✅ Test connection with `test-db.js`
5. ✅ Update Netlify environment variables
6. ✅ Test registration functions
7. ✅ Test pool backend database operations

---

## 📚 Resources

- [Neon Documentation](https://neon.tech/docs)
- [Node.js pg Library](https://node-postgres.com/)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)

---

**Your Neon database is configured and ready to use!**

Just add your credentials and initialize the schema. 🚀
