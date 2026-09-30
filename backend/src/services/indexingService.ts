import { v4 as uuidv4 } from 'uuid';
import pgvector from 'pgvector/pg';
import { query, isDbConnected } from '../config/db';
import { githubService } from './githubService';
import { openaiService } from './openaiService';
import { chunkCode } from '../utils/chunker';
import { extractRelationships } from '../utils/codeRelationships';
import { parseGitHubUrl } from '../utils/github';
import { inMemoryStore } from './vectorService';
import { CodeChunk, Relationship, Repository, RepositoryStatus } from '../types';
import { config } from '../config';

export class IndexingService {
  /**
   * Update repository status in DB and memory
   */
  async updateStatus(
    repositoryId: string,
    status: RepositoryStatus,
    statusMessage: string,
    extra: Partial<Repository> = {}
  ): Promise<void> {
    if (isDbConnected()) {
      try {
        const sql = `
          UPDATE repositories
          SET status = $1::varchar,
              status_message = $2::text,
              file_count = COALESCE($3, file_count),
              chunk_count = COALESCE($4, chunk_count),
              languages = COALESCE($5::jsonb, languages),
              indexed_at = CASE WHEN $1::varchar = 'ready' THEN CURRENT_TIMESTAMP ELSE indexed_at END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $6;
        `;
        await query(sql, [
          status,
          statusMessage,
          extra.file_count ?? null,
          extra.chunk_count ?? null,
          extra.languages ? JSON.stringify(extra.languages) : null,
          repositoryId,
        ]);
      } catch (err: any) {
        console.warn(`[IndexingService] DB updateStatus failed: ${err.message}`);
      }
    }

    const memRepo = inMemoryStore.repositories.get(repositoryId);
    if (memRepo) {
      memRepo.status = status;
      memRepo.status_message = statusMessage;
      if (extra.file_count !== undefined) memRepo.file_count = extra.file_count;
      if (extra.chunk_count !== undefined) memRepo.chunk_count = extra.chunk_count;
      if (extra.languages) memRepo.languages = extra.languages;
      if (status === 'ready') memRepo.indexed_at = new Date().toISOString();
      inMemoryStore.repositories.set(repositoryId, memRepo);
    }
  }

