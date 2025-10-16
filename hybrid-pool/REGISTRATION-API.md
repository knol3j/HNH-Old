# 📝 Community & Vendor Registration API

## Overview

HashNHedge provides registration systems for community members and vendors, all stored in the Neon PostgreSQL database via Netlify Functions with Stack Auth integration for secure authentication.

**Base URL:** `https://your-site.netlify.app`

## 🔐 Authentication

The registration system uses **Stack Auth** for user authentication and session management:

- **Email/Password Authentication**: Secure user registration with password hashing
- **Email Verification**: Automatic email verification links sent to new users
- **Session Management**: JWT-based session tokens for authenticated requests
- **User Management**: Centralized user profiles linked to database records

### Stack Auth Configuration

```javascript
// Server-side (Netlify Functions)
const { stackServerApp } = require('@stackframe/stack');

const stackApp = stackServerApp({
    tokenStore: 'nextjs-cookie',
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY,
    secretServerKey: process.env.STACK_SECRET_SERVER_KEY
});
```

## 🌟 Community Member Registration

### Endpoint

```
POST /api/community/register
```

### Request Body

```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "full_name": "John Doe",
  "wallet_address": "0x1234...",
  "discord_username": "johndoe#1234",
  "telegram_username": "@johndoe",
  "twitter_username": "@johndoe",
  "github_username": "johndoe",
  "bio": "Crypto enthusiast and developer",
  "country": "United States",
  "interests": ["mining", "development", "trading"],
  "skills": ["JavaScript", "Python", "Solidity"],
  "contribution_areas": ["development", "documentation", "community-support"],
  "metadata": {}
}
```

### Required Fields

- `email` (string) - Valid email address
- `username` (string) - Unique username
- `password` (string) - Password for Stack Auth (minimum 8 characters)

### Optional Fields

- `full_name` (string) - Full name
- `wallet_address` (string) - Crypto wallet address
- `discord_username` (string) - Discord handle
- `telegram_username` (string) - Telegram handle
- `twitter_username` (string) - Twitter/X handle
- `github_username` (string) - GitHub username
- `bio` (text) - Short biography
- `country` (string) - Country name
- `interests` (array) - List of interests
- `skills` (array) - List of skills
- `contribution_areas` (array) - Areas willing to contribute
- `metadata` (object) - Additional custom data

### Response

**Success (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "member": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "created_at": "2025-01-01T00:00:00Z",
    "status": "pending"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Email and username are required"
}
```

**Error (409 Conflict):**
```json
{
  "error": "Email or username already registered"
}
```

### Example Usage

```bash
curl -X POST https://your-site.netlify.app/api/community/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "username": "johndoe",
    "password": "securePassword123",
    "full_name": "John Doe",
    "interests": ["mining", "development"],
    "skills": ["JavaScript", "Node.js"]
  }'
