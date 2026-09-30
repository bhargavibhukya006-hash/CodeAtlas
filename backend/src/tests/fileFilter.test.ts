import { shouldIndexFile, detectLanguage } from '../utils/fileFilter';

describe('File Filter and Language Detector', () => {
  describe('detectLanguage', () => {
    it('detects JavaScript and TypeScript variants', () => {
      expect(detectLanguage('src/index.ts')).toBe('TypeScript');
      expect(detectLanguage('src/components/App.tsx')).toBe('TypeScript');
      expect(detectLanguage('lib/server.js')).toBe('JavaScript');
      expect(detectLanguage('lib/client.jsx')).toBe('JavaScript');
    });

    it('detects Python, Java, Go, C++, Rust, SQL', () => {
      expect(detectLanguage('app/main.py')).toBe('Python');
      expect(detectLanguage('src/main/Application.java')).toBe('Java');
      expect(detectLanguage('cmd/server/main.go')).toBe('Go');
      expect(detectLanguage('engine/core.cpp')).toBe('C++');
      expect(detectLanguage('src/main.rs')).toBe('Rust');
      expect(detectLanguage('migrations/001_init.sql')).toBe('SQL');
      expect(detectLanguage('Dockerfile')).toBe('Dockerfile');
    });

    it('returns Unknown for unrecognized extensions', () => {
      expect(detectLanguage('file.xyz123')).toBe('Unknown');
    });
  });

  describe('shouldIndexFile', () => {
    it('ignores dependencies and build directories', () => {
      expect(shouldIndexFile('node_modules/express/index.js')).toBe(false);
      expect(shouldIndexFile('.git/config')).toBe(false);
      expect(shouldIndexFile('dist/bundle.js')).toBe(false);
      expect(shouldIndexFile('build/output.js')).toBe(false);
      expect(shouldIndexFile('.next/static/chunks/app.js')).toBe(false);
      expect(shouldIndexFile('coverage/lcov-report/index.html')).toBe(false);
    });

    it('ignores lock files, minified bundles, and images', () => {
      expect(shouldIndexFile('package-lock.json')).toBe(false);
      expect(shouldIndexFile('yarn.lock')).toBe(false);
      expect(shouldIndexFile('public/logo.png')).toBe(false);
      expect(shouldIndexFile('assets/icon.svg')).toBe(false);
      expect(shouldIndexFile('vendor/jquery.min.js')).toBe(false);
      expect(shouldIndexFile('bundle.js.map')).toBe(false);
    });

    it('allows legitimate source code files', () => {
      expect(shouldIndexFile('src/auth/service.ts')).toBe(true);
      expect(shouldIndexFile('backend/api/users.py')).toBe(true);
      expect(shouldIndexFile('pkg/handler/auth.go')).toBe(true);
    });

    it('respects file size limits', () => {
      // 50KB should pass
      expect(shouldIndexFile('src/big.ts', 50000)).toBe(true);
      // 300KB exceeds default 200KB limit
      expect(shouldIndexFile('src/big.ts', 300000)).toBe(false);
    });
  });
});
