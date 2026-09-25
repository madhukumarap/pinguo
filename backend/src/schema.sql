CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'owner'
        CHECK (role IN ('owner', 'admin', 'developer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    monthly_sms INTEGER NOT NULL CHECK (monthly_sms > 0),
    monthly_price_paise INTEGER NOT NULL CHECK (monthly_price_paise >= 0),
    overage_price_paise INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    renews_at TIMESTAMPTZ,
    UNIQUE(company_id)
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('credit', 'debit')),
    credits INTEGER NOT NULL CHECK (credits > 0),
    reference VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(30) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'revoked')),
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id),
    to_number VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(30) NOT NULL DEFAULT 'transactional',
    segments INTEGER NOT NULL DEFAULT 1,
    cost_credits INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'submitted', 'delivered', 'failed')),
    provider_message_id VARCHAR(150),
    error_code VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

CREATE TABLE delivery_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sms_message_id UUID NOT NULL REFERENCES sms_messages(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL,
    provider VARCHAR(100),
    error_code VARCHAR(100),
    raw_response JSONB,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_company_created ON sms_messages(company_id, created_at DESC);
CREATE INDEX idx_sms_status ON sms_messages(status);
CREATE INDEX idx_wallet_transactions_company ON wallet_transactions(company_id, created_at DESC);
CREATE INDEX idx_api_keys_company ON api_keys(company_id);

INSERT INTO plans (name, monthly_sms, monthly_price_paise, overage_price_paise)
VALUES
('Starter', 5000, 49900, 15),
('Growth', 25000, 199900, 10),
('Business', 100000, 599900, 8)
ON CONFLICT (name) DO NOTHING;
