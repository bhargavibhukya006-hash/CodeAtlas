import { config } from '../config';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'coverage',
  '.turbo',
  'vendor',
  '.vscode',
  '.idea',
  '__pycache__',
  '.pytest_cache',
  'target', // Rust/Java
  'bin',
  'obj',
  'venv',
  '.venv',
  'env',
  '.env',
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Cargo.lock',
  'poetry.lock',
  'composer.lock',
  'Gemfile.lock',
  '.DS_Store',
  'Thumbs.db',
  '.gitattributes',
  '.gitignore',
  '.dockerignore',
  '.eslintrc',
  '.prettierrc',
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
]);

const IGNORED_EXTENSIONS = new Set([
  // Binaries & Executables
  '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm', '.class', '.pyc', '.o', '.obj',
  // Media & Images
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp', '.tiff', '.mp3', '.mp4', '.wav', '.mov',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Archives
  '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z',
  // Source maps & minified files
  '.map', '.min.js', '.min.css',
  // Documents & DBs
  '.pdf', '.doc', '.docx', '.sqlite', '.db',
]);

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.py': 'Python',
  '.java': 'Java',
  '.c': 'C',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.scala': 'Scala',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'SASS',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.md': 'Markdown',
  '.mdx': 'Markdown',
  'dockerfile': 'Dockerfile',
};

/**
 * Checks whether a file path should be indexed
 */
export function shouldIndexFile(filePath: string, fileSize?: number): boolean {
  if (!filePath) return false;

  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1];

  // Check ignored directories
  for (const part of parts.slice(0, -1)) {
    if (IGNORED_DIRECTORIES.has(part)) {
      return false;
    }
  }

  // Check specific ignored files
  if (IGNORED_FILES.has(fileName)) {
    return false;
  }

  // Check minified indicator in name
  if (fileName.includes('.min.')) {
    return false;
  }

  // Check extension
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = fileName.slice(dotIndex).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) {
      return false;
    }
  }

  // Check file size
  if (fileSize !== undefined && fileSize > config.retrieval.maxFileSize) {
    return false;
  }

  // Must have a recognized language extension or recognized file name
  const lang = detectLanguage(filePath);
  return lang !== 'Unknown';
}

/**
 * Detect programming language from file path or file name
 */
export function detectLanguage(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const parts = normalized.split('/');
  const fileName = parts[parts.length - 1];

  if (fileName === 'dockerfile' || fileName.startsWith('dockerfile.')) {
    return 'Dockerfile';
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    const ext = fileName.slice(dotIndex);
    if (EXTENSION_LANGUAGE_MAP[ext]) {
      return EXTENSION_LANGUAGE_MAP[ext];
    }
  }

  return 'Unknown';
}
