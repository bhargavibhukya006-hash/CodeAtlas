import { app } from './app';
import { config } from './config';
import { testConnection, runMigrations } from './config/db';

async function startServer() {
  console.log('🚀 Starting CodeAtlas Backend Service...');

  // Initialize and verify database connection
  const dbOk = await testConnection();
  if (dbOk) {
    await runMigrations();
  } else {
    console.log('ℹ️ Running in memory/hybrid fallback mode until PostgreSQL is available.');
  }

  const server = app.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(`📡 CodeAtlas API listening on http://localhost:${config.port}`);
    console.log(`🩺 Health check: http://localhost:${config.port}/health`);
    console.log(`🔑 OpenAI Key configured: ${config.openai.apiKey ? 'YES' : 'NO (Add to .env)'}`);
    console.log(`🐙 GitHub Token configured: ${config.github.token ? 'YES' : 'NO (Optional public mode)'}`);
    console.log(`===============================================`);
  });

  const shutdown = () => {
    console.log('Stopping CodeAtlas API server...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
