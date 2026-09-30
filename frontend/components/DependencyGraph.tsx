'use client';

import React, { useState } from 'react';
import { GraphNode, GraphEdge } from '../types';
import { FileCode, FunctionSquare, Server, Database, Route, ArrowRight } from 'lucide-react';

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function DependencyGraph({ nodes, edges }: DependencyGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 text-xs font-mono">
        No dependency relationships mapped for this change.
      </div>
    );
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FileCode className="w-3.5 h-3.5 text-sky-400" />;
      case 'route':
        return <Route className="w-3.5 h-3.5 text-emerald-400" />;
      case 'service':
        return <Server className="w-3.5 h-3.5 text-indigo-400" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <FunctionSquare className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  const getNodeBorder = (type: string) => {
    switch (type) {
      case 'file':
        return 'border-sky-500/40 bg-sky-950/20 text-sky-200';
      case 'route':
        return 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200';
      case 'service':
        return 'border-indigo-500/40 bg-indigo-950/20 text-indigo-200';
      case 'database':
        return 'border-amber-500/40 bg-amber-950/20 text-amber-200';
      default:
        return 'border-purple-500/40 bg-purple-950/20 text-purple-200';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-surface/90 p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h4 className="text-sm font-semibold text-white">Dependency & Impact Relationship Graph</h4>
          <p className="text-xs text-slate-400 mt-0.5">Visual representation of code symbols and cascade pathways</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> File</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Route</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Service</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Database</span>
        </div>
      </div>

      {/* Nodes Grid / Flow Representation */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          const connectedEdges = edges.filter((e) => e.source === node.id || e.target === node.id);

          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(isSelected ? null : node.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${getNodeBorder(
                node.type
              )} ${isSelected ? 'ring-2 ring-sky-400 shadow-lg scale-[1.02]' : 'hover:scale-[1.01]'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {getNodeIcon(node.type)}
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  {node.type}
                </span>
              </div>
              <div className="text-xs font-mono font-semibold truncate text-white" title={node.label}>
                {node.label}
              </div>
              {node.filePath && (
                <div className="text-[10px] font-mono text-slate-400 truncate mt-1" title={node.filePath}>
                  {node.filePath}
                </div>
              )}

              {/* Edge connections badges */}
              {connectedEdges.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex flex-wrap gap-1 text-[9px] font-mono text-slate-400">
                  {connectedEdges.slice(0, 2).map((e, idx) => (
                    <span key={idx} className="bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                      {e.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Edge Cascade List */}
      {edges.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-800">
          <h5 className="text-xs font-semibold text-slate-300 mb-2">Impact Cascade Pathways:</h5>
          <div className="flex flex-wrap gap-2">
            {edges.map((edge, i) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);

              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-xs font-mono bg-slate-900/90 border border-slate-700/70 px-2.5 py-1.5 rounded-lg text-slate-300"
                >
                  <span className="text-sky-300 font-semibold">{srcNode?.label || edge.source}</span>
                  <span className="text-slate-500 text-[10px] font-sans">[{edge.label}]</span>
                  <ArrowRight className="w-3 h-3 text-slate-500" />
                  <span className="text-emerald-300 font-semibold">{tgtNode?.label || edge.target}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
