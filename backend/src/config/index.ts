import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env or root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://codeatlas:codeatlas_secret@localhost:5432/codeatlas_db',
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  },
  
  github: {
    token: process.env.GITHUB_TOKEN || '',
  },
  
  retrieval: {
    topK: parseInt(process.env.TOP_K || '8', 10),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '200000', 10), // 200KB
    maxFiles: parseInt(process.env.MAX_FILES || '500', 10),
    maxEmbeddingBatchSize: parseInt(process.env.MAX_EMBEDDING_BATCH_SIZE || '100', 10),
  }
};
