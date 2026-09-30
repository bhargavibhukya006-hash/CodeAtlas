import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  title?: string;
  message?: string;
}

export function LoadingState({
  title = 'Processing...',
  message = 'Retrieving context from semantic vector space',
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin" />
        <Loader2 className="w-6 h-6 text-sky-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  error: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'An error occurred',
  error,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-6 text-center my-6">
      <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-3 text-rose-400">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-rose-200">{title}</h3>
      <p className="text-xs text-rose-400/90 mt-1 max-w-md mx-auto">{error}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-medium text-rose-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </button>
      )}
    </div>
  );
}
