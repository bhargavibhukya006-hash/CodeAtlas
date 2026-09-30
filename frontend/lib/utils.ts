import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getLanguageBadgeColor(language: string): string {
  const map: Record<string, string> = {
    TypeScript: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    JavaScript: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    Python: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    Java: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    Go: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    'C++': 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    Rust: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    SQL: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  };
  return map[language] || 'bg-slate-800 text-slate-300 border-slate-700';
}
