import request from 'supertest';
import { app } from '../app';

describe('Repository API Endpoints', () => {
  let demoRepoId = '';

  it('GET /health returns healthy service status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('CodeAtlas Backend API');
  });

  it('POST /api/repositories/demo seeds a sample repository', async () => {
    const res = await request(app).post('/api/repositories/demo');
    expect(res.status).toBe(200);
    expect(res.body.repositoryId).toBeDefined();
    expect(res.body.repository.file_count).toBeGreaterThan(0);
    expect(res.body.repository.chunk_count).toBeGreaterThan(0);
    demoRepoId = res.body.repositoryId;
  });

  it('GET /api/repositories/:id returns repository details', async () => {
    const res = await request(app).get(`/api/repositories/${demoRepoId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(demoRepoId);
    expect(res.body.name).toBe('express-auth-microservice');
  });

  it('GET /api/repositories/:id/status returns indexing status', async () => {
    const res = await request(app).get(`/api/repositories/${demoRepoId}/status`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.fileCount).toBeGreaterThan(0);
  });

  it('GET /api/repositories/:id/files returns indexed files', async () => {
    const res = await request(app).get(`/api/repositories/${demoRepoId}/files`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/repositories/:id/relationships returns relationship edges', async () => {
    const res = await request(app).get(`/api/repositories/${demoRepoId}/relationships`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/repositories/index validates invalid URLs', async () => {
    const res = await request(app)
      .post('/api/repositories/index')
      .send({ url: 'https://not-github.com/foo/bar' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