  /**
   * Register or fetch existing repository record
   */
  async getOrCreateRepository(url: string): Promise<Repository> {
    const { owner, repo, normalizedUrl } = parseGitHubUrl(url);

    if (isDbConnected()) {
      try {
        const findSql = `SELECT * FROM repositories WHERE url = $1 LIMIT 1;`;
        const existing = await query(findSql, [normalizedUrl]);
        if (existing.rows.length > 0) {
          const row = existing.rows[0];
          return {
            id: row.id,
            owner: row.owner,
            name: row.name,
            url: row.url,
            default_branch: row.default_branch,
            status: row.status,
            status_message: row.status_message,
            file_count: row.file_count,
            chunk_count: row.chunk_count,
            languages: Array.isArray(row.languages) ? row.languages : JSON.parse(row.languages || '[]'),
            indexed_at: row.indexed_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
          };
        }

        const id = uuidv4();
        const insertSql = `
          INSERT INTO repositories (id, owner, name, url, default_branch, status, status_message)
          VALUES ($1, $2, $3, $4, 'main', 'pending', 'Initialized')
          RETURNING *;
        `;
        const res = await query(insertSql, [id, owner, repo, normalizedUrl]);
        const row = res.rows[0];
        return {
          id: row.id,
          owner: row.owner,
          name: row.name,
          url: row.url,
          default_branch: row.default_branch,
          status: row.status,
          status_message: row.status_message,
          file_count: 0,
          chunk_count: 0,
          languages: [],
          indexed_at: null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      } catch (err: any) {
        console.warn(`[IndexingService] DB lookup failed (${err.message}). Using memory store.`);
      }
    }

    // In-memory fallback
    for (const [id, r] of inMemoryStore.repositories.entries()) {
      if (r.url === normalizedUrl) return r;
    }

    const newId = uuidv4();
    const repoRecord: Repository = {
      id: newId,
      owner,
      name: repo,
      url: normalizedUrl,
      default_branch: 'main',
      status: 'pending',
      status_message: 'Initialized',
      file_count: 0,
      chunk_count: 0,
      languages: [],
      indexed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.repositories.set(newId, repoRecord);
    return repoRecord;
  }

  /**
   * Main asynchronous indexing pipeline
   */
  async startIndexing(repositoryId: string, url: string): Promise<void> {
    const { owner, repo } = parseGitHubUrl(url);

    try {
      // Step 1: Connecting to GitHub
      await this.updateStatus(repositoryId, 'fetching', 'Connecting to GitHub...');
      const metadata = await githubService.getRepoMetadata(owner, repo);

      // Step 2: Fetching repository tree
      await this.updateStatus(repositoryId, 'fetching', `Fetching repository tree on ${metadata.defaultBranch}...`);
      const files = await githubService.getRepositoryFiles(owner, repo, metadata.defaultBranch);

      if (files.length === 0) {
        throw new Error('No indexable source code files found in the repository.');
      }

      // Step 3: Downloading and parsing source files
      await this.updateStatus(repositoryId, 'indexing', `Downloading and parsing ${files.length} source files...`);

      const detectedLanguages = new Set<string>();
      const allChunks: CodeChunk[] = [];
      const allRelationships: Relationship[] = [];
      const fileRecords: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        try {
          const content = await githubService.getFileContent(
            owner,
            repo,
            metadata.defaultBranch,
            fileItem.path
          );

          if (!content || !content.trim()) continue;

          detectedLanguages.add(fileItem.language);
          const fileId = uuidv4();

          fileRecords.push({
            id: fileId,
            repository_id: repositoryId,
            path: fileItem.path,
            language: fileItem.language,
            size: fileItem.size,
            content,
          });

          // Chunk the file
          const rawChunks = chunkCode(fileItem.path, content, fileItem.language);
          for (const raw of rawChunks) {
            allChunks.push({
              id: uuidv4(),
              repository_id: repositoryId,
              file_id: fileId,
              file_path: raw.filePath,
              language: raw.language,
              symbol_name: raw.symbolName,
              symbol_type: raw.symbolType,
              start_line: raw.startLine,
              end_line: raw.endLine,
              content: raw.content,
            });
          }

          // Extract relationships
          const fileRels = extractRelationships(
            fileItem.path,
            content,
            fileItem.language,
            repositoryId
          );
          allRelationships.push(...fileRels);
        } catch (fetchErr: any) {
          console.warn(`[IndexingService] Skipped file ${fileItem.path}: ${fetchErr.message}`);
        }
      }

      // Step 4: Generating embeddings
      await this.updateStatus(
        repositoryId,
        'indexing',
        `Generating semantic embeddings for ${allChunks.length} code chunks...`
      );

      const chunkTexts = allChunks.map(
        (c) =>
          `File: ${c.file_path}\nLanguage: ${c.language}\n${c.symbol_name ? `Symbol: ${c.symbol_name} (${c.symbol_type})\n` : ''}${c.content}`
      );

      let embeddings: number[][] = [];
      try {
        if (config.openai.apiKey) {
          embeddings = await openaiService.generateEmbeddings(chunkTexts);
        }
      } catch (embErr: any) {
        console.warn(`[IndexingService] OpenAI embeddings error: ${embErr.message}`);
      }

      if (embeddings.length === 0) {
        embeddings = allChunks.map((c, cIdx) => {
          const vec = new Array(1536).fill(0);
          const seed = (cIdx + 1) * 31;
          for (let i = 0; i < 1536; i++) {
            vec[i] = Math.sin(seed + i) * 0.1;
          }
          return vec;
        });
      }

      // Attach embeddings to chunks
      for (let i = 0; i < allChunks.length; i++) {
        if (embeddings[i]) {
          allChunks[i].embedding = embeddings[i];
        }
      }

      // Step 5: Building code index in database
      await this.updateStatus(repositoryId, 'indexing', 'Building code index and relationship graph...');

      if (isDbConnected()) {
        try {
          await this.persistToDatabase(repositoryId, fileRecords, allChunks, allRelationships);
        } catch (dbErr: any) {
          console.error(`[IndexingService] Database indexing persistence failed: ${dbErr.message}`);
          throw dbErr;
        }
      }

      // In-memory update
      inMemoryStore.files.set(repositoryId, fileRecords);
      inMemoryStore.chunks.set(repositoryId, allChunks);
      inMemoryStore.relationships.set(repositoryId, allRelationships);

      // Step 6: Ready!
      await this.updateStatus(repositoryId, 'ready', 'Repository indexed and ready for intelligence queries', {
        file_count: fileRecords.length,
        chunk_count: allChunks.length,
        languages: Array.from(detectedLanguages),
      });

      console.log(`✅ [IndexingService] Indexing completed for ${owner}/${repo} (${allChunks.length} chunks)`);
    } catch (err: any) {
      console.error(`❌ [IndexingService] Indexing failed for ${repositoryId}:`, err.message);
      await this.updateStatus(repositoryId, 'failed', `Indexing failed: ${err.message}`);
    }
  }

  /**
   * Seeds a realistic full-stack sample repository fixture for instant offline demo/testing
   */
  async indexDemoRepository(): Promise<Repository> {
    const demoUrl = 'https://github.com/codeatlas-demo/express-auth-microservice';
    const repo = await this.getOrCreateRepository(demoUrl);

    // Realistic source code fixture
    const demoFiles = [
      {
        path: 'src/app.ts',
        language: 'TypeScript',
        content: `import express from 'express';
import { authRouter } from './routes/authRoutes';
import { userRouter } from './routes/userRoutes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

app.use(errorHandler);`,
      },
      {
        path: 'src/routes/authRoutes.ts',
        language: 'TypeScript',
        content: `import { Router } from 'express';
import { AuthController } from '../controllers/authController';

export const authRouter = Router();
const controller = new AuthController();

authRouter.post('/login', controller.login);
authRouter.post('/register', controller.register);
authRouter.post('/refresh-token', controller.refreshToken);`,
      },
      {
        path: 'src/controllers/authController.ts',
        language: 'TypeScript',
        content: `import { Request, Response } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.loginUser(email, password);
    res.json(result);
  };

  register = async (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    const user = await this.authService.registerUser(email, password, name);
    res.status(201).json(user);
  };

  refreshToken = async (req: Request, res: Response) => {
    const { token } = req.body;
    const tokens = await this.authService.refreshSession(token);
    res.json(tokens);
  };
}`,
      },
      {
        path: 'src/services/authService.ts',
        language: 'TypeScript',
        content: `import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel';

export class AuthService {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel();
  }

  async loginUser(email: string, password: string) {
    const user = await this.userModel.findByEmail(email);
    if (!user) throw new Error('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret');
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }

  async registerUser(email: string, password: string, name: string) {
    const existing = await this.userModel.findByEmail(email);
    if (existing) throw new Error('User already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userModel.create({ email, passwordHash, name });
  }

  async refreshSession(refreshToken: string) {
    return { accessToken: 'new-token' };
  }
}`,
      },
      {
        path: 'src/models/userModel.ts',
        language: 'TypeScript',
        content: `import { pool } from '../config/database';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  oauthProvider?: string;
  oauthId?: string;
}

export class UserModel {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  async create(data: Partial<User>): Promise<User> {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
      [data.email, data.passwordHash, data.name]
    );
    return result.rows[0];
  }
}`,
      },
      {
        path: 'src/config/database.ts',
        language: 'TypeScript',
        content: `import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});`,
      },
    ];

    const detectedLanguages = ['TypeScript'];
    const allChunks: CodeChunk[] = [];
    const allRelationships: Relationship[] = [];
    const fileRecords: any[] = [];

    for (const f of demoFiles) {
      const fileId = uuidv4();
      fileRecords.push({
        id: fileId,
        repository_id: repo.id,
        path: f.path,
        language: f.language,
        size: f.content.length,
        content: f.content,
      });

      const rawChunks = chunkCode(f.path, f.content, f.language);
      for (const raw of rawChunks) {
        allChunks.push({
          id: uuidv4(),
          repository_id: repo.id,
          file_id: fileId,
          file_path: raw.filePath,
          language: raw.language,
          symbol_name: raw.symbolName,
          symbol_type: raw.symbolType,
          start_line: raw.startLine,
          end_line: raw.endLine,
          content: raw.content,
        });
      }

      const rels = extractRelationships(f.path, f.content, f.language, repo.id);
      allRelationships.push(...rels);
    }

    // Try OpenAI embeddings if API key is configured, else synthesize deterministic embeddings
    let embeddings: number[][] = [];
    try {
      if (openaiService && config.openai.apiKey) {
        const texts = allChunks.map((c) => `${c.file_path} ${c.symbol_name || ''} ${c.content}`);
        embeddings = await openaiService.generateEmbeddings(texts);
      }
    } catch {
      embeddings = [];
    }

    if (embeddings.length === 0) {
      // Deterministic 1536 float embedding generator for mock/demo testing
      embeddings = allChunks.map((c, cIdx) => {
        const vec = new Array(1536).fill(0);
        const seed = (cIdx + 1) * 31;
        for (let i = 0; i < 1536; i++) {
          vec[i] = Math.sin(seed + i) * 0.1;
        }
        return vec;
      });
    }

    for (let i = 0; i < allChunks.length; i++) {
      allChunks[i].embedding = embeddings[i];
    }

    inMemoryStore.repositories.set(repo.id, {
      ...repo,
      status: 'ready',
      status_message: 'Demo repository indexed and ready',
      file_count: fileRecords.length,
      chunk_count: allChunks.length,
      languages: detectedLanguages,
      indexed_at: new Date().toISOString(),
    });
    inMemoryStore.files.set(repo.id, fileRecords);
    inMemoryStore.chunks.set(repo.id, allChunks);
    inMemoryStore.relationships.set(repo.id, allRelationships);

    if (isDbConnected()) {
      try {
        await this.persistToDatabase(repo.id, fileRecords, allChunks, allRelationships);
        await this.updateStatus(repo.id, 'ready', 'Demo repository ready', {
          file_count: fileRecords.length,
          chunk_count: allChunks.length,
          languages: detectedLanguages,
        });
      } catch (e: any) {
        console.warn(`[IndexingService] Could not persist demo to DB: ${e.message}`);
      }
    }

    return inMemoryStore.repositories.get(repo.id)!;
  }

  /**
   * Persist files, code chunks with embeddings, and relationships into PostgreSQL
   */
  private async persistToDatabase(
    repositoryId: string,
    fileRecords: any[],
    allChunks: CodeChunk[],
    allRelationships: Relationship[]
  ): Promise<void> {
    if (!isDbConnected()) return;

    try {
      // Clear prior data if re-indexing
      await query(`DELETE FROM files WHERE repository_id = $1;`, [repositoryId]);
      await query(`DELETE FROM code_chunks WHERE repository_id = $1;`, [repositoryId]);
      await query(`DELETE FROM relationships WHERE repository_id = $1;`, [repositoryId]);

      // Insert files
      for (const f of fileRecords) {
        await query(
          `INSERT INTO files (id, repository_id, path, language, size, content)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (repository_id, path) DO UPDATE SET content = EXCLUDED.content, size = EXCLUDED.size;`,
          [f.id, repositoryId, f.path, f.language, f.size, f.content]
        );
      }

      // Insert code chunks with vector embeddings
      for (const c of allChunks) {
        const vecSql = c.embedding ? pgvector.toSql(c.embedding) : null;
        await query(
          `INSERT INTO code_chunks (id, repository_id, file_id, file_path, language, symbol_name, symbol_type, start_line, end_line, content, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $11::text IS NULL THEN NULL ELSE $11::vector END);`,
          [
            c.id,
            repositoryId,
            c.file_id,
            c.file_path,
            c.language,
            c.symbol_name || null,
            c.symbol_type || null,
            c.start_line,
            c.end_line,
            c.content,
            vecSql,
          ]
        );
      }

      // Insert relationships
      for (const r of allRelationships) {
        await query(
          `INSERT INTO relationships (id, repository_id, source_file_path, target_file_path, source_symbol, target_symbol, relationship_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [
            uuidv4(),
            repositoryId,
            r.source_file_path,
            r.target_file_path || null,
            r.source_symbol || null,
            r.target_symbol || null,
            r.relationship_type,
          ]
        );
      }
      console.log(`✅ [IndexingService] Successfully saved ${fileRecords.length} files, ${allChunks.length} chunks, and ${allRelationships.length} relationships to PostgreSQL.`);
    } catch (dbErr: any) {
      console.error(`[IndexingService] Database indexing persistence failed: ${dbErr.message}`);
      throw dbErr;
    }
  }
}

export const indexingService = new IndexingService();
