'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, ArrowRight, Loader2, Sparkles, Terminal } from 'lucide-react';
import { api } from '../lib/api';

interface RepositoryInputProps {
  onStartIndexing?: (repoId: string) => void;
}

export function RepositoryInput({ onStartIndexing }: RepositoryInputProps) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const result = await api.indexRepository(url.trim());
      if (onStartIndexing) {
        onStartIndexing(result.repositoryId);
      } else {
        router.push(`/dashboard/${result.repositoryId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit repository for indexing');
      setLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setError(null);
    setDemoLoading(true);

    try {
      const result = await api.seedDemo();
      router.push(`/dashboard/${result.repositoryId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to seed demo repository');
      setDemoLoading(false);
    }
  };

  const handleQuickSelect = (exampleUrl: string) => {
    setUrl(exampleUrl);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-2xl bg-surface/90 border border-slate-700/80 shadow-2xl shadow-sky-950/30 backdrop-blur-xl focus-within:border-sky-500/80 transition-all">
          <div className="flex items-center flex-1 px-3 py-2 gap-3">
            <Github className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://github.com/owner/repository"
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
              disabled={loading || demoLoading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading || !url.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Indexing...</span>
              </>
            ) : (
              <>
                <span>Analyze Repository</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Quick Select & Demo CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 flex-wrap">
          <span className="text-slate-500">Quick Try:</span>
          <button
            type="button"
            onClick={() => handleQuickSelect('https://github.com/expressjs/express')}
            className="hover:text-sky-300 font-mono bg-surface-elevated px-2 py-0.5 rounded border border-border/60 transition-colors"
          >
            expressjs/express
          </button>
          <button
            type="button"
            onClick={() => handleQuickSelect('https://github.com/fastapi/fastapi')}
            className="hover:text-sky-300 font-mono bg-surface-elevated px-2 py-0.5 rounded border border-border/60 transition-colors"
          >
            fastapi/fastapi
          </button>
        </div>

        <button
          type="button"
          onClick={handleDemoClick}
          disabled={demoLoading || loading}
          className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1 rounded-lg border border-sky-500/30 transition-all font-medium"
        >
          {demoLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>Explore Live Auth Microservice Demo</span>
        </button>
      </div>
    </div>
  );
}
