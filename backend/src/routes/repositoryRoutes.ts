import { Router } from 'express';
import { repositoryController } from '../controllers/repositoryController';

const router = Router();

// Index a repository from public GitHub URL
router.post('/index', (req, res, next) => repositoryController.indexRepository(req, res, next));

// Seed demo repository for instant testing
router.post('/demo', (req, res, next) => repositoryController.seedDemo(req, res, next));

// Get repository metadata & stats
router.get('/:id', (req, res, next) => repositoryController.getRepository(req, res, next));

// Polling repository indexing status
router.get('/:id/status', (req, res, next) => repositoryController.getStatus(req, res, next));

// Semantic code search using pgvector
router.get('/:id/search', (req, res, next) => repositoryController.searchCode(req, res, next));

// Ask CodeAtlas (Grounded Q&A with citations)
router.post('/:id/ask', (req, res, next) => repositoryController.askCodeAtlas(req, res, next));

// Change Impact Analysis (Grounded impact report with plan and graph)
router.post('/:id/impact-analysis', (req, res, next) => repositoryController.analyzeChangeImpact(req, res, next));

// List indexed files
router.get('/:id/files', (req, res, next) => repositoryController.getFiles(req, res, next));

// List code relationships
router.get('/:id/relationships', (req, res, next) => repositoryController.getRelationships(req, res, next));

export default router;
