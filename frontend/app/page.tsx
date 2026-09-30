'use client';

import React, { useState } from 'react';
import { RepositoryInput } from '../components/RepositoryInput';
import { IndexingProgress } from '../components/IndexingProgress';
import {
  Activity,
  Search,
  MessageSquareCode,
  GitBranch,
  Layers,
  Sparkles,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Database,
  Terminal,
} from 'lucide-react';

export default function LandingPage() {
  const [indexingRepoId, setIndexingRepoId] = useState<string | null>(null);

  const features = [
    {
      title: 'Change Impact Analysis',
      tag: 'Differentiating Feature',
      icon: Activity,
      iconColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      description:
        'Propose an architectural change (e.g. "Add Google OAuth") and identify affected files, functions, dependency cascades, and ordered implementation plans.',
    },
    {
      title: 'Semantic Code Search',
      tag: 'pgvector HNSW',
      icon: Search,
      iconColor: 'text-sky-400',
      bgColor: 'bg-sky-500/10 border-sky-500/20',
      description:
        'Search your codebase by semantic meaning rather than exact keywords. Find where tokens are verified or database connections are pooled instantly.',
    },
    {
      title: 'Grounded Code Intelligence',
      tag: 'No Hallucinations',
      icon: MessageSquareCode,
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
      description:
        'Ask deep questions about request flows and data lifecycles. Every assertion is strictly backed by verifiable file and line citations [src/auth.ts:42-78].',
    },
    {
      title: 'Code Graph & Dependency Mapping',
      tag: 'Multi-Language AST',
      icon: Layers,
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      description:
        'Automatically extracts IMPORTS, CALLS, DEFINES, and DATABASE query relationships across JavaScript, TypeScript, Python, Java, Go, and C++.',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Repository Ingestion',
      description: 'Fetches public GitHub repositories recursively while ignoring builds, binaries, and dependencies.',
    },
    {
      step: '02',
      title: 'Symbol AST & Chunking',
      description: 'Extracts classes, routes, functions, and interfaces into semantic code chunks with line boundaries.',
    },
    {
      step: '03',
      title: 'Vector Space Indexing',
      description: 'Batches OpenAI embeddings and populates PostgreSQL pgvector with HNSW cosine similarity indexes.',
    },
    {
      step: '04',
      title: 'Impact & Q&A Synthesis',
      description: 'Traverses relationship graphs and prompts grounded LLMs to return cited impact reports and plans.',
    },
  ];

  return (
    <div className="flex-1 bg-grid-pattern relative">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono mb-6">
          <Terminal className="w-3.5 h-3.5" />
          <span>Codebase Intelligence & Change Impact Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Understand Any Codebase <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            with AI
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Search, explore, and analyze the impact of changes across your GitHub repositories with vector embeddings and dependency graphs.
        </p>

        {/* Repository Ingestion Card or Active Indexing Bar */}
        <div className="mt-10">
          {indexingRepoId ? (
            <IndexingProgress repositoryId={indexingRepoId} onReset={() => setIndexingRepoId(null)} />
          ) : (
            <RepositoryInput onStartIndexing={(id) => setIndexingRepoId(id)} />
          )}
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-sky-400">Capabilities</h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1">Engineered for Serious Developers</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-surface/80 p-6 backdrop-blur-sm hover:border-slate-700 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${feat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${feat.iconColor}`} />
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    {feat.tag}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                  {feat.title}
                </h4>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans">{feat.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it Works / Workflow Pipeline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-xs uppercase tracking-widest font-mono font-bold text-indigo-400">Architecture Flow</h2>
          <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1">How CodeAtlas Indexes &amp; Analyzes</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => (
            <div
              key={st.step}
              className="rounded-xl border border-slate-800/80 bg-surface-elevated/40 p-5 relative overflow-hidden"
            >
              <div className="text-3xl font-black font-mono text-slate-800 mb-2">{st.step}</div>
              <h5 className="text-sm font-bold text-white mb-2">{st.title}</h5>
              <p className="text-xs text-slate-400 leading-relaxed">{st.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
