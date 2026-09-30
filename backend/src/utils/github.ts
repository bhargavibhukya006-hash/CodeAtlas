import { BadRequestError } from './errors';

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  normalizedUrl: string;
}

/**
 * Parses and validates a GitHub repository URL
 * Supports:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - http://github.com/owner/repo
 * - github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch...
 */
export function parseGitHubUrl(rawUrl: string): ParsedGitHubUrl {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new BadRequestError('GitHub repository URL is required');
  }

  const trimmed = rawUrl.trim();
  // Regex to match github url patterns
  const githubRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/;
  const match = trimmed.match(githubRegex);

  if (!match) {
    throw new BadRequestError('Invalid GitHub repository URL. Expected format: https://github.com/owner/repository');
  }

  const owner = match[1];
  let repo = match[2];

  // Strip trailing .git if present
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  // Validate owner and repo names (GitHub rules: no consecutive hyphens, valid chars)
  if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
    throw new Error('Repository owner or name contains invalid characters');
  }

  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') {
    throw new Error('Invalid repository owner or repository name');
  }

  const normalizedUrl = `https://github.com/${owner}/${repo}`;

  return {
    owner,
    repo,
    normalizedUrl,
  };
}
