-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- 1. USER & PROFILE MANAGEMENT
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Flexible JSONB onboarding store (risk tolerance, capital, holdings, experience)
    onboarding_answers JSONB DEFAULT '{}'::jsonb NOT NULL,
    preferred_language VARCHAR(10) DEFAULT 'en' NOT NULL, -- 'en', 'fr'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE glossary_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term VARCHAR(150) UNIQUE NOT NULL,
    category VARCHAR(100) DEFAULT 'general_investing' NOT NULL,
    definition TEXT NOT NULL,
    simple_explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_knowledge_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    glossary_term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
    mastery_level VARCHAR(50) DEFAULT 'introduced' NOT NULL, 
    -- Enum check: 'introduced', 'reviewing', 'mastered'
    CONSTRAINT chk_mastery_level CHECK (mastery_level IN ('introduced', 'reviewing', 'mastered')),
    last_reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_glossary UNIQUE (user_id, glossary_term_id)
);

-- ============================================================================
-- 2. IPO KNOWLEDGE BASE & EMBEDDINGS (Ingestion Target)
-- ============================================================================

CREATE TABLE ipos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    issuer_country VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 deduplication
    version VARCHAR(20) DEFAULT '1.0' NOT NULL,
    status VARCHAR(50) DEFAULT 'indexed' NOT NULL -- 'pending', 'indexed', 'failed'
);

CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE, -- Denormalized for zero-join retrieval filtering
    content TEXT NOT NULL,
    embedding VECTOR(1024), -- Voyage-3.5 1024-dimensional embeddings
    page_number INT NOT NULL,
    section_path VARCHAR(255)
);

-- HNSW Vector Index for ultra-fast similarity search
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_chunks_ipo_id ON chunks(ipo_id);

CREATE TABLE key_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    fact_type VARCHAR(100) NOT NULL, -- 'opening_date', 'closing_date', 'min_subscription', etc.
    value VARCHAR(255) NOT NULL,
    review_status VARCHAR(50) DEFAULT 'verified' NOT NULL, -- 'pending', 'verified', 'rejected'
    source_page INT NOT NULL,
    CONSTRAINT chk_fact_review_status CHECK (review_status IN ('pending', 'verified', 'rejected'))
);

CREATE TABLE section_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    section_name VARCHAR(255) NOT NULL,
    summary_text TEXT NOT NULL
);

-- ============================================================================
-- 3. CONVERSATION STATE & USER ACTIONS
-- ============================================================================

CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ipo_id UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
    turn_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    intent VARCHAR(50), -- 'prospectus', 'education', 'calendar', 'off_topic'
    latency_seconds FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_sender CHECK (sender IN ('user', 'assistant'))
);

CREATE TABLE message_citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
    quote_text TEXT,
    page_number INT NOT NULL
);

CREATE TABLE calendar_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    key_fact_id UUID REFERENCES key_facts(id) ON DELETE SET NULL,
    event_title VARCHAR(255) NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'proposed' NOT NULL, 
    -- 4-State Lifecycle: 'proposed', 'confirmed', 'synced_to_device', 'rejected'
    CONSTRAINT chk_calendar_status CHECK (status IN ('proposed', 'confirmed', 'synced_to_device', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
