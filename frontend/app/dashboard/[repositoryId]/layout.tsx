'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Repository } from '../../../types';
import { RepositoryStats } from '../../../components/RepositoryStats';
import { IndexingProgress } from '../../../components/IndexingProgress';
import { LoadingState } from '../../../components/LoadingState';
import { ErrorState } from '../../../components/ErrorState';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const repositoryId = params.repositoryId as string;

  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRepository(repositoryId);
      setRepository(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load repository');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repositoryId) {
      fetchRepo();
    }
  }, [repositoryId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingState title="Loading Repository..." message="Connecting to CodeAtlas database" />
      </div>
    );
  }

  if (error || !repository) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <ErrorState
          title="Repository Not Found"
          error={error || 'Could not locate repository record in database'}
          onRetry={fetchRepo}
        />
      </div>
    );
  }

  // If indexing is still underway
  if (repository.status !== 'ready') {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-16">
        <IndexingProgress
          repositoryId={repositoryId}
          onComplete={() => {
            fetchRepo();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <RepositoryStats repository={repository} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {children}
      </div>
    </div>
  );
}
