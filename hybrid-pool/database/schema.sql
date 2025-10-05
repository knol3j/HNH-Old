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
