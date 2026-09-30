'use client';

import React, { useState } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  initialQuery?: string;
}

const QUICK_QUERIES = [
  'Where is authentication handled?',
  'Where is the database connection initialized?',
  'How are API errors formatted and returned?',
  'Where is password hashing or token verification done?',
];

export function SearchBar({ onSearch, isLoading, initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (suggested: string) => {
    setQuery(suggested);
    onSearch(suggested);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface/90 border border-slate-700/80 shadow-xl focus-within:border-sky-500/80 focus-within:ring-1 focus-within:ring-sky-500/40 transition-all">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code semantics, e.g. 'Where is authentication handled?' or 'User session management'..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
            disabled={isLoading}
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Search</span>
          </button>
        </div>
      </form>

      {/* Suggested semantic queries */}
      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-500 font-medium">Suggestions:</span>
        {QUICK_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSuggestionClick(q)}
            className="text-slate-400 hover:text-sky-300 bg-surface-elevated/70 hover:bg-surface-elevated px-2.5 py-1 rounded-lg border border-border/50 font-mono text-[11px] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
