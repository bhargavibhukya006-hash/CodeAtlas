'use client';

import React from 'react';
import { FileCode, ExternalLink } from 'lucide-react';
import { SourceReference as SourceReferenceType } from '../types';

interface SourceReferenceProps {
  reference: SourceReferenceType;
  onClick?: (ref: SourceReferenceType) => void;
}

export function SourceReference({ reference, onClick }: SourceReferenceProps) {
  const label = `${reference.filePath.split('/').pop() || reference.filePath}:${reference.startLine}${
    reference.endLine && reference.endLine !== reference.startLine ? `-${reference.endLine}` : ''
  }`;

  return (
    <button
      type="button"
      onClick={() => onClick && onClick(reference)}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 my-0.5 rounded-md font-mono text-[11px] font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-all hover:scale-[1.02] cursor-pointer text-left"
      title={`Click to view ${reference.filePath} (lines ${reference.startLine}-${reference.endLine})`}
    >
      <FileCode className="w-3 h-3 text-sky-400 shrink-0" />
      <span>{label}</span>
      <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
    </button>
  );
}
