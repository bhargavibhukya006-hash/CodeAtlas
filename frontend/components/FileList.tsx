'use client';

import React, { useState } from 'react';
import { FileRecord } from '../types';
import { formatBytes, getLanguageBadgeColor } from '../lib/utils';
import { FileCode, Search, FolderTree } from 'lucide-react';

interface FileListProps {
  files: FileRecord[];
  onSelectFile?: (file: FileRecord) => void;
}

export function FileList({ files, onSelectFile }: FileListProps) {
  const [filter, setFilter] = useState('');

  const filtered = files.filter((f) =>
    f.path.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-slate-700/80 bg-surface/90 p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-border/60 gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Indexed Files ({files.length})</h3>
        </div>

        <div className="flex items-center gap-2 bg-surface-elevated px-3 py-1.5 rounded-lg border border-border/60 text-xs w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter files..."
            className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-full font-mono text-xs"
          />
        </div>
      </div>

      <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-slate-800">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No files match &quot;{filter}&quot;
          </div>
        ) : (
          filtered.map((file) => (
            <div
              key={file.id}
              onClick={() => onSelectFile && onSelectFile(file)}
              className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileCode className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-mono text-xs text-slate-200 truncate">{file.path}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${getLanguageBadgeColor(file.language)}`}>
                  {file.language}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {formatBytes(file.size)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
