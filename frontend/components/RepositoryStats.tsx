'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Repository } from '../types';
import { getLanguageBadgeColor } from '../lib/utils';
import { GitBranch, Layers, FileCode, Clock, Search, MessageSquareCode, Activity, FolderTree } from 'lucide-react';

interface RepositoryStatsProps {
  repository: Repository;
}

export function RepositoryStats({ repository }: RepositoryStatsProps) {
  const pathname = usePathname();
  const repoBase = `/dashboard/${repository.id}`;

  const navTabs = [
    { href: `${repoBase}`, label: 'Overview', icon: FolderTree, exact: true },
    { href: `${repoBase}/impact`, label: 'Change Impact Analysis', icon: Activity, badge: 'Key Feature' },
    { href: `${repoBase}/search`, label: 'Semantic Search', icon: Search },
    { href: `${repoBase}/ask`, label: 'Ask CodeAtlas', icon: MessageSquareCode },
  ];

  return (
    <div className="bg-surface/80 border-b border-border/60 backdrop-blur-md sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Repo Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 font-mono text-sm">{repository.owner} /</span>
              <h1 className="text-xl font-bold text-white font-mono tracking-tight">{repository.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {repository.status.toUpperCase()}
              </span>
            </div>
            <a
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-sky-400 font-mono mt-1 inline-block transition-colors"
            >
              {repository.url}
            </a>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-surface-elevated/70 px-3 py-1.5 rounded-lg border border-border/50">
              <GitBranch className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono text-slate-200">{repository.default_branch}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-elevated/70 px-3 py-1.5 rounded-lg border border-border/50">
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span><strong>{repository.file_count}</strong> files</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-elevated/70 px-3 py-1.5 rounded-lg border border-border/50">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span><strong>{repository.chunk_count}</strong> chunks</span>
            </div>
            {repository.indexed_at && (
              <div className="hidden lg:flex items-center gap-1.5 bg-surface-elevated/70 px-3 py-1.5 rounded-lg border border-border/50 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Indexed {new Date(repository.indexed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Languages Badges */}
        {repository.languages && repository.languages.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pb-3">
            <span className="text-[11px] text-slate-500 uppercase font-semibold mr-1">Languages:</span>
            {repository.languages.map((lang) => (
              <span
                key={lang}
                className={`text-[11px] font-mono px-2 py-0.5 rounded border ${getLanguageBadgeColor(lang)}`}
              >
                {lang}
              </span>
            ))}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pt-2 border-t border-border/40 scrollbar-none">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
