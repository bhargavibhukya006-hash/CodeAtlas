'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { QAResponse, SourceReference as SourceReferenceType } from '../types';
import { SourceReference } from './SourceReference';
import { CodeViewer } from './CodeViewer';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { MessageSquareCode, Send, Sparkles, AlertCircle, FileCode, CheckCircle2 } from 'lucide-react';

interface AskPanelProps {
  repositoryId: string;
}

const SAMPLE_QUESTIONS = [
  'How does authentication work in this codebase?',
  'Where is the database connection initialized?',
  'Explain the request flow for user login and registration.',
  'What security safeguards or password hashing mechanisms are used?',
];

export function AskPanel({ repositoryId }: AskPanelProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qaResult, setQaResult] = useState<QAResponse | null>(null);

  const [activeCodeViewer, setActiveCodeViewer] = useState<{
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    language: string;
    symbolName?: string;
  } | null>(null);

  const handleAsk = async (qText: string) => {
    if (!qText.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.askCodeAtlas(repositoryId, qText.trim());
      setQaResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to generate codebase response');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(question);
  };

  const handleRefClick = (ref: SourceReferenceType) => {
    const matchingChunk = qaResult?.evidence?.find(
      (c) => c.file_path === ref.filePath && c.start_line <= ref.startLine && c.end_line >= ref.endLine
    ) || qaResult?.evidence?.find((c) => c.file_path === ref.filePath);

    setActiveCodeViewer({
      filePath: ref.filePath,
      startLine: ref.startLine,
      endLine: ref.endLine,
      content: matchingChunk ? matchingChunk.content : `// Source: ${ref.filePath}:${ref.startLine}-${ref.endLine}`,
      language: matchingChunk ? matchingChunk.language : 'TypeScript',
      symbolName: ref.symbolName || matchingChunk?.symbol_name,
    });
  };

  return (
    <div className="space-y-6">
      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-surface/90 border border-slate-700/80 shadow-xl focus-within:border-sky-500/80 transition-all">
          <MessageSquareCode className="w-5 h-5 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about the codebase, architecture, or request flows..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono py-2"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </div>
      </form>

      {/* Suggested Questions */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-500 font-medium">Try asking:</span>
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setQuestion(q);
              handleAsk(q);
            }}
            className="text-slate-400 hover:text-sky-300 bg-surface-elevated/70 hover:bg-surface-elevated px-2.5 py-1 rounded-lg border border-border/50 font-mono text-[11px] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {loading && <LoadingState title="Analyzing Code Evidence..." message="Embedding question and retrieving grounded code vectors..." />}

      {error && <ErrorState error={error} onRetry={() => handleAsk(question)} />}

      {/* Q&A Result */}
      {qaResult && !loading && (
        <div className="rounded-2xl border border-slate-700/80 bg-surface/90 p-6 shadow-xl space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Grounded CodeAtlas Response</h3>
            </div>

            <span
              className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                qaResult.confidence === 'high'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : qaResult.confidence === 'insufficient_evidence'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
              }`}
            >
              {qaResult.confidence === 'insufficient_evidence' ? 'Insufficient Evidence' : `${qaResult.confidence} confidence`}
            </span>
          </div>

          {/* Formatted Answer */}
          <div className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
            {qaResult.answer}
          </div>

          {/* Clickable Citations Panel */}
          {qaResult.sourceReferences && qaResult.sourceReferences.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 mb-2">Supporting Citations:</h4>
              <div className="flex flex-wrap gap-2">
                {qaResult.sourceReferences.map((ref, idx) => (
                  <SourceReference key={idx} reference={ref} onClick={handleRefClick} />
                ))}
              </div>
            </div>
          )}

          {/* Retrieved Evidence Chunks count */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Retrieved Evidence Chunks: {qaResult.evidence?.length || 0}</span>
            <span>Grounded in PostgreSQL pgvector HNSW index</span>
          </div>
        </div>
      )}

      {/* Code Viewer Modal */}
      {activeCodeViewer && (
        <CodeViewer
          isOpen={true}
          onClose={() => setActiveCodeViewer(null)}
          filePath={activeCodeViewer.filePath}
          language={activeCodeViewer.language}
          content={activeCodeViewer.content}
          startLine={activeCodeViewer.startLine}
          endLine={activeCodeViewer.endLine}
          symbolName={activeCodeViewer.symbolName}
        />
      )}
    </div>
  );
}
