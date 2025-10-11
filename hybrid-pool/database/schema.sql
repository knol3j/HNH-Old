-- HashNHedge Production Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Workers/Miners Table
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    hardware_info JSONB,
    total_shares BIGINT DEFAULT 0,
    valid_shares BIGINT DEFAULT 0,
    invalid_shares BIGINT DEFAULT 0,
    total_earnings DECIMAL(20, 8) DEFAULT 0,
    INDEX idx_wallet (wallet_address),
    INDEX idx_status (status),
    INDEX idx_worker_id (worker_id)
);

-- Jobs Table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- 'ai' or 'mining'
    algorithm VARCHAR(100),
    difficulty BIGINT,
    reward DECIMAL(20, 8),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    assigned_worker UUID REFERENCES workers(id),
    metadata JSONB,
    INDEX idx_job_type (job_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Shares Table
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    difficulty BIGINT NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    job_type VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nonce VARCHAR(255),
    hash VARCHAR(255),
    INDEX idx_worker (worker_id),
    INDEX idx_job (job_id),
    INDEX idx_submitted_at (submitted_at),
    INDEX idx_valid (is_valid)
);

-- Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(10) DEFAULT 'HNH',
    status VARCHAR(50) DEFAULT 'pending',
    transaction_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    notes TEXT,
    INDEX idx_worker (worker_id),
    INDEX idx_wallet (wallet_address),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Earnings Table (running balance)
CREATE TABLE earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    amount DECIMAL(20, 8) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_worker (worker_id),
    INDEX idx_created_at (created_at)
);

-- Pool Stats Table
CREATE TABLE pool_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_workers INT DEFAULT 0,
    active_workers INT DEFAULT 0,
    total_hashrate BIGINT DEFAULT 0,
    ai_jobs_completed INT DEFAULT 0,
    mining_jobs_completed INT DEFAULT 0,
    pool_revenue DECIMAL(20, 8) DEFAULT 0,
    network_utilization DECIMAL(5, 2) DEFAULT 0,
    metadata JSONB,
    INDEX idx_timestamp (timestamp)
);

-- Blocks Found Table (for mining)
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_height BIGINT NOT NULL,
    block_hash VARCHAR(255) NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    difficulty BIGINT NOT NULL,
    reward DECIMAL(20, 8) NOT NULL,
    found_by UUID REFERENCES workers(id),
    found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed BOOLEAN DEFAULT false,
    confirmed_at TIMESTAMP,
    INDEX idx_block_height (block_height),
    INDEX idx_found_at (found_at),
    INDEX idx_confirmed (confirmed)
);

-- API Keys Table (for admin/monitoring)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    INDEX idx_is_active (is_active)
);

-- Email Notifications Queue (SendGrid)
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    template_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    error_message TEXT,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_seen on workers
CREATE TRIGGER update_worker_last_seen
BEFORE UPDATE ON workers
FOR EACH ROW
EXECUTE FUNCTION update_last_seen();

-- Views for analytics
CREATE VIEW worker_stats AS
SELECT
    w.id,
    w.worker_id,
    w.wallet_address,
    w.total_shares,
    w.valid_shares,
    w.invalid_shares,
    w.total_earnings,
    COUNT(DISTINCT s.id) as shares_24h,
    SUM(CASE WHEN s.is_valid THEN 1 ELSE 0 END) as valid_shares_24h,
    w.last_seen
FROM workers w
LEFT JOIN shares s ON s.worker_id = w.id
    AND s.submitted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY w.id;

CREATE VIEW pool_performance AS
SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    AVG(total_workers) as avg_workers,
    AVG(active_workers) as avg_active_workers,
    AVG(total_hashrate) as avg_hashrate,
    SUM(ai_jobs_completed) as ai_jobs,
    SUM(mining_jobs_completed) as mining_jobs,
    SUM(pool_revenue) as revenue
FROM pool_stats
WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- ============================================================
-- COMMUNITY REGISTRATION TABLES
-- ============================================================

-- Community Members Table
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    wallet_address VARCHAR(255),
    discord_username VARCHAR(255),
    telegram_username VARCHAR(255),
    twitter_username VARCHAR(255),
    github_username VARCHAR(255),

    -- Profile info
    bio TEXT,
    avatar_url VARCHAR(500),
    country VARCHAR(100),
    timezone VARCHAR(100),

    -- Interests and skills
    interests TEXT[], -- Array of interests
    skills TEXT[], -- Array of skills
    contribution_areas TEXT[], -- mining, development, marketing, etc.

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, suspended
    email_verified BOOLEAN DEFAULT false,
    wallet_verified BOOLEAN DEFAULT false,

    -- Engagement metrics
    reputation_score INT DEFAULT 0,
    contributions_count INT DEFAULT 0,

    -- Stack Auth Integration
    stack_user_id VARCHAR(255) UNIQUE, -- Stack Auth user ID

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,

    -- Metadata
    metadata JSONB,

    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_status (status),
    INDEX idx_wallet (wallet_address),
    INDEX idx_created_at (created_at)
);

-- Community Events/Activities
CREATE TABLE community_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- webinar, meetup, hackathon, workshop
    event_url VARCHAR(500),

    -- Timing
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    timezone VARCHAR(100),

    -- Location (if physical)
    location_type VARCHAR(50) DEFAULT 'online', -- online, physical, hybrid
    location_address TEXT,

    -- Registration
    max_participants INT,
    registration_required BOOLEAN DEFAULT true,
    registration_url VARCHAR(500),

    -- Status
    status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, ongoing, completed, cancelled

    -- Organizer
    organizer_id UUID REFERENCES community_members(id),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    metadata JSONB,

    INDEX idx_event_type (event_type),
    INDEX idx_status (status),
    INDEX idx_start_time (start_time)
);

