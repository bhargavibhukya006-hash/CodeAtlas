'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AskPanel } from '../../../../components/AskPanel';
import { MessageSquareCode, ShieldCheck } from 'lucide-react';

export default function AskCodeAtlasPage() {
  const params = useParams();
  const repositoryId = params.repositoryId as string;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageSquareCode className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Ask CodeAtlas</h2>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
            Grounded QA
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Ask questions about the repository architecture, algorithms, and request flows. Answers are grounded in the indexed code and cited with exact file and line references.
        </p>
      </div>

      <AskPanel repositoryId={repositoryId} />
    </div>
  );
}
