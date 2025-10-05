-- HashNHedge Vendor Management Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Vendors table
CREATE TABLE vendors (
    vendor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Business Information
    legal_business_name VARCHAR(255) NOT NULL,
    dba_name VARCHAR(255),
    business_type VARCHAR(50) NOT NULL CHECK (business_type IN (
        'sole_proprietorship', 'llc', 'corporation', 's_corp',
        'partnership', 'nonprofit', 'other'
    )),
    year_established INTEGER CHECK (year_established >= 1900 AND year_established <= EXTRACT(YEAR FROM CURRENT_DATE)),
    business_description TEXT NOT NULL,
    website VARCHAR(500) NOT NULL,

    -- Tax Information (encrypted fields stored in vault, only references here)
    tax_id_type VARCHAR(20) NOT NULL CHECK (tax_id_type IN ('ein', 'ssn', 'vat', 'other')),
    tax_id_encrypted VARCHAR(500) NOT NULL, -- Vault path reference
    tax_country VARCHAR(3) NOT NULL,
    w9_submitted BOOLEAN DEFAULT FALSE,
    w9_document_url VARCHAR(500), -- S3 URL

    -- Business Address
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(3) NOT NULL,

    -- Contact Information
    contact_first_name VARCHAR(100) NOT NULL,
    contact_last_name VARCHAR(100) NOT NULL,
    contact_title VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL UNIQUE,
    contact_phone VARCHAR(50) NOT NULL,
    contact_phone_alt VARCHAR(50),

    -- Payment Information (encrypted)
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('ach', 'wire', 'crypto', 'check')),
    bank_name VARCHAR(255),
    account_holder_name VARCHAR(255),
    routing_number_encrypted VARCHAR(500), -- Vault path
    account_number_encrypted VARCHAR(500), -- Vault path
    crypto_wallet VARCHAR(255),

    -- Insurance & Liability
    has_liability_insurance BOOLEAN DEFAULT FALSE,
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    insurance_coverage VARCHAR(50),
    insurance_expiry DATE,
    has_cyber_insurance BOOLEAN DEFAULT FALSE,

    -- Compliance
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP,
    data_privacy_accepted BOOLEAN DEFAULT FALSE,
    aml_kyc_accepted BOOLEAN DEFAULT FALSE,
    accuracy_certified BOOLEAN DEFAULT FALSE,

    -- Electronic Signature
    signature_name VARCHAR(255),
    signature_title VARCHAR(100),
    signature_date DATE,
    signature_ip VARCHAR(45),

    -- Status & Workflow
    status VARCHAR(20) DEFAULT 'pending_review' CHECK (status IN (
        'pending_review', 'approved', 'rejected', 'suspended', 'archived'
    )),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by VARCHAR(100),
    approval_notes TEXT,
    rejected_at TIMESTAMP,
    rejected_by VARCHAR(100),
    rejection_reason TEXT,

    -- API Access
    api_key VARCHAR(64) UNIQUE,
    api_key_created_at TIMESTAMP,
    api_key_last_used TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT valid_email CHECK (contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Vendor statistics table
CREATE TABLE vendor_stats (
    vendor_id UUID PRIMARY KEY REFERENCES vendors(vendor_id) ON DELETE CASCADE,

    -- Job statistics
    total_jobs INTEGER DEFAULT 0,
    active_jobs INTEGER DEFAULT 0,
    completed_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,

    -- Financial
    total_spend DECIMAL(15, 2) DEFAULT 0.00,
    total_credits DECIMAL(15, 2) DEFAULT 0.00,
    account_balance DECIMAL(15, 2) DEFAULT 0.00,

    -- Compute resources
    total_compute_hours DECIMAL(15, 2) DEFAULT 0.00,
    avg_job_duration_minutes DECIMAL(10, 2) DEFAULT 0.00,

    -- Performance
    success_rate DECIMAL(5, 2) DEFAULT 0.00,
    avg_satisfaction_score DECIMAL(3, 2) DEFAULT 0.00,

    -- Timestamps
    first_job_at TIMESTAMP,
    last_job_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compute jobs table
CREATE TABLE compute_jobs (
    job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,

    -- Job details
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN (
        'ai_inference', 'ai_training', 'ml_training', 'rendering',
        'simulation', 'video_encoding', 'other'
    )),
    model_name VARCHAR(255),
    task_description TEXT,

    -- Requirements
    gpu_type VARCHAR(50),
    min_vram_gb INTEGER,
    required_capabilities TEXT[],
    estimated_duration_minutes INTEGER,
    max_cost DECIMAL(10, 2),

    -- Resources allocated
    assigned_workers TEXT[],
    actual_workers_used INTEGER DEFAULT 0,

    -- Execution
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'queued', 'running', 'completed', 'failed', 'cancelled', 'timeout'
    )),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    queued_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    actual_duration_minutes INTEGER,

    -- Cost & Billing
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    billed_amount DECIMAL(10, 2),
    billing_status VARCHAR(20) DEFAULT 'pending' CHECK (billing_status IN (
        'pending', 'invoiced', 'paid', 'failed', 'refunded'
    )),

    -- Results
    result_data JSONB,
    error_message TEXT,
    output_url VARCHAR(500), -- S3 URL for results

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Vendor documents table (W-9, insurance certs, etc.)
CREATE TABLE vendor_documents (
    document_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,

    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'w9', 'w8ben', 'insurance_certificate', 'business_license',
        'incorporation_docs', 'other'
    )),

    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    s3_bucket VARCHAR(100) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    s3_url VARCHAR(1000) NOT NULL,

    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(100),
    verified_at TIMESTAMP,
    verification_notes TEXT,

    -- Expiration (for insurance, licenses, etc.)
    expires_at DATE,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100),

    metadata JSONB DEFAULT '{}'::jsonb,

    UNIQUE(vendor_id, document_type, s3_key)
);

