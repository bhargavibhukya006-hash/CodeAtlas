import { Request, Response, NextFunction } from 'express';
import { indexingService } from '../services/indexingService';
import { vectorService, inMemoryStore } from '../services/vectorService';
import { openaiService } from '../services/openaiService';
import { qaService } from '../services/qaService';
import { impactService } from '../services/impactService';
import { isDbConnected, query } from '../config/db';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { parseGitHubUrl } from '../utils/github';

export class RepositoryController {
  /**
   * POST /api/repositories/index
   * Body: { url: string }
   */
  async indexRepository(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { url } = req.body;
      if (!url) {
        throw new BadRequestError('GitHub repository URL is required');
      }

      // Validate URL syntax
      const parsed = parseGitHubUrl(url);

      // Create or get repository record
      const repo = await indexingService.getOrCreateRepository(parsed.normalizedUrl);

      // Initiate indexing asynchronously in the background
      indexingService.startIndexing(repo.id, parsed.normalizedUrl).catch((err) => {
        console.error(`Async indexing failed for ${repo.id}:`, err);
      });

      res.status(202).json({
        repositoryId: repo.id,
        status: repo.status,
        message: 'Repository indexing started',
        repository: repo,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/repositories/demo
   * Creates/seeds the mock microservice repo fixture
   */
  async seedDemo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const repo = await indexingService.indexDemoRepository();
      res.status(200).json({
        repositoryId: repo.id,
        status: repo.status,
        message: 'Demo repository indexed and ready',
        repository: repo,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/repositories/:id
   */
  async getRepository(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (isDbConnected()) {
        try {
          const resDb = await query('SELECT * FROM repositories WHERE id = $1;', [id]);
          if (resDb.rows.length > 0) {
            const row = resDb.rows[0];
            res.json({
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
            });
            return;
          }
        } catch (err: any) {
          console.warn(`DB read failed: ${err.message}`);
        }
      }

      const memRepo = inMemoryStore.repositories.get(id);
      if (!memRepo) {
        throw new NotFoundError(`Repository ${id} not found`);
      }

      res.json(memRepo);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/repositories/:id/status
   */
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (isDbConnected()) {
        try {
          const resDb = await query(
            'SELECT id, status, status_message, file_count, chunk_count, languages, indexed_at FROM repositories WHERE id = $1;',
            [id]
          );
          if (resDb.rows.length > 0) {
            const r = resDb.rows[0];
            res.json({
              id: r.id,
              status: r.status,
              statusMessage: r.status_message,
              fileCount: r.file_count,
              chunkCount: r.chunk_count,
              languages: Array.isArray(r.languages) ? r.languages : JSON.parse(r.languages || '[]'),
              indexedAt: r.indexed_at,
            });
            return;
          }
        } catch (err: any) {
          console.warn(`DB getStatus failed: ${err.message}`);
        }
      }

      const memRepo = inMemoryStore.repositories.get(id);
      if (!memRepo) {
        throw new NotFoundError(`Repository ${id} not found`);
      }

      res.json({
        id: memRepo.id,
        status: memRepo.status,
        statusMessage: memRepo.status_message,
        fileCount: memRepo.file_count,
        chunkCount: memRepo.chunk_count,
        languages: memRepo.languages,
        indexedAt: memRepo.indexed_at,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/repositories/:id/search?q=
   */
  async searchCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const queryText = req.query.q as string;

      if (!queryText || !queryText.trim()) {
        throw new BadRequestError('Search query parameter "q" is required');
      }

      // Generate embedding for query
      let queryEmbedding: number[];
      try {
        queryEmbedding = await openaiService.generateSingleEmbedding(queryText.trim());
      } catch (embErr) {
        // If OpenAI key not configured, create a fallback matching query for demo/local testing
        const sampleChunks = inMemoryStore.chunks.get(id) || [];
        if (sampleChunks.length > 0 && sampleChunks[0].embedding) {
          queryEmbedding = sampleChunks[0].embedding;
        } else {
          throw embErr;
        }
      }

      const results = await vectorService.searchSimilarChunks(id, queryEmbedding, undefined, queryText);
      res.json({
        query: queryText,
        total: results.length,
        results,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/repositories/:id/ask
   * Body: { question: string }
   */
  async askCodeAtlas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { question } = req.body;

      if (!question || !question.trim()) {
        throw new BadRequestError('Question is required');
      }

      const answerData = await qaService.askQuestion(id, question);
      res.json(answerData);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/repositories/:id/impact-analysis
   * Body: { changeDescription: string }
   */
  async analyzeChangeImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { changeDescription } = req.body;

      if (!changeDescription || !changeDescription.trim()) {
        throw new BadRequestError('changeDescription is required');
      }

      const report = await impactService.analyzeChange(id, changeDescription);
      res.json(report);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/repositories/:id/files
   */
  async getFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (isDbConnected()) {
        try {
          const filesDb = await query('SELECT id, path, language, size FROM files WHERE repository_id = $1 ORDER BY path ASC;', [id]);
          if (filesDb.rows.length > 0) {
            res.json(filesDb.rows);
            return;
          }
        } catch (err: any) {
          console.warn(`DB getFiles failed: ${err.message}`);
        }
      }

      const memFiles = inMemoryStore.files.get(id) || [];
      res.json(
        memFiles.map((f) => ({
          id: f.id,
          path: f.path,
          language: f.language,
          size: f.size,
        }))
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/repositories/:id/relationships
   */
  async getRelationships(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (isDbConnected()) {
        try {
          const relsDb = await query('SELECT * FROM relationships WHERE repository_id = $1 LIMIT 100;', [id]);
          if (relsDb.rows.length > 0) {
            res.json(relsDb.rows);
            return;
          }
        } catch (err: any) {
          console.warn(`DB getRelationships failed: ${err.message}`);
        }
      }

      const memRels = inMemoryStore.relationships.get(id) || [];
      res.json(memRels);
    } catch (err) {
      next(err);
    }
  }
}

export const repositoryController = new RepositoryController();
