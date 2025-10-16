-- Enable PostgreSQL extensions required for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "workers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "worker_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "hardware_info" JSONB,
    "total_shares" BIGINT NOT NULL DEFAULT 0,
    "valid_shares" BIGINT NOT NULL DEFAULT 0,
    "invalid_shares" BIGINT NOT NULL DEFAULT 0,
    "total_earnings" DECIMAL(20,8) NOT NULL DEFAULT 0,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "job_id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "algorithm" TEXT,
    "difficulty" BIGINT,
    "reward" DECIMAL(20,8),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "assigned_worker" UUID,
    "metadata" JSONB,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "worker_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "difficulty" BIGINT NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT true,
    "job_type" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nonce" TEXT,
    "hash" TEXT,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "worker_id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'HNH',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "transaction_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "worker_id" UUID NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "job_type" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_stats" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_workers" INTEGER NOT NULL DEFAULT 0,
    "active_workers" INTEGER NOT NULL DEFAULT 0,
    "total_hashrate" BIGINT NOT NULL DEFAULT 0,
    "ai_jobs_completed" INTEGER NOT NULL DEFAULT 0,
    "mining_jobs_completed" INTEGER NOT NULL DEFAULT 0,
    "pool_revenue" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "network_utilization" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "pool_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "block_height" BIGINT NOT NULL,
    "block_hash" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "difficulty" BIGINT NOT NULL,
    "reward" DECIMAL(20,8) NOT NULL,
    "found_by" UUID,
    "found_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "key_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_queue" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "template_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_members" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT,
    "wallet_address" TEXT,
    "discord_username" TEXT,
    "telegram_username" TEXT,
    "twitter_username" TEXT,
    "github_username" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "country" TEXT,
    "timezone" TEXT,
    "interests" TEXT[],
    "skills" TEXT[],
    "contribution_areas" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "wallet_verified" BOOLEAN NOT NULL DEFAULT false,
    "reputation_score" INTEGER NOT NULL DEFAULT 0,
    "contributions_count" INTEGER NOT NULL DEFAULT 0,
    "stack_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "community_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "event_type" TEXT NOT NULL,
    "event_url" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "timezone" TEXT,
    "location_type" TEXT NOT NULL DEFAULT 'online',
    "location_address" TEXT,
    "max_participants" INTEGER,
    "registration_required" BOOLEAN NOT NULL DEFAULT true,
    "registration_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "organizer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "community_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_registrations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "registration_status" TEXT NOT NULL DEFAULT 'registered',
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_contributions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "member_id" UUID NOT NULL,
    "contribution_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "github_pr_url" TEXT,
    "external_link" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "review_notes" TEXT,
    "reputation_awarded" INTEGER NOT NULL DEFAULT 0,
    "bounty_awarded" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "community_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "company_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "registration_number" TEXT,
    "tax_id" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "website_url" TEXT,
    "contact_person_name" TEXT NOT NULL,
    "contact_person_title" TEXT,
    "contact_person_email" TEXT,
    "business_type" TEXT,
    "industry_sector" TEXT,
    "company_size" TEXT,
    "established_year" INTEGER,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "payment_wallet_address" TEXT,
    "payment_wallet_verified" BOOLEAN NOT NULL DEFAULT false,
    "partnership_type" TEXT,
    "products_services" TEXT,
    "integration_interest" TEXT[],
    "expected_volume" TEXT,
    "kyb_verified" BOOLEAN NOT NULL DEFAULT false,
    "kyb_documents" JSONB,
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approval_notes" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "total_transactions" INTEGER NOT NULL DEFAULT 0,
    "total_volume" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "stack_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_offerings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "offering_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "pricing_model" TEXT,
    "base_price" DECIMAL(20,8),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "documentation_url" TEXT,
    "demo_url" TEXT,
    "purchase_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "vendor_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" DECIMAL(20,8),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "reference_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "vendor_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "reviewer_id" UUID,
    "reviewer_type" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "review_text" TEXT,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentation" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "doc_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "tags" TEXT[],
    "author_type" TEXT,
    "author_id" UUID,
    "author_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "meta_description" TEXT,
    "meta_keywords" TEXT[],
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "documentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workers_worker_id_key" ON "workers"("worker_id");

-- CreateIndex
CREATE INDEX "idx_workers_wallet_address" ON "workers"("wallet_address");

-- CreateIndex
CREATE INDEX "idx_workers_status" ON "workers"("status");

