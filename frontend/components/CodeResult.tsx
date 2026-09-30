'use client';

import React, { useState, useEffect } from 'react';
import { SearchResult } from '../types';
import { getLanguageBadgeColor } from '../lib/utils';
import { FileCode, ChevronDown, ChevronUp, Maximize2, Copy, Check } from 'lucide-react';
import Prism from 'prismjs';

interface CodeResultProps {
  result: SearchResult;
  onOpenViewer: (result: SearchResult) => void;
}

export function CodeResult({ result, onOpenViewer }: CodeResultProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Prism.highlightAll();
  }, [result.content, expanded]);

  const similarityPercent = Math.round((result.similarity || 0) * 100);

  const getSimilarityBadge = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-700/70 bg-surface/90 overflow-hidden shadow-lg hover:border-slate-600 transition-all">
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-4 py-3 bg-surface-elevated/60 cursor-pointer select-none border-b border-border/50 hover:bg-surface-elevated/90 transition-colors"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="font-mono text-xs font-semibold text-white truncate">{result.file_path}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${getLanguageBadgeColor(result.language)}`}>
            {result.language}
          </span>
          {result.symbol_name && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded shrink-0">
              {result.symbol_name} ({result.symbol_type})
            </span>
          )}
          <span className="text-[11px] text-slate-500 font-mono shrink-0 hidden sm:inline">
            L{result.start_line}-{result.end_line}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${getSimilarityBadge(similarityPercent)}`}>
            {similarityPercent}% Match
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Copy snippet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenViewer(result);
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              title="Expand full code viewer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <div className="p-1 text-slate-400">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>
      </div>

      {/* Snippet Code block */}
      {expanded && (
        <div className="p-4 bg-[#090d16] font-mono text-xs overflow-x-auto">
          <pre className="!bg-transparent !p-0 !m-0 leading-relaxed">
            <code>{result.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
