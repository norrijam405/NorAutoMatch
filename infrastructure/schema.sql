-- Enable UUID extension for cryptographic, non-enumerable resource identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define a strict state schema for tasks inside our outbox lifecycle
CREATE TYPE task_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Core highly indexed transactional table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Persistent message queue outbox table
CREATE TABLE outbox_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status task_status DEFAULT 'pending' NOT NULL,
    attempts INT DEFAULT 0 NOT NULL,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Advanced GIN (Generalized Inverted Index) for high-speed indexing inside nested JSON data paths
CREATE INDEX idx_products_metadata_gin ON products USING gin (metadata);

-- Highly optimized partial index ensuring performance when searching active/featured stock flags
CREATE INDEX idx_products_featured_partial ON products (price)
WHERE (metadata ->> 'featured')::boolean = true;

-- Index to optimize high-frequency pulling of unprocessed outbox tasks
CREATE INDEX idx_outbox_pending_tasks ON outbox_tasks (status, created_at)
WHERE status = 'pending';

-- Automated database-level trigger logic for record audit synchronization
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_outbox_tasks_updated_at
BEFORE UPDATE ON outbox_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