-- Event Registrations
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES community_events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES community_members(id) ON DELETE CASCADE,

    registration_status VARCHAR(50) DEFAULT 'registered', -- registered, attended, cancelled
    attended BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(event_id, member_id),
    INDEX idx_event (event_id),
    INDEX idx_member (member_id)
);

-- Community Contributions
CREATE TABLE community_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES community_members(id) ON DELETE CASCADE,

    contribution_type VARCHAR(50) NOT NULL, -- code, documentation, design, community-help, bug-report
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Links
    github_pr_url VARCHAR(500),
    external_link VARCHAR(500),

    -- Review
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by UUID REFERENCES community_members(id),
    review_notes TEXT,

    -- Rewards
    reputation_awarded INT DEFAULT 0,
    bounty_awarded DECIMAL(20, 8) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,

    metadata JSONB,

    INDEX idx_member (member_id),
    INDEX idx_type (contribution_type),
    INDEX idx_status (status)
);

-- ============================================================
-- VENDOR REGISTRATION TABLES
-- ============================================================

-- Vendors Table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Company Info
    company_name VARCHAR(255) UNIQUE NOT NULL,
    legal_name VARCHAR(255),
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),

    -- Contact Info
    contact_email VARCHAR(255) UNIQUE NOT NULL,
    contact_phone VARCHAR(50),
    website_url VARCHAR(500),

    -- Contact Person
    contact_person_name VARCHAR(255) NOT NULL,
    contact_person_title VARCHAR(100),
    contact_person_email VARCHAR(255),

    -- Business Details
    business_type VARCHAR(100), -- hardware-manufacturer, software-provider, service-provider, mining-pool, etc.
    industry_sector VARCHAR(100),
    company_size VARCHAR(50), -- startup, small, medium, enterprise
    established_year INT,

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(50),
    country VARCHAR(100),

    -- Wallet
    payment_wallet_address VARCHAR(255),
    payment_wallet_verified BOOLEAN DEFAULT false,

    -- Partnership Details
    partnership_type VARCHAR(50), -- technology, reseller, integration, sponsor
    products_services TEXT, -- Description of offerings
    integration_interest TEXT[], -- Array of integration areas
    expected_volume VARCHAR(50), -- low, medium, high, enterprise

    -- Compliance
    kyb_verified BOOLEAN DEFAULT false, -- Know Your Business
    kyb_documents JSONB, -- Document references
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMP,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, active, suspended, rejected
    approval_notes TEXT,
    approved_by VARCHAR(255),
    approved_at TIMESTAMP,

    -- Engagement
    total_transactions INT DEFAULT 0,
    total_volume DECIMAL(20, 8) DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0, -- Average rating 0.00 to 5.00

    -- Stack Auth Integration
    stack_user_id VARCHAR(255) UNIQUE, -- Stack Auth user ID for contact person

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,

    -- Metadata
    metadata JSONB,

    INDEX idx_company_name (company_name),
    INDEX idx_email (contact_email),
    INDEX idx_status (status),
    INDEX idx_type (business_type),
    INDEX idx_partnership (partnership_type),
    INDEX idx_created_at (created_at)
);

-- Vendor Products/Services
CREATE TABLE vendor_offerings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,

    offering_type VARCHAR(50) NOT NULL, -- hardware, software, service, support
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),

    -- Pricing
    pricing_model VARCHAR(50), -- fixed, subscription, usage-based, custom
    base_price DECIMAL(20, 8),
    currency VARCHAR(10) DEFAULT 'USD',

    -- Links
    documentation_url VARCHAR(500),
    demo_url VARCHAR(500),
    purchase_url VARCHAR(500),

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    metadata JSONB,

    INDEX idx_vendor (vendor_id),
    INDEX idx_type (offering_type),
    INDEX idx_active (is_active)
);

-- Vendor Transactions/Integrations
CREATE TABLE vendor_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,

    transaction_type VARCHAR(50) NOT NULL, -- sale, integration, support, partnership
    amount DECIMAL(20, 8),
    currency VARCHAR(10) DEFAULT 'USD',

    description TEXT,
    reference_id VARCHAR(255), -- External transaction reference

    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    metadata JSONB,

    INDEX idx_vendor (vendor_id),
    INDEX idx_type (transaction_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Vendor Reviews/Ratings
CREATE TABLE vendor_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    reviewer_id UUID, -- Could reference community_members or workers
    reviewer_type VARCHAR(50), -- community, customer, partner

    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,

    -- Helpful votes
    helpful_count INT DEFAULT 0,

    -- Verification
    verified_purchase BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_vendor (vendor_id),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at)
);

-- Documentation/Resources
CREATE TABLE documentation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    doc_type VARCHAR(50) NOT NULL, -- guide, api-docs, tutorial, faq, whitepaper
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,

    -- Categorization
    category VARCHAR(100),
    tags TEXT[],

    -- Author
    author_type VARCHAR(50), -- team, community, vendor
    author_id UUID, -- References different tables based on author_type
    author_name VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    is_featured BOOLEAN DEFAULT false,

    -- SEO
    meta_description TEXT,
    meta_keywords TEXT[],

    -- Engagement
    view_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,

    -- Versioning
    version VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,

    metadata JSONB,

    INDEX idx_slug (slug),
    INDEX idx_type (doc_type),
    INDEX idx_status (status),
    INDEX idx_category (category)
);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_community_members_updated_at
BEFORE UPDATE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON vendors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendor_offerings_updated_at
BEFORE UPDATE ON vendor_offerings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documentation_updated_at
BEFORE UPDATE ON documentation
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
