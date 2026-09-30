'use client';

import React, { useState } from 'react';
import { ImpactReport as ImpactReportType, SourceReference as SourceReferenceType, CodeChunk } from '../types';
import { DependencyGraph } from './DependencyGraph';
import { SourceReference } from './SourceReference';
import { CodeViewer } from './CodeViewer';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  FileCode,
  Layers,
  ListOrdered,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface ImpactReportProps {
  report: ImpactReportType;
}

export function ImpactReport({ report }: ImpactReportProps) {
  const [selectedReference, setSelectedReference] = useState<{
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    language: string;
    symbolName?: string;
  } | null>(null);

  const [showEvidence, setShowEvidence] = useState(false);

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    }
  };

  const getSeverityBadge = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  const handleRefClick = (ref: SourceReferenceType) => {
    // Find matching chunk from evidence
    const matchingChunk = report.evidence?.find(
      (c) => c.file_path === ref.filePath && c.start_line <= ref.startLine && c.end_line >= ref.endLine
    ) || report.evidence?.find((c) => c.file_path === ref.filePath);

    setSelectedReference({
      filePath: ref.filePath,
      startLine: ref.startLine,
      endLine: ref.endLine,
      content: matchingChunk ? matchingChunk.content : `// Source reference: ${ref.filePath}:${ref.startLine}-${ref.endLine}`,
      language: matchingChunk ? matchingChunk.language : 'TypeScript',
      symbolName: ref.symbolName || matchingChunk?.symbol_name,
    });
  };

  const handleChunkClick = (chunk: CodeChunk) => {
    setSelectedReference({
      filePath: chunk.file_path,
      startLine: chunk.start_line,
      endLine: chunk.end_line,
      content: chunk.content,
      language: chunk.language,
      symbolName: chunk.symbol_name,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Change Summary */}
      <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/20 via-surface to-surface p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm uppercase tracking-wider font-bold text-sky-400 font-mono">
              Change Summary & Architectural Assessment
            </h3>
            <p className="mt-2 text-slate-200 text-sm leading-relaxed">{report.summary}</p>
          </div>
        </div>
      </div>

      {/* 2. Likely Affected Files */}
      <div className="rounded-2xl border border-slate-700/80 bg-surface/90 p-6 shadow-xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
          <FileCode className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">Likely Affected Files ({report.affectedFiles.length})</h3>
        </div>

        <div className="mt-4 divide-y divide-slate-800">
          {report.affectedFiles.map((file, idx) => (
            <div key={idx} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleRefClick({ filePath: file.path, startLine: 1, endLine: 40, rawCitation: `[${file.path}:1-40]` })}
                    className="font-mono text-sm font-semibold text-sky-300 hover:text-white hover:underline truncate text-left cursor-pointer flex items-center gap-1.5"
                    title={`Click to view ${file.path}`}
                  >
                    <span>{file.path}</span>
                  </button>
                  <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${getConfidenceBadge(file.confidence)}`}>
                    {file.confidence} impact
                  </span>
                </div>

                {/* Symbols */}
                {file.relevantSymbols && file.relevantSymbols.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {file.relevantSymbols.map((sym, sIdx) => (
                      <span key={sIdx} className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                        {sym}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed">{file.reason}</p>

              {/* Source References */}
              {file.references && file.references.length > 0 && (
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Citations:</span>
                  {file.references.map((ref, rIdx) => (
                    <SourceReference key={rIdx} reference={ref} onClick={handleRefClick} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Affected Components */}
      {report.components && report.components.length > 0 && (
        <div className="rounded-2xl border border-slate-700/80 bg-surface/90 p-6 shadow-xl">
          <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Affected Components & Functions</h3>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.components.map((comp, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-border/60 bg-surface-elevated/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-white truncate">{comp.name}</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                    {comp.type}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-1">{comp.filePath}</div>
                <p className="text-xs text-slate-300 mt-2">{comp.impactReason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Dependency & Relationship Graph */}
      <DependencyGraph nodes={report.dependencyGraph.nodes} edges={report.dependencyGraph.edges} />

      {/* 5. Implementation Plan */}
      <div className="rounded-2xl border border-slate-700/80 bg-surface/90 p-6 shadow-xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
          <ListOrdered className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Step-by-Step Implementation Plan</h3>
        </div>

        <div className="mt-5 space-y-4">
          {report.implementationPlan.map((step) => (
            <div key={step.step} className="flex items-start gap-4 p-4 rounded-xl border border-border/60 bg-surface-elevated/40">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-mono font-bold text-xs text-amber-400 shrink-0">
                {step.step}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{step.description}</p>

                {/* Affected files for this step */}
                {step.affectedFiles && step.affectedFiles.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">Files:</span>
                    {step.affectedFiles.map((f, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => handleRefClick({ filePath: f, startLine: 1, endLine: 40, rawCitation: `[${f}:1-40]` })}
                        className="text-[10px] font-mono text-sky-400 hover:text-white bg-sky-950/40 hover:bg-sky-900/60 px-2 py-0.5 rounded border border-sky-800/60 transition-colors cursor-pointer"
                        title={`Click to view ${f}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}

                {/* Citations */}
                {step.references && step.references.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">References:</span>
                    {step.references.map((r, rIdx) => (
                      <SourceReference key={rIdx} reference={r} onClick={handleRefClick} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Risk Areas */}
      <div className="rounded-2xl border border-slate-700/80 bg-surface/90 p-6 shadow-xl">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border/60">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-base font-bold text-white">Risk Areas & Regression Safeguards</h3>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.risks.map((risk, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-rose-200">{risk.area}</span>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${getSeverityBadge(risk.severity)}`}>
                  {risk.severity} risk
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">{risk.description}</p>
              <div className="pt-2.5 border-t border-rose-500/20 text-xs">
                <strong className="text-emerald-400 font-mono text-[11px] block mb-0.5">Mitigation Plan:</strong>
                <span className="text-slate-300">{risk.mitigation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Grounded Evidence Chunks */}
      {report.evidence && report.evidence.length > 0 && (
        <div className="rounded-2xl border border-slate-700/80 bg-surface/90 p-6 shadow-xl">
          <button
            type="button"
            onClick={() => setShowEvidence(!showEvidence)}
            className="w-full flex items-center justify-between text-left select-none"
          >
            <div className="flex items-center gap-2.5">
              <Code2 className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-base font-bold text-white">Grounded Repository Evidence ({report.evidence.length} chunks)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Exact code chunks retrieved via pgvector cosine similarity</p>
              </div>
            </div>

            <div className="p-1 rounded-lg text-slate-400 hover:text-white">
              {showEvidence ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>

          {showEvidence && (
            <div className="mt-5 space-y-3 pt-4 border-t border-slate-800">
              {report.evidence.map((chunk, cIdx) => (
                <div
                  key={cIdx}
                  onClick={() => handleChunkClick(chunk)}
                  className="p-3 rounded-xl border border-slate-800 bg-[#090d16] hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-400 mb-2">
                    <span className="text-sky-300 font-semibold">{chunk.file_path}</span>
                    <span>Lines {chunk.start_line}-{chunk.end_line}</span>
                  </div>
                  <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-32">
                    <code>{chunk.content}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Code Viewer Modal */}
      {selectedReference && (
        <CodeViewer
          isOpen={true}
          onClose={() => setSelectedReference(null)}
          filePath={selectedReference.filePath}
          language={selectedReference.language}
          content={selectedReference.content}
          startLine={selectedReference.startLine}
          endLine={selectedReference.endLine}
          symbolName={selectedReference.symbolName}
        />
      )}
    </div>
  );
}
