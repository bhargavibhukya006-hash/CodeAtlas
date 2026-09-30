import { parseGitHubUrl } from '../utils/github';

describe('GitHub URL Parser', () => {
  it('should parse standard GitHub URLs', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react');
    expect(result.owner).toBe('facebook');
    expect(result.repo).toBe('react');
    expect(result.normalizedUrl).toBe('https://github.com/facebook/react');
  });

  it('should strip trailing .git suffix', () => {
    const result = parseGitHubUrl('https://github.com/expressjs/express.git');
    expect(result.owner).toBe('expressjs');
    expect(result.repo).toBe('express');
    expect(result.normalizedUrl).toBe('https://github.com/expressjs/express');
  });

  it('should handle URL with branch or subpaths', () => {
    const result = parseGitHubUrl('https://github.com/vercel/next.js/tree/canary/packages');
    expect(result.owner).toBe('vercel');
    expect(result.repo).toBe('next.js');
  });

  it('should handle URL without protocol', () => {
    const result = parseGitHubUrl('github.com/torvalds/linux');
    expect(result.owner).toBe('torvalds');
    expect(result.repo).toBe('linux');
    expect(result.normalizedUrl).toBe('https://github.com/torvalds/linux');
  });

  it('should throw an error for non-GitHub URLs', () => {
    expect(() => parseGitHubUrl('https://gitlab.com/owner/repo')).toThrow('Invalid GitHub repository URL');
  });

  it('should throw an error for empty or invalid input', () => {
    expect(() => parseGitHubUrl('')).toThrow('GitHub repository URL is required');
    expect(() => parseGitHubUrl('invalid-string')).toThrow('Invalid GitHub repository URL');
  });
});