```

### Stack Auth Integration

When a user registers:

1. **Stack Auth User Created**: A user account is created in Stack Auth with email/password
2. **Email Verification**: Stack Auth automatically sends verification email
3. **Database Record**: User data stored in PostgreSQL with `stack_user_id` reference
4. **Session Token**: JWT session token issued for authenticated requests

**Database Linking:**
```sql
-- Community member record includes Stack Auth user ID
INSERT INTO community_members (email, username, stack_user_id, ...)
VALUES ('user@example.com', 'johndoe', 'stack_user_abc123', ...);
```

### Database Table

**Table:** `community_members`

**Fields:**
- `id` - UUID primary key
- `email` - Unique email address
- `username` - Unique username
- `status` - pending, active, suspended
- `email_verified` - Email verification status
- `wallet_verified` - Wallet verification status
- `reputation_score` - Community reputation points
- `contributions_count` - Number of contributions made
- Profile, social, and metadata fields

---

## 🏢 Vendor Registration

### Endpoint

```
POST /api/vendor/register
```

### Request Body

```json
{
  "company_name": "Example Corp",
  "legal_name": "Example Corporation Inc.",
  "registration_number": "12345678",
  "tax_id": "98-7654321",
  "contact_email": "contact@example.com",
  "password": "vendorSecure123",
  "contact_phone": "+1-555-0123",
  "website_url": "https://example.com",
  "contact_person_name": "Jane Smith",
  "contact_person_title": "CEO",
  "contact_person_email": "jane@example.com",
  "business_type": "hardware-manufacturer",
  "industry_sector": "Technology",
  "company_size": "medium",
  "established_year": 2020,
  "address_line1": "123 Main St",
  "address_line2": "Suite 100",
  "city": "San Francisco",
  "state_province": "California",
  "postal_code": "94105",
  "country": "United States",
  "payment_wallet_address": "0xabcd...",
  "partnership_type": "technology",
  "products_services": "Mining hardware and software solutions",
  "integration_interest": ["api", "hardware", "software"],
  "expected_volume": "high",
  "terms_accepted": true,
  "metadata": {}
}
```

### Required Fields

- `company_name` (string) - Company name
- `contact_email` (string) - Valid email address
- `contact_person_name` (string) - Contact person's name
- `password` (string) - Password for Stack Auth account (minimum 8 characters)

### Optional But Recommended

- `legal_name` (string) - Legal company name
- `business_type` (string) - Type of business
  - `hardware-manufacturer`
  - `software-provider`
  - `service-provider`
  - `mining-pool`
  - `exchange`
  - `other`
- `company_size` (string) - Company size
  - `startup`
  - `small`
  - `medium`
  - `enterprise`
- `partnership_type` (string) - Partnership interest
  - `technology`
  - `reseller`
  - `integration`
  - `sponsor`
- `expected_volume` (string) - Expected transaction volume
  - `low`
  - `medium`
  - `high`
  - `enterprise`

### Response

**Success (201 Created):**
```json
{
  "success": true,
  "message": "Vendor registration submitted successfully! Our team will review your application and contact you within 2-3 business days.",
  "vendor": {
    "id": "uuid",
    "company_name": "Example Corp",
    "contact_email": "contact@example.com",
    "created_at": "2025-01-01T00:00:00Z",
    "status": "pending"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Company name, contact email, and contact person name are required"
}
```

**Error (409 Conflict):**
```json
{
  "error": "Company name or email already registered"
}
```

### Example Usage

```bash
curl -X POST https://your-site.netlify.app/api/vendor/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Example Hardware Inc",
    "contact_email": "sales@example-hardware.com",
    "password": "vendorSecure123",
    "contact_person_name": "Jane Smith",
    "business_type": "hardware-manufacturer",
    "partnership_type": "technology",
    "products_services": "High-performance mining GPUs",
    "terms_accepted": true
  }'
