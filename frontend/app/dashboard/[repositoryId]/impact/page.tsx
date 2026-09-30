'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { ImpactReport as ImpactReportType } from '../../../../types';
import { ImpactReport } from '../../../../components/ImpactReport';
import { LoadingState } from '../../../../components/LoadingState';
import { ErrorState } from '../../../../components/ErrorState';
import { Activity, Send, Sparkles, Lightbulb } from 'lucide-react';

const SUGGESTED_CHANGES = [
  'Add Google OAuth authentication login',
  'Add rate limiting to all public API routes',
  'Implement email verification on user signup',
  'Add role-based access control (RBAC) for admins',
  'Migrate database queries to use connection pooling with transactions',
];

export default function ImpactAnalysisPage() {
  const params = useParams();
  const repositoryId = params.repositoryId as string;

  const [changeDescription, setChangeDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImpactReportType | null>(null);

  const handleAnalyze = async (desc: string) => {
    if (!desc.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.analyzeImpact(repositoryId, desc.trim());
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate change impact report');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAnalyze(changeDescription);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header section */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Activity className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Change Impact Analysis</h2>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold">
            Key Feature
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Enter a proposed feature or refactoring plan. CodeAtlas semantically searches the codebase, expands dependency relationships, and predicts every file, component, and risk area likely to be affected.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="p-2 rounded-2xl bg-surface/90 border border-slate-700/80 shadow-2xl focus-within:border-sky-500/80 focus-within:ring-1 focus-within:ring-sky-500/40 transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={changeDescription}
            onChange={(e) => setChangeDescription(e.target.value)}
            placeholder="What feature or change are you planning? e.g. 'Add Google OAuth login'..."
            className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={!changeDescription.trim() || loading}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Impact</span>
          </button>
        </div>
      </form>

      {/* Quick Suggestions */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1 text-slate-500 font-medium">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Ideas:</span>
        </div>
        {SUGGESTED_CHANGES.map((sug) => (
          <button
            key={sug}
            type="button"
            onClick={() => {
              setChangeDescription(sug);
              handleAnalyze(sug);
            }}
            className="text-slate-400 hover:text-sky-300 bg-surface-elevated/70 hover:bg-surface-elevated px-2.5 py-1 rounded-lg border border-border/50 font-mono text-[11px] transition-colors"
          >
            {sug}
          </button>
        ))}
      </div>

      {loading && (
        <LoadingState
          title="Executing Change Impact Analysis..."
          message="Querying vector space, traversing dependency graph, and compiling grounded impact model..."
        />
      )}

      {error && <ErrorState error={error} onRetry={() => handleAnalyze(changeDescription)} />}

      {/* Render Generated Report */}
      {report && !loading && <ImpactReport report={report} />}
    </div>
  );
}