-- Email notifications log
CREATE TABLE email_notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL,

    -- Email details
    email_type VARCHAR(50) NOT NULL CHECK (email_type IN (
        'registration_confirmation', 'approval_notification', 'rejection_notification',
        'job_completed', 'job_failed', 'payment_receipt', 'monthly_statement',
        'document_reminder', 'api_key_issued', 'admin_alert'
    )),

    to_email VARCHAR(255) NOT NULL,
    cc_emails TEXT[],

    subject VARCHAR(500) NOT NULL,
    body_text TEXT,
    body_html TEXT,

    -- SendGrid
    sendgrid_message_id VARCHAR(100),
    sendgrid_status VARCHAR(50),

    -- Delivery
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_reason TEXT,

    -- Retry logic
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    metadata JSONB DEFAULT '{}'::jsonb
);

-- Audit log for all vendor actions
CREATE TABLE vendor_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'create', 'read', 'update', 'delete', 'approve', 'reject',
        'suspend', 'login', 'api_call'
    )),

    performed_by VARCHAR(100) NOT NULL,
    performed_by_type VARCHAR(20) CHECK (performed_by_type IN ('admin', 'vendor', 'system')),

    ip_address VARCHAR(45),
    user_agent TEXT,

    -- What changed
    changes_before JSONB,
    changes_after JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_contact_email ON vendors(contact_email);
CREATE INDEX idx_vendors_created_at ON vendors(created_at);
CREATE INDEX idx_vendors_api_key ON vendors(api_key) WHERE api_key IS NOT NULL;

CREATE INDEX idx_compute_jobs_vendor ON compute_jobs(vendor_id);
CREATE INDEX idx_compute_jobs_status ON compute_jobs(status);
CREATE INDEX idx_compute_jobs_created ON compute_jobs(created_at DESC);
CREATE INDEX idx_compute_jobs_priority ON compute_jobs(priority DESC);

CREATE INDEX idx_documents_vendor ON vendor_documents(vendor_id);
CREATE INDEX idx_documents_type ON vendor_documents(document_type);
CREATE INDEX idx_documents_expires ON vendor_documents(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_emails_vendor ON email_notifications(vendor_id);
CREATE INDEX idx_emails_type ON email_notifications(email_type);
CREATE INDEX idx_emails_sent ON email_notifications(sent_at);

CREATE INDEX idx_audit_vendor ON vendor_audit_log(vendor_id);
CREATE INDEX idx_audit_created ON vendor_audit_log(created_at DESC);
CREATE INDEX idx_audit_action_type ON vendor_audit_log(action_type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_stats_updated_at BEFORE UPDATE ON vendor_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create vendor_stats entry when vendor is created
CREATE OR REPLACE FUNCTION create_vendor_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO vendor_stats (vendor_id) VALUES (NEW.vendor_id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_vendor_stats_trigger AFTER INSERT ON vendors
    FOR EACH ROW EXECUTE FUNCTION create_vendor_stats();

-- Views for common queries
CREATE VIEW active_vendors AS
SELECT
    v.*,
    vs.total_jobs,
    vs.total_spend,
    vs.account_balance,
    vs.last_job_at
FROM vendors v
LEFT JOIN vendor_stats vs ON v.vendor_id = vs.vendor_id
WHERE v.status = 'approved';

CREATE VIEW pending_vendors AS
SELECT
    v.vendor_id,
    v.legal_business_name,
    v.business_type,
    v.contact_email,
    v.contact_phone,
    v.submitted_at,
    v.w9_submitted
FROM vendors v
WHERE v.status = 'pending_review'
ORDER BY v.submitted_at ASC;

-- Grant permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hashnhedge_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hashnhedge_app;

-- Comments for documentation
COMMENT ON TABLE vendors IS 'Main vendor registry with encrypted sensitive fields';
COMMENT ON TABLE vendor_stats IS 'Aggregated statistics for each vendor';
COMMENT ON TABLE compute_jobs IS 'AI/ML compute jobs submitted by vendors';
COMMENT ON TABLE vendor_documents IS 'Uploaded documents (W-9, insurance, etc.) stored in S3';
COMMENT ON TABLE email_notifications IS 'Log of all email notifications sent via SendGrid';
COMMENT ON TABLE vendor_audit_log IS 'Complete audit trail of all vendor-related actions';
