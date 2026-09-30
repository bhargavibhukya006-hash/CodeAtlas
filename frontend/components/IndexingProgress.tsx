'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle, Sparkles, Layers, FileCode, GitBranch, Database } from 'lucide-react';
import { api } from '../lib/api';

interface IndexingProgressProps {
  repositoryId: string;
  onComplete?: () => void;
  onReset?: () => void;
}

const STAGES = [
  { key: 'connecting', label: 'Connecting to GitHub', icon: GitBranch },
  { key: 'fetching', label: 'Fetching repository tree & files', icon: FileCode },
  { key: 'parsing', label: 'Parsing symbols & code chunks', icon: Layers },
  { key: 'embeddings', label: 'Generating semantic embeddings', icon: Sparkles },
  { key: 'indexing', label: 'Building pgvector index & code graph', icon: Database },
  { key: 'ready', label: 'Ready', icon: CheckCircle2 },
];

export function IndexingProgress({ repositoryId, onComplete, onReset }: IndexingProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string>('pending');
  const [statusMessage, setStatusMessage] = useState<string>('Connecting...');
  const [fileCount, setFileCount] = useState<number>(0);
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const poll = async () => {
      try {
        const data = await api.getStatus(repositoryId);
        setStatus(data.status);
        setStatusMessage(data.statusMessage);
        setFileCount(data.fileCount);
        setChunkCount(data.chunkCount);

        if (data.status === 'ready') {
          clearInterval(interval);
          if (onComplete) {
            onComplete();
          } else {
            router.push(`/dashboard/${repositoryId}`);
          }
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setError(data.statusMessage || 'Indexing encountered an unexpected failure');
        }
      } catch (err: any) {
        console.warn('Status poll error:', err.message);
      }
    };

    poll();
    interval = setInterval(poll, 1500);

    return () => clearInterval(interval);
  }, [repositoryId, onComplete, router]);

  const getActiveStageIndex = () => {
    if (status === 'ready') return 5;
    if (status === 'failed') return 0;
    const msg = statusMessage.toLowerCase();
    if (msg.includes('building') || msg.includes('pgvector') || msg.includes('graph')) return 4;
    if (msg.includes('embedding')) return 3;
    if (msg.includes('parsing') || msg.includes('chunk')) return 2;
    if (msg.includes('fetching') || msg.includes('downloading')) return 1;
    return 0;
  };

  const activeIndex = getActiveStageIndex();
  const progressPercent = Math.min(100, Math.max(10, ((activeIndex + 1) / STAGES.length) * 100));

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-slate-700/80 bg-surface/95 p-6 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            {status === 'failed' ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : status === 'ready' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Repository Indexing in Progress</h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{statusMessage}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono font-bold text-sky-400">{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step List */}
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = idx < activeIndex || status === 'ready';
          const isCurrent = idx === activeIndex && status !== 'ready' && status !== 'failed';

          return (
            <div
              key={stage.key}
              className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-sky-500/10 border border-sky-500/30 text-sky-200'
                  : isDone
                  ? 'text-slate-300'
                  : 'text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isDone ? 'text-emerald-400' : isCurrent ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{stage.label}</span>
              </div>

              {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {isCurrent && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />}
            </div>
          );
        })}
      </div>

      {/* Stats Counter if available */}
      {(fileCount > 0 || chunkCount > 0) && (
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Processed Files: <strong className="text-white">{fileCount}</strong></span>
          <span>Indexed Chunks: <strong className="text-white">{chunkCount}</strong></span>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          <div className="font-semibold text-rose-200 mb-1">Indexing Failed</div>
          <p className="leading-relaxed text-rose-300/90">{error}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onReset) onReset();
                else window.location.href = '/';
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-medium text-rose-100 transition-colors"
            >
              Try Another Repository URL
            </button>
            <button
              type="button"
              onClick={async () => {
                const demo = await api.seedDemo();
                router.push(`/dashboard/${demo.repositoryId}`);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-xs font-medium text-sky-200 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Explore Live Demo Repository</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