```

### Stack Auth Integration

Vendor registration also creates a Stack Auth account:

1. **Vendor Contact Account**: Stack Auth user created for the contact person
2. **Vendor Dashboard Access**: Login credentials for vendor portal
3. **Database Linking**: Vendor record linked to Stack Auth via `stack_user_id`
4. **KYB Verification**: Additional verification required before activation

**Database Linking:**
```sql
-- Vendor record includes Stack Auth user ID for contact person
INSERT INTO vendors (company_name, contact_email, stack_user_id, status, ...)
VALUES ('Example Corp', 'contact@example.com', 'stack_vendor_xyz789', 'pending', ...);
```

### Database Table

**Table:** `vendors`

**Fields:**
- `id` - UUID primary key
- Company information (name, legal name, registration, tax ID)
- Contact information (email, phone, website)
- Contact person details
- Business details (type, sector, size)
- Full address
- Payment wallet
- Partnership details
- Compliance (KYB, terms)
- `status` - pending, approved, active, suspended, rejected
- Engagement metrics (transactions, volume, rating)

---

## 📊 Database Schema

### Community Members Table

```sql
CREATE TABLE community_members (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    wallet_address VARCHAR(255),

    -- Social profiles
    discord_username VARCHAR(255),
    telegram_username VARCHAR(255),
    twitter_username VARCHAR(255),
    github_username VARCHAR(255),

    -- Profile
    bio TEXT,
    avatar_url VARCHAR(500),
    country VARCHAR(100),
    timezone VARCHAR(100),

    -- Arrays
    interests TEXT[],
    skills TEXT[],
    contribution_areas TEXT[],

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    email_verified BOOLEAN DEFAULT false,
    wallet_verified BOOLEAN DEFAULT false,

    -- Metrics
    reputation_score INT DEFAULT 0,
    contributions_count INT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

### Vendors Table

```sql
CREATE TABLE vendors (
    id UUID PRIMARY KEY,

    -- Company
    company_name VARCHAR(255) UNIQUE NOT NULL,
    legal_name VARCHAR(255),
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),

    -- Contact
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    contact_phone VARCHAR(50),
    website_url VARCHAR(500),

    -- Contact Person
    contact_person_name VARCHAR(255) NOT NULL,
    contact_person_title VARCHAR(100),
    contact_person_email VARCHAR(255),

    -- Business
    business_type VARCHAR(100),
    industry_sector VARCHAR(100),
    company_size VARCHAR(50),
    established_year INT,

    -- Address
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),

    -- Wallet
    payment_wallet_address VARCHAR(255),
    payment_wallet_verified BOOLEAN DEFAULT false,

    -- Partnership
    partnership_type VARCHAR(50),
    products_services TEXT,
    integration_interest TEXT[],
    expected_volume VARCHAR(50),

    -- Compliance
    kyb_verified BOOLEAN DEFAULT false,
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP,

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    approval_notes TEXT,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔐 Security Features

### Community Registration

✅ **Stack Auth Integration** - Secure password hashing and user management
✅ **Email validation** - Format checking + Stack Auth email verification
✅ **Unique constraints** - Email and username must be unique
✅ **Status management** - Pending verification by default
✅ **JWT Session Tokens** - Secure authenticated sessions
✅ **Email verification** - Automatic verification emails via Stack Auth
✅ **Wallet verification** - Optional wallet linking
✅ **Password Requirements** - Minimum 8 characters enforced

### Vendor Registration

✅ **Stack Auth Integration** - Contact person account with secure authentication
✅ **Email validation** - Format checking + Stack Auth verification
✅ **Unique constraints** - Company name and email must be unique
✅ **Manual approval** - All vendors reviewed before activation
✅ **KYB process** - Know Your Business verification
✅ **Terms acceptance** - Required for legal compliance
✅ **Status tracking** - Pending → Approved → Active
✅ **Vendor Portal Access** - Secure dashboard for approved vendors

---

## 📧 Email Notifications

### Community Members

**On Registration:**
- Welcome email with verification link
- Community guidelines and resources
- Next steps to get involved

**On Verification:**
- Account activated confirmation
- How to earn reputation points
- Contribution opportunities

### Vendors

**On Submission:**
- Application received confirmation
- Expected review timeline (2-3 business days)
- Required documents checklist

**On Approval:**
- Welcome to vendor program
- Partnership agreement
- API credentials and documentation

**On Rejection:**
- Reason for rejection
- How to reapply
- Alternative partnership options

---

## 🎯 Next Steps After Registration

### For Community Members

1. **Email Verification** - Check inbox and verify email
2. **Complete Profile** - Add avatar, bio, skills
3. **Connect Wallet** - Link crypto wallet (optional)
4. **Join Discord/Telegram** - Connect with community
5. **Start Contributing** - Browse open tasks and issues

### For Vendors

1. **Application Review** - Team reviews in 2-3 business days
2. **Documentation** - Prepare KYB documents if required
3. **Approval Notification** - Receive approval email
4. **Onboarding Call** - Schedule with partnership team
5. **Integration Setup** - Technical integration and testing

---

## 🛠️ Integration Examples

### JavaScript/Fetch

```javascript
// Community Registration
async function registerCommunity(data) {
  const response = await fetch('https://your-site.netlify.app/api/community/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return await response.json();
}

// Usage
const member = await registerCommunity({
  email: 'user@example.com',
  username: 'johndoe',
  interests: ['mining', 'development']
});
```

### React Form

```jsx
function CommunityRegistrationForm() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    full_name: '',
    interests: []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/api/community/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    if (result.success) {
      alert('Registration successful!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

---

## 📚 Additional Resources

- **Database Schema:** `hybrid-pool/database/schema.sql`
- **Netlify Deployment:** `hybrid-pool/NETLIFY-DEPLOYMENT.md`
- **Community Support:** `/community-support.html`
- **GitHub Repository:** https://github.com/knol3j/HNH

---

**All registration data is securely stored in Neon PostgreSQL via Netlify! 🔒**
