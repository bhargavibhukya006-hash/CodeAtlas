import { config } from '../config';
import { AppError, ExternalApiError, NotFoundError } from '../utils/errors';
import { shouldIndexFile, detectLanguage } from '../utils/fileFilter';

export interface GitHubRepoMetadata {
  owner: string;
  name: string;
  description: string;
  defaultBranch: string;
  isPrivate: boolean;
  size: number;
}

export interface GitHubFileItem {
  path: string;
  size: number;
  url: string;
  language: string;
}

export class GitHubService {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'CodeAtlas-App/1.0',
      'Accept': 'application/vnd.github.v3+json',
    };

    if (config.github.token) {
      headers['Authorization'] = `token ${config.github.token}`;
    }

    return headers;
  }

  /**
   * Fetches repository metadata from GitHub API
   */
  async getRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    try {
      const response = await fetch(url, { headers: this.getHeaders() });

      if (response.status === 404) {
        throw new NotFoundError(`Repository ${owner}/${repo} not found on GitHub. Check the URL or ensure it is public.`);
      }

      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        if (rateLimitRemaining === '0') {
          throw new AppError(
            'GitHub API rate limit exceeded. Please configure GITHUB_TOKEN in .env for 5,000 requests/hour.',
            429
          );
        }
        throw new AppError('Access to GitHub repository forbidden. It might be private or require authentication.', 403);
      }

      if (!response.ok) {
        throw new ExternalApiError('GitHub', `Failed to fetch repository metadata (Status: ${response.status})`);
      }

      const data: any = await response.json();

      return {
        owner: data.owner?.login || owner,
        name: data.name || repo,
        description: data.description || '',
        defaultBranch: data.default_branch || 'main',
        isPrivate: data.private || false,
        size: data.size || 0,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new ExternalApiError('GitHub', err.message);
    }
  }

  /**
   * Fetches recursive repository tree and filters source files
   */
  async getRepositoryFiles(owner: string, repo: string, branch: string = 'main'): Promise<GitHubFileItem[]> {
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    try {
      const response = await fetch(treeUrl, { headers: this.getHeaders() });

      if (response.status === 404) {
        throw new NotFoundError(`Branch '${branch}' or tree not found for repository ${owner}/${repo}`);
      }

      if (!response.ok) {
        throw new ExternalApiError('GitHub', `Failed to fetch repository tree (Status: ${response.status})`);
      }

      const data: any = await response.json();

      if (!data.tree || !Array.isArray(data.tree) || data.tree.length === 0) {
        throw new AppError('Repository is empty or contains no files', 400);
      }

      const candidateFiles: GitHubFileItem[] = [];

      for (const item of data.tree) {
        // 'blob' indicates a file
        if (item.type === 'blob' && shouldIndexFile(item.path, item.size)) {
          candidateFiles.push({
            path: item.path,
            size: item.size || 0,
            url: item.url,
            language: detectLanguage(item.path),
          });

          // Limit total files indexed to prevent runaway indexing on massive repos
          if (candidateFiles.length >= config.retrieval.maxFiles) {
            console.log(`[GitHubService] Reached MAX_FILES limit (${config.retrieval.maxFiles})`);
            break;
          }
        }
      }

      return candidateFiles;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new ExternalApiError('GitHub', err.message);
    }
  }

  /**
   * Downloads raw text content for a single source file
   */
  async getFileContent(owner: string, repo: string, branch: string, filePath: string): Promise<string> {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    try {
      const response = await fetch(rawUrl, {
        headers: config.github.token ? { Authorization: `token ${config.github.token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file content for ${filePath} (${response.status})`);
      }

      return await response.text();
    } catch (err: any) {
      throw new Error(`Could not fetch ${filePath}: ${err.message}`);
    }
  }
}

export const githubService = new GitHubService();
