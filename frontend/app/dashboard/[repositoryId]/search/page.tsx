'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { SearchResult } from '../../../../types';
import { SearchBar } from '../../../../components/SearchBar';
import { CodeResult } from '../../../../components/CodeResult';
import { CodeViewer } from '../../../../components/CodeViewer';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';
import { Search, Database, Layers } from 'lucide-react';

export default function SearchPage() {
  const params = useParams();
  const repositoryId = params.repositoryId as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string>('');

  const [viewerItem, setViewerItem] = useState<SearchResult | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setSearchedQuery(query);

    try {
      const data = await api.searchCode(repositoryId, query);
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Semantic search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Search className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Semantic Code Search</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Search the codebase semantically using high-dimensional vector embeddings and cosine similarity calculated with pgvector.
        </p>
      </div>

      <SearchBar onSearch={handleSearch} isLoading={loading} />

      {loading && <LoadingState title="Searching Code Chunks..." message="Computing query embedding and cosine distance across vector database..." />}

      {error && <ErrorState error={error} onRetry={() => handleSearch(searchedQuery)} />}

      {!loading && searchedQuery && (
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-2 border-b border-border/50">
          <span>
            Found <strong>{results.length}</strong> semantic matches for &quot;{searchedQuery}&quot;
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Database className="w-3.5 h-3.5" />
            <span>pgvector HNSW</span>
          </span>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-4">
        {results.map((result) => (
          <CodeResult
            key={result.id}
            result={result}
            onOpenViewer={(r) => setViewerItem(r)}
          />
        ))}
      </div>

      {viewerItem && (
        <CodeViewer
          isOpen={true}
          onClose={() => setViewerItem(null)}
          filePath={viewerItem.file_path}
          language={viewerItem.language}
          content={viewerItem.content}
          startLine={viewerItem.start_line}
          endLine={viewerItem.end_line}
          symbolName={viewerItem.symbol_name}
        />
      )}
    </div>
  );
}
