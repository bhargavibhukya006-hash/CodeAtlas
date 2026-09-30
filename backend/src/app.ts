import express, { Application } from 'express';
import cors from 'cors';
import repositoryRoutes from './routes/repositoryRoutes';
import { errorHandler } from './middleware/errorHandler';
import { isDbConnected } from './config/db';
import { config } from './config';

export function createApp(): Application {
  const app = express();

  // Middleware
  app.use(cors({
    origin: '*', // Allows local Next.js frontend or production URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'CodeAtlas Backend API',
      timestamp: new Date().toISOString(),
      databaseConnected: isDbConnected(),
      openaiConfigured: Boolean(config.openai.apiKey),
      githubConfigured: Boolean(config.github.token),
    });
  });

  // Mount API routes
  app.use('/api/repositories', repositoryRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
