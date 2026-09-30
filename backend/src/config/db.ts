import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import pgvector from 'pgvector/pg';
import { config } from './index';

let pool: Pool | null = null;
let isConnected = false;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('[Database Pool Error]:', err.message);
    });
  }
  return pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const p = getPool();
    const client = await p.connect();
    await pgvector.registerTypes(client);
    await client.query('SELECT 1');
    client.release();
    isConnected = true;
    console.log('✅ PostgreSQL + pgvector connected successfully');
    return true;
  } catch (err: any) {
    isConnected = false;
    console.warn(`⚠️ PostgreSQL connection not established: ${err.message}. Ensure Docker postgres is running or run: docker compose up -d`);
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const p = getPool();
  return p.query<T>(text, params);
}

export async function getClient(): Promise<PoolClient> {
  const p = getPool();
  const client = await p.connect();
  await pgvector.registerTypes(client);
  return client;
}

export async function runMigrations(): Promise<void> {
  try {
    const client = await getClient();
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS repositories (
          id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
          owner VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          url TEXT NOT NULL UNIQUE,
          default_branch VARCHAR(100) DEFAULT 'main',
          status VARCHAR(50) DEFAULT 'pending',
          status_message TEXT DEFAULT 'Initialized',
          file_count INTEGER DEFAULT 0,
          chunk_count INTEGER DEFAULT 0,
          languages JSONB DEFAULT '[]'::jsonb,
          indexed_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

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

        CREATE TABLE IF NOT EXISTS code_chunks (
          id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
          repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
          file_id VARCHAR(36) NOT NULL REFERENCES files(id) ON DELETE CASCADE,
          file_path TEXT NOT NULL,
          language VARCHAR(100),
          symbol_name VARCHAR(255),
          symbol_type VARCHAR(100),
          start_line INTEGER NOT NULL,
          end_line INTEGER NOT NULL,
          content TEXT NOT NULL,
          embedding vector(1536),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS relationships (
          id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
          repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
          source_file_path TEXT NOT NULL,
          target_file_path TEXT,
          source_symbol VARCHAR(255),
          target_symbol VARCHAR(255),
          relationship_type VARCHAR(50) NOT NULL,
          source_chunk_id VARCHAR(36) REFERENCES code_chunks(id) ON DELETE SET NULL,
          target_chunk_id VARCHAR(36) REFERENCES code_chunks(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS analysis_queries (
          id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
          repository_id VARCHAR(36) NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
          query_type VARCHAR(50) NOT NULL,
          query_text TEXT NOT NULL,
          result JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

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
      `);
      console.log('✅ Database schema and tables verified');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn(`Database migration skipped: ${err.message}`);
  }
}
