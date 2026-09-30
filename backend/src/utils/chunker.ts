import { SymbolType } from '../types';

export interface RawChunk {
  filePath: string;
  language: string;
  symbolName?: string;
  symbolType?: SymbolType;
  startLine: number;
  endLine: number;
  content: string;
}

interface SymbolDefinition {
  name: string;
  type: SymbolType;
  startLine: number;
  endLine?: number;
}

/**
 * Extracts symbols and creates intelligent code chunks for various languages.
 */
export function chunkCode(
  filePath: string,
  content: string,
  language: string,
  maxLinesPerChunk: number = 60,
  overlapLines: number = 10
): RawChunk[] {
  if (!content || !content.trim()) {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const totalLines = lines.length;

  if (totalLines === 0) {
    return [];
  }

  // If the file is small (under maxLinesPerChunk), return single chunk
  if (totalLines <= maxLinesPerChunk) {
    const symbol = findPrimarySymbol(lines, language);
    return [
      {
        filePath,
        language,
        symbolName: symbol?.name,
        symbolType: symbol?.type,
        startLine: 1,
        endLine: totalLines,
        content: content.trim(),
      },
    ];
  }

  // Detect symbols across the file
  const symbols = detectSymbols(lines, language);
  const chunks: RawChunk[] = [];

  if (symbols.length > 0) {
    let currentLine = 1;

    for (let i = 0; i < symbols.length; i++) {
      const sym = symbols[i];
      const nextSym = symbols[i + 1];
      const symStart = sym.startLine;
      const symEnd = sym.endLine || (nextSym ? Math.max(symStart, nextSym.startLine - 1) : totalLines);

      // If there was code before this symbol that wasn't chunked
      if (symStart > currentLine) {
        const gapChunks = createSlidingChunks(
          lines,
          currentLine,
          symStart - 1,
          filePath,
          language,
          maxLinesPerChunk,
          overlapLines
        );
        chunks.push(...gapChunks);
      }

      // Chunk the symbol itself
      const symLineCount = symEnd - symStart + 1;
      if (symLineCount <= maxLinesPerChunk) {
        const chunkContent = lines.slice(symStart - 1, symEnd).join('\n').trim();
        if (chunkContent) {
          chunks.push({
            filePath,
            language,
            symbolName: sym.name,
            symbolType: sym.type,
            startLine: symStart,
            endLine: symEnd,
            content: chunkContent,
          });
        }
      } else {
        // Large symbol, split with sliding window retaining symbol name
        const subChunks = createSlidingChunks(
          lines,
          symStart,
          symEnd,
          filePath,
          language,
          maxLinesPerChunk,
          overlapLines,
          sym.name,
          sym.type
        );
        chunks.push(...subChunks);
      }

      currentLine = symEnd + 1;
    }

    // Trailing code after the last symbol
    if (currentLine <= totalLines) {
      const trailingChunks = createSlidingChunks(
        lines,
        currentLine,
        totalLines,
        filePath,
        language,
        maxLinesPerChunk,
        overlapLines
      );
      chunks.push(...trailingChunks);
    }
  } else {
    // Fallback: sliding window chunking across the entire file
    const sliding = createSlidingChunks(
      lines,
      1,
      totalLines,
      filePath,
      language,
      maxLinesPerChunk,
      overlapLines
    );
    chunks.push(...sliding);
  }

  return chunks;
}

/**
 * Creates overlapping chunks for a given range of lines
 */
function createSlidingChunks(
  lines: string[],
  startLine: number,
  endLine: number,
  filePath: string,
  language: string,
  maxLines: number,
  overlap: number,
  symbolName?: string,
  symbolType?: SymbolType
): RawChunk[] {
  const chunks: RawChunk[] = [];
  const rangeLines = lines.slice(startLine - 1, endLine);
  const total = rangeLines.length;

  if (total <= 0) return chunks;

  let offset = 0;
  while (offset < total) {
    const chunkEndOffset = Math.min(offset + maxLines, total);
    const chunkSlice = rangeLines.slice(offset, chunkEndOffset);
    const content = chunkSlice.join('\n').trim();

    if (content) {
      chunks.push({
        filePath,
        language,
        symbolName,
        symbolType,
        startLine: startLine + offset,
        endLine: startLine + chunkEndOffset - 1,
        content,
      });
    }

    if (chunkEndOffset >= total) break;
    offset += maxLines - overlap;
  }

  return chunks;
}

/**
 * Detect symbols in code lines using structural patterns
 */
export function detectSymbols(lines: string[], language: string): SymbolDefinition[] {
  const symbols: SymbolDefinition[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) {
      continue;
    }

    // JavaScript / TypeScript patterns
    if (language === 'JavaScript' || language === 'TypeScript') {
      // Express / API routes
      const routeMatch = trimmed.match(/(?:app|router)\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (routeMatch) {
        symbols.push({
          name: `${routeMatch[1].toUpperCase()} ${routeMatch[2]}`,
          type: 'route',
          startLine: lineNum,
        });
        continue;
      }

      // Class / Interface
      const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?(class|interface)\s+([a-zA-Z0-9_$]+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[2],
          type: classMatch[1] === 'class' ? 'class' : 'interface',
          startLine: lineNum,
        });
        continue;
      }

      // Function declarations
      const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s*([a-zA-Z0-9_$]+)/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          type: 'function',
          startLine: lineNum,
        });
        continue;
      }

      // Arrow functions or const methods
      const arrowMatch = trimmed.match(/^(?:export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
      if (arrowMatch) {
        symbols.push({
          name: arrowMatch[1],
          type: 'function',
          startLine: lineNum,
        });
        continue;
      }
    }

    // Python patterns
    if (language === 'Python') {
      // Flask / FastAPI routes
      const pyRouteMatch = trimmed.match(/@(?:app|router)\.(get|post|put|delete|patch|route)\s*\(\s*['"`]([^'"`]+)['"`]/i);
      if (pyRouteMatch) {
        symbols.push({
          name: `${pyRouteMatch[1].toUpperCase()} ${pyRouteMatch[2]}`,
          type: 'route',
          startLine: lineNum,
        });
        continue;
      }

      // Python classes
      const pyClassMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)/);
      if (pyClassMatch) {
        symbols.push({
          name: pyClassMatch[1],
          type: 'class',
          startLine: lineNum,
        });
        continue;
      }

      // Python def functions
      const pyFuncMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)/);
      if (pyFuncMatch) {
        symbols.push({
          name: pyFuncMatch[1],
          type: 'function',
          startLine: lineNum,
        });
        continue;
      }
    }

    // Java / C# / C++ patterns
    if (language === 'Java' || language === 'C#' || language === 'C++') {
      const classMatch = trimmed.match(/(?:public|private|protected|static|abstract|\s)*\b(class|interface|enum)\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[2],
          type: 'class',
          startLine: lineNum,
        });
        continue;
      }

      const methodMatch = trimmed.match(/(?:public|private|protected|static|final|async|\s)*[a-zA-Z0-9_<>[\],\s]+\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[a-zA-Z0-9_,\s]+)?\s*\{/);
      if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
        symbols.push({
          name: methodMatch[1],
          type: 'method',
          startLine: lineNum,
        });
        continue;
      }
    }

    // Go patterns
    if (language === 'Go') {
      const goFuncMatch = trimmed.match(/^func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/);
      if (goFuncMatch) {
        symbols.push({
          name: goFuncMatch[1],
          type: 'function',
          startLine: lineNum,
        });
        continue;
      }

      const goStructMatch = trimmed.match(/^type\s+([a-zA-Z0-9_]+)\s+(struct|interface)/);
      if (goStructMatch) {
        symbols.push({
          name: goStructMatch[1],
          type: 'class',
          startLine: lineNum,
        });
        continue;
      }
    }
  }

  // Calculate approximate endLines based on braces or next symbol
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const nextSym = symbols[i + 1];
    if (nextSym) {
      sym.endLine = Math.max(sym.startLine, nextSym.startLine - 1);
    } else {
      sym.endLine = lines.length;
    }
  }

  return symbols;
}

function findPrimarySymbol(lines: string[], language: string): SymbolDefinition | undefined {
  const symbols = detectSymbols(lines, language);
  return symbols.length > 0 ? symbols[0] : undefined;
}
