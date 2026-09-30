import pgvector from 'pgvector/pg';
import { query, isDbConnected } from '../config/db';
import { CodeChunk, SearchResult, Relationship } from '../types';
import { config } from '../config';

// In-memory fallback store when running without live PostgreSQL or in mock/test mode
export const inMemoryStore: {
  repositories: Map<string, any>;
  files: Map<string, any[]>;
  chunks: Map<string, CodeChunk[]>;
  relationships: Map<string, Relationship[]>;
} = {
  repositories: new Map(),
  files: new Map(),
  chunks: new Map(),
  relationships: new Map(),
};

export class VectorService {
  /**
   * Cosine similarity between two float vectors (for in-memory search fallback)
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Search top K code chunks by cosine similarity using pgvector or fallback
   */
  async searchSimilarChunks(
    repositoryId: string,
    queryEmbedding: number[],
    topK: number = config.retrieval.topK,
    rawQuery?: string
  ): Promise<SearchResult[]> {
    if (isDbConnected()) {
      try {
        const vectorSql = pgvector.toSql(queryEmbedding);
        const sql = `
          SELECT 
            id,
            repository_id,
            file_id,
            file_path,
            language,
            symbol_name,
            symbol_type,
            start_line,
            end_line,
            content,
            1 - (embedding <=> $1::vector) AS similarity
          FROM code_chunks
          WHERE repository_id = $2
            AND embedding IS NOT NULL
          ORDER BY embedding <=> $1::vector ASC
          LIMIT $3;
        `;
        const result = await query(sql, [vectorSql, repositoryId, topK]);
        return result.rows.map((row: any) => ({
          ...row,
          similarity: Math.max(0, Math.min(1, parseFloat(row.similarity) || 0)),
        }));
      } catch (err: any) {
        console.warn(`[VectorService] DB query failed (${err.message}). Falling back to in-memory search.`);
      }
    }

    // In-memory fallback with hybrid keyword & vector scoring
    const repoChunks = inMemoryStore.chunks.get(repositoryId) || [];
    const stopWords = new Set(['where', 'what', 'how', 'the', 'is', 'in', 'to', 'for', 'and', 'from', 'with', 'are']);
    const terms = rawQuery
      ? rawQuery.toLowerCase().split(/[\s,?.!]+/).filter((t) => t.length > 2 && !stopWords.has(t))
      : [];

    const scored = repoChunks.map((c) => {
      let sim = c.embedding ? this.cosineSimilarity(queryEmbedding, c.embedding) : 0;
      if (terms.length > 0) {
        const contentLower = `${c.file_path} ${c.symbol_name || ''} ${c.content}`.toLowerCase();
        let matched = 0;
        for (const term of terms) {
          const root = term.length > 4 ? term.slice(0, 4) : term;
          if (contentLower.includes(term) || contentLower.includes(root)) {
            matched++;
          }
        }
        if (matched > 0) {
          const keywordBonus = 0.75 + (matched / terms.length) * 0.20;
          sim = Math.max(sim, keywordBonus);
        }
      }
      const { embedding, ...rest } = c;
      return {
        ...rest,
        similarity: Math.max(0, Math.min(0.96, sim)),
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

    return scored;
  }

  /**
   * Expand chunks through relationship graph (e.g. imports, function calls, database connections)
   */
  async expandThroughRelationships(
    repositoryId: string,
    initialChunks: CodeChunk[],
    maxAdditional: number = 3
  ): Promise<{ chunks: CodeChunk[]; relationships: Relationship[] }> {
    const filePaths = Array.from(new Set(initialChunks.map((c) => c.file_path)));
    let relationships: Relationship[] = [];

    if (isDbConnected()) {
      try {
        const sql = `
          SELECT * FROM relationships
          WHERE repository_id = $1
            AND (source_file_path = ANY($2::text[]) OR target_file_path = ANY($2::text[]))
          LIMIT 20;
        `;
        const res = await query(sql, [repositoryId, filePaths]);
        relationships = res.rows;
      } catch (err: any) {
        console.warn(`[VectorService] Failed to fetch relationships from DB: ${err.message}`);
      }
    } else {
      const repoRels = inMemoryStore.relationships.get(repositoryId) || [];
      relationships = repoRels.filter(
        (r) => filePaths.includes(r.source_file_path) || (r.target_file_path && filePaths.includes(r.target_file_path))
      );
    }

    // Identify related file paths not yet in initialChunks
    const relatedFiles = new Set<string>();
    for (const rel of relationships) {
      if (rel.target_file_path && !filePaths.includes(rel.target_file_path)) {
        relatedFiles.add(rel.target_file_path);
      }
    }

    const additionalChunks: CodeChunk[] = [];
    if (relatedFiles.size > 0) {
      const targetPaths = Array.from(relatedFiles).slice(0, maxAdditional);
      if (isDbConnected()) {
        try {
          const sql = `
            SELECT id, repository_id, file_id, file_path, language, symbol_name, symbol_type, start_line, end_line, content
            FROM code_chunks
            WHERE repository_id = $1 AND file_path = ANY($2::text[])
            LIMIT $3;
          `;
          const res = await query(sql, [repositoryId, targetPaths, maxAdditional]);
          additionalChunks.push(...res.rows);
        } catch (err: any) {
          console.warn(`[VectorService] Additional chunk fetch failed: ${err.message}`);
        }
      } else {
        const repoChunks = inMemoryStore.chunks.get(repositoryId) || [];
        for (const p of targetPaths) {
          const matches = repoChunks.filter((c) => c.file_path === p).slice(0, 1);
          additionalChunks.push(...matches);
        }
      }
    }

    // Combined unique chunks
    const seenIds = new Set<string>();
    const combinedChunks: CodeChunk[] = [];
    for (const c of [...initialChunks, ...additionalChunks]) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        combinedChunks.push(c);
      }
    }

    return { chunks: combinedChunks, relationships };
  }
}

export const vectorService = new VectorService();
