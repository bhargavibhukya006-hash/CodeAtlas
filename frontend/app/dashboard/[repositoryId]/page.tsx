'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { FileRecord } from '../../../types';
import { FileList } from '../../../components/FileList';
import { CodeViewer } from '../../../components/CodeViewer';
import { Activity, Search, MessageSquareCode, ArrowRight, ShieldCheck, Database, Layers } from 'lucide-react';

export default function DashboardOverviewPage() {
  const params = useParams();
  const repositoryId = params.repositoryId as string;

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);

  useEffect(() => {
    if (repositoryId) {
      api.getFiles(repositoryId).then(setFiles).catch(console.warn);
    }
  }, [repositoryId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Change Impact Analysis (Featured) */}
        <Link
          href={`/dashboard/${repositoryId}/impact`}
          className="group rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-950/30 via-surface to-surface p-6 shadow-xl hover:border-sky-400 hover:shadow-sky-500/10 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Differentiator
              </span>
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
              Change Impact Analysis
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Plan changes like &quot;Add Google OAuth&quot; or &quot;Add rate limiting&quot;. Predict affected files, cascading functions, and step-by-step implementation plans.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:text-sky-300">
            <span>Analyze a Change</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Semantic Code Search */}
        <Link
          href={`/dashboard/${repositoryId}/search`}
          className="group rounded-2xl border border-border/70 bg-surface/80 p-6 shadow-xl hover:border-slate-600 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              Semantic Code Search
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Find code by conceptual meaning rather than exact string matches. Query &quot;where are tokens created&quot; or &quot;database pool setup&quot;.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
            <span>Search Vector Index</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Ask CodeAtlas */}
        <Link
          href={`/dashboard/${repositoryId}/ask`}
          className="group rounded-2xl border border-border/70 bg-surface/80 p-6 shadow-xl hover:border-slate-600 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <MessageSquareCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
              Ask CodeAtlas
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Grounded AI assistant specifically for this repository. Every single answer is cited with exact line references like [auth.ts:15-30].
            </p>
          </div>

          <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
            <span>Ask Questions</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Repository Files Tree / List */}
      <FileList
        files={files}
        onSelectFile={(f) => setSelectedFile(f)}
      />

      {/* Code Viewer Modal */}
      {selectedFile && (
        <CodeViewer
          isOpen={true}
          onClose={() => setSelectedFile(null)}
          filePath={selectedFile.path}
          language={selectedFile.language}
          content={`// File: ${selectedFile.path}\n// Language: ${selectedFile.language}\n// Size: ${selectedFile.size} bytes\n\n// Indexed and embedded into PostgreSQL vector space.`}
          startLine={1}
        />
      )}
    </div>
  );
}
