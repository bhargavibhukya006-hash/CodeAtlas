'use client';

import React, { useEffect } from 'react';
import { X, Copy, Check, FileCode, ExternalLink } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-sql';
import { getLanguageBadgeColor } from '../lib/utils';

interface CodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  language: string;
  content: string;
  startLine?: number;
  endLine?: number;
  symbolName?: string;
}

export function CodeViewer({
  isOpen,
  onClose,
  filePath,
  language,
  content,
  startLine = 1,
  endLine,
  symbolName,
}: CodeViewerProps) {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      Prism.highlightAll();
    }
  }, [isOpen, content]);

  if (!isOpen) return null;

  const lines = content.split('\n');
  const targetEndLine = endLine || startLine + lines.length - 1;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-surface shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70 bg-surface-elevated/70">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="font-mono text-sm font-semibold text-white truncate">{filePath}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${getLanguageBadgeColor(language)}`}>
              {language}
            </span>
            {symbolName && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 shrink-0">
                {symbolName}
              </span>
            )}
            <span className="text-xs text-slate-500 font-mono shrink-0">
              (Lines {startLine} - {targetEndLine})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface hover:bg-slate-700/80 text-xs font-medium text-slate-300 border border-border/80 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content with Line Numbers */}
        <div className="flex-1 overflow-auto p-4 bg-[#090d16] font-mono text-xs leading-relaxed">
          <div className="flex">
            {/* Line numbers column */}
            <div className="select-none text-slate-600 text-right pr-4 border-r border-slate-800 font-mono shrink-0">
              {lines.map((_, i) => (
                <div key={i} className="leading-6">
                  {startLine + i}
                </div>
              ))}
            </div>

            {/* Code lines */}
            <div className="pl-4 overflow-x-auto w-full">
              <pre className="!bg-transparent !p-0 !m-0">
                <code>
                  {lines.map((line, i) => (
                    <div key={i} className="leading-6 whitespace-pre hover:bg-slate-800/40 px-1 rounded">
                      {line || ' '}
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
