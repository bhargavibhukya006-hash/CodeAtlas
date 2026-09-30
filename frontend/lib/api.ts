import { Repository, SearchResult, QAResponse, ImpactReport, FileRecord } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data?.error?.message || data?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  async indexRepository(url: string): Promise<{ repositoryId: string; status: string; repository: Repository }> {
    return fetchJson(`${API_BASE}/api/repositories/index`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async seedDemo(): Promise<{ repositoryId: string; status: string; repository: Repository }> {
    return fetchJson(`${API_BASE}/api/repositories/demo`, {
      method: 'POST',
    });
  },

  async getRepository(id: string): Promise<Repository> {
    return fetchJson(`${API_BASE}/api/repositories/${id}`);
  },

  async getStatus(id: string): Promise<{
    id: string;
    status: string;
    statusMessage: string;
    fileCount: number;
    chunkCount: number;
    languages: string[];
    indexedAt: string | null;
  }> {
    return fetchJson(`${API_BASE}/api/repositories/${id}/status`);
  },

  async searchCode(id: string, query: string): Promise<{ query: string; total: number; results: SearchResult[] }> {
    return fetchJson(`${API_BASE}/api/repositories/${id}/search?q=${encodeURIComponent(query)}`);
  },

  async askCodeAtlas(id: string, question: string): Promise<QAResponse> {
    return fetchJson(`${API_BASE}/api/repositories/${id}/ask`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },

  async analyzeImpact(id: string, changeDescription: string): Promise<ImpactReport> {
    return fetchJson(`${API_BASE}/api/repositories/${id}/impact-analysis`, {
      method: 'POST',
      body: JSON.stringify({ changeDescription }),
    });
  },

  async getFiles(id: string): Promise<FileRecord[]> {
    return fetchJson(`${API_BASE}/api/repositories/${id}/files`);
  },

  async getRelationships(id: string): Promise<any[]> {
    return fetchJson(`${API_BASE}/api/repositories/${id}/relationships`);
  },
};