-- CreateIndex
CREATE INDEX "idx_workers_worker_id" ON "workers"("worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_job_id_key" ON "jobs"("job_id");

-- CreateIndex
CREATE INDEX "idx_jobs_job_type" ON "jobs"("job_type");

-- CreateIndex
CREATE INDEX "idx_jobs_status" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "idx_jobs_created_at" ON "jobs"("created_at");

-- CreateIndex
CREATE INDEX "idx_shares_worker_id" ON "shares"("worker_id");

-- CreateIndex
CREATE INDEX "idx_shares_job_id" ON "shares"("job_id");

-- CreateIndex
CREATE INDEX "idx_shares_submitted_at" ON "shares"("submitted_at");

-- CreateIndex
CREATE INDEX "idx_shares_is_valid" ON "shares"("is_valid");

-- CreateIndex
CREATE INDEX "idx_payments_worker_id" ON "payments"("worker_id");

-- CreateIndex
CREATE INDEX "idx_payments_wallet_address" ON "payments"("wallet_address");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_payments_created_at" ON "payments"("created_at");

-- CreateIndex
CREATE INDEX "idx_earnings_worker_id" ON "earnings"("worker_id");

-- CreateIndex
CREATE INDEX "idx_earnings_created_at" ON "earnings"("created_at");

-- CreateIndex
CREATE INDEX "idx_pool_stats_timestamp" ON "pool_stats"("timestamp");

-- CreateIndex
CREATE INDEX "idx_blocks_block_height" ON "blocks"("block_height");

-- CreateIndex
CREATE INDEX "idx_blocks_found_at" ON "blocks"("found_at");

-- CreateIndex
CREATE INDEX "idx_blocks_confirmed" ON "blocks"("confirmed");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "idx_api_keys_is_active" ON "api_keys"("is_active");

-- CreateIndex
CREATE INDEX "idx_email_queue_status" ON "email_queue"("status");

-- CreateIndex
CREATE INDEX "idx_email_queue_created_at" ON "email_queue"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_email_key" ON "community_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_username_key" ON "community_members"("username");

-- CreateIndex
CREATE UNIQUE INDEX "community_members_stack_user_id_key" ON "community_members"("stack_user_id");

-- CreateIndex
CREATE INDEX "idx_community_members_email" ON "community_members"("email");

-- CreateIndex
CREATE INDEX "idx_community_members_username" ON "community_members"("username");

-- CreateIndex
CREATE INDEX "idx_community_members_status" ON "community_members"("status");

-- CreateIndex
CREATE INDEX "idx_community_members_wallet_address" ON "community_members"("wallet_address");

-- CreateIndex
CREATE INDEX "idx_community_members_created_at" ON "community_members"("created_at");

-- CreateIndex
CREATE INDEX "idx_community_events_event_type" ON "community_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_community_events_status" ON "community_events"("status");

-- CreateIndex
CREATE INDEX "idx_community_events_start_time" ON "community_events"("start_time");

-- CreateIndex
CREATE INDEX "idx_event_registrations_event_id" ON "event_registrations"("event_id");

-- CreateIndex
CREATE INDEX "idx_event_registrations_member_id" ON "event_registrations"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_event_id_member_id_key" ON "event_registrations"("event_id", "member_id");

-- CreateIndex
CREATE INDEX "idx_community_contributions_member_id" ON "community_contributions"("member_id");

-- CreateIndex
CREATE INDEX "idx_community_contributions_contribution_type" ON "community_contributions"("contribution_type");

-- CreateIndex
CREATE INDEX "idx_community_contributions_status" ON "community_contributions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_company_name_key" ON "vendors"("company_name");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_contact_email_key" ON "vendors"("contact_email");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_stack_user_id_key" ON "vendors"("stack_user_id");

-- CreateIndex
CREATE INDEX "idx_vendors_company_name" ON "vendors"("company_name");

-- CreateIndex
CREATE INDEX "idx_vendors_contact_email" ON "vendors"("contact_email");

-- CreateIndex
CREATE INDEX "idx_vendors_status" ON "vendors"("status");

-- CreateIndex
CREATE INDEX "idx_vendors_business_type" ON "vendors"("business_type");

-- CreateIndex
CREATE INDEX "idx_vendors_partnership_type" ON "vendors"("partnership_type");

-- CreateIndex
CREATE INDEX "idx_vendors_created_at" ON "vendors"("created_at");

-- CreateIndex
CREATE INDEX "idx_vendor_offerings_vendor_id" ON "vendor_offerings"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_vendor_offerings_offering_type" ON "vendor_offerings"("offering_type");

-- CreateIndex
CREATE INDEX "idx_vendor_offerings_is_active" ON "vendor_offerings"("is_active");

-- CreateIndex
CREATE INDEX "idx_vendor_transactions_vendor_id" ON "vendor_transactions"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_vendor_transactions_transaction_type" ON "vendor_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "idx_vendor_transactions_status" ON "vendor_transactions"("status");

-- CreateIndex
CREATE INDEX "idx_vendor_transactions_created_at" ON "vendor_transactions"("created_at");

-- CreateIndex
CREATE INDEX "idx_vendor_reviews_vendor_id" ON "vendor_reviews"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_vendor_reviews_rating" ON "vendor_reviews"("rating");

-- CreateIndex
CREATE INDEX "idx_vendor_reviews_created_at" ON "vendor_reviews"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "documentation_slug_key" ON "documentation"("slug");

-- CreateIndex
CREATE INDEX "idx_documentation_slug" ON "documentation"("slug");

-- CreateIndex
CREATE INDEX "idx_documentation_doc_type" ON "documentation"("doc_type");

-- CreateIndex
CREATE INDEX "idx_documentation_status" ON "documentation"("status");

-- CreateIndex
CREATE INDEX "idx_documentation_category" ON "documentation"("category");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_worker_fkey" FOREIGN KEY ("assigned_worker") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_found_by_fkey" FOREIGN KEY ("found_by") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_events" ADD CONSTRAINT "community_events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "community_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "community_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "community_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_contributions" ADD CONSTRAINT "community_contributions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "community_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_contributions" ADD CONSTRAINT "community_contributions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "community_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_offerings" ADD CONSTRAINT "vendor_offerings_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_transactions" ADD CONSTRAINT "vendor_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_reviews" ADD CONSTRAINT "vendor_reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
