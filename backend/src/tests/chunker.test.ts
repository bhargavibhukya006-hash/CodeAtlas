import { chunkCode, detectSymbols } from '../utils/chunker';

describe('Code Chunker and Symbol Extractor', () => {
  const tsSample = `
import { Request, Response } from 'express';

export class AuthService {
  async login(email: string, pass: string) {
    return { token: 'jwt' };
  }
}

export function verifyToken(token: string) {
  return true;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});
`;

  it('detects classes, functions, and routes in TypeScript', () => {
    const lines = tsSample.split('\n');
    const symbols = detectSymbols(lines, 'TypeScript');

    expect(symbols.length).toBeGreaterThanOrEqual(3);

    const classSym = symbols.find((s) => s.name === 'AuthService');
    expect(classSym).toBeDefined();
    expect(classSym?.type).toBe('class');

    const funcSym = symbols.find((s) => s.name === 'verifyToken');
    expect(funcSym).toBeDefined();
    expect(funcSym?.type).toBe('function');

    const routeSym = symbols.find((s) => s.name === 'GET /api/health');
    expect(routeSym).toBeDefined();
    expect(routeSym?.type).toBe('route');
  });

  it('creates meaningful chunks with line ranges and symbol metadata', () => {
    const chunks = chunkCode('src/auth.ts', tsSample, 'TypeScript', 10, 2);

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.filePath).toBe('src/auth.ts');
      expect(chunk.language).toBe('TypeScript');
      expect(chunk.startLine).toBeGreaterThanOrEqual(1);
      expect(chunk.endLine).toBeGreaterThanOrEqual(chunk.startLine);
      expect(chunk.content.length).toBeGreaterThan(0);
    }
  });

  it('handles empty or whitespace-only code gracefully', () => {
    expect(chunkCode('empty.ts', '', 'TypeScript')).toEqual([]);
    expect(chunkCode('spaces.ts', '   \n  \n  ', 'TypeScript')).toEqual([]);
  });

  it('chunks Python def functions and classes', () => {
    const pySample = `
class DatabaseClient:
    def __init__(self, host):
        self.host = host

def fetch_records():
    return [1, 2, 3]
`;
    const lines = pySample.split('\n');
    const symbols = detectSymbols(lines, 'Python');

    expect(symbols.some((s) => s.name === 'DatabaseClient' && s.type === 'class')).toBe(true);
    expect(symbols.some((s) => s.name === 'fetch_records' && s.type === 'function')).toBe(true);
  });
});
