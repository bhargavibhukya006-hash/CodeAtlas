'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Sparkles, Github, Database } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Compass className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">CodeAtlas</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                pgvector AI
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Codebase Intelligence & Change Impact Analysis</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-surface px-3 py-1.5 rounded-lg border border-border/60">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>pgvector HNSW</span>
            <span className="text-slate-600">•</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>OpenAI Embeddings</span>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white bg-surface-elevated hover:bg-slate-700/60 px-3 py-2 rounded-lg border border-border/80 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
