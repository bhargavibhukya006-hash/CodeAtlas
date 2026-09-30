-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories Table
CREATE TABLE IF NOT EXISTS repositories (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    owner VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL UNIQUE,
    default_branch VARCHAR(100) DEFAULT 'main',
    status VARCHAR(50) DEFAULT 'pending', -- pending, fetching, indexing, ready, failed
    status_message TEXT DEFAULT 'Initialized',
    file_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    languages JSONB DEFAULT '[]'::jsonb,
    indexed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Files Table
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    language VARCHAR(100),
    size INTEGER DEFAULT 0,
    content TEXT,
    hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_repo_file UNIQUE (repository_id, path)
);

-- Code Chunks Table with vector embeddings
CREATE TABLE IF NOT EXISTS code_chunks (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    file_id VARCHAR(36) NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    language VARCHAR(100),
    symbol_name VARCHAR(255),
    symbol_type VARCHAR(100), -- function, class, method, interface, route, export, block
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Relationships Table (Code Graph & Dependencies)
CREATE TABLE IF NOT EXISTS relationships (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    source_file_path TEXT NOT NULL,
    target_file_path TEXT,
    source_symbol VARCHAR(255),
    target_symbol VARCHAR(255),
    relationship_type VARCHAR(50) NOT NULL, -- IMPORTS, CALLS, DEFINES, EXPORTS, EXTENDS, REFERENCES, DATABASE
    source_chunk_id VARCHAR(36) REFERENCES code_chunks(id) ON DELETE SET NULL,
    target_chunk_id VARCHAR(36) REFERENCES code_chunks(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analysis Queries (History and Caching)
CREATE TABLE IF NOT EXISTS analysis_queries (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    query_type VARCHAR(50) NOT NULL, -- 'search', 'ask', 'impact'
    query_text TEXT NOT NULL,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repos_url ON repositories(url);
CREATE INDEX IF NOT EXISTS idx_files_repo ON files(repository_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_chunks_repo ON code_chunks(repository_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file ON code_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_path ON code_chunks(file_path);
CREATE INDEX IF NOT EXISTS idx_chunks_symbol ON code_chunks(symbol_name);
CREATE INDEX IF NOT EXISTS idx_relationships_repo ON relationships(repository_id);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_file_path);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_file_path);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_analysis_repo ON analysis_queries(repository_id);

-- Vector search index (HNSW for cosine similarity)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw ON code_chunks USING hnsw (embedding vector_cosine_ops);
