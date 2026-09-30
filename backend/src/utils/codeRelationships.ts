import { Relationship, RelationshipType } from '../types';

export interface ExtractedRelationship {
  sourceFilePath: string;
  targetFilePath?: string;
  sourceSymbol?: string;
  targetSymbol?: string;
  relationshipType: RelationshipType;
}

/**
 * Extracts dependency and symbol relationships from source code
 */
export function extractRelationships(
  filePath: string,
  content: string,
  language: string,
  repositoryId: string
): Relationship[] {
  const relationships: Relationship[] = [];
  const lines = content.split(/\r?\n/);

  // 1. Database detection patterns
  const dbPatterns = [
    /(?:prisma|db|pool|knex|sequelize|mongoose)\.(?:[a-zA-Z0-9_]+)/g,
    /(?:SELECT|INSERT|UPDATE|DELETE|CREATE TABLE)\s+[a-zA-Z0-9_*,\s]+FROM\s+([a-zA-Z0-9_]+)/i,
    /@Entity|@Table\s*\(\s*name\s*=\s*['"]([a-zA-Z0-9_]+)['"]\)/i,
    /class\s+([a-zA-Z0-9_]+)\s*\([^)]*models\.Model[^)]*\)/i, // Django
  ];

  let hasDatabase = false;
  for (const line of lines) {
    for (const pat of dbPatterns) {
      if (pat.test(line)) {
        hasDatabase = true;
        break;
      }
    }
    if (hasDatabase) break;
  }

  if (hasDatabase) {
    relationships.push({
      repository_id: repositoryId,
      source_file_path: filePath,
      relationship_type: 'DATABASE',
      source_symbol: 'DatabaseQuery',
      target_symbol: 'Database',
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//') || line.startsWith('#')) continue;

    // JavaScript / TypeScript extraction
    if (language === 'JavaScript' || language === 'TypeScript') {
      // IMPORTS: import { a, b } from './path' or import X from 'pkg'
      const esImportMatch = line.match(/^import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_$]+)|\*\s+as\s+([a-zA-Z0-9_$]+))\s+from\s+['"]([^'"]+)['"]/);
      if (esImportMatch) {
        const symbols = esImportMatch[1]
          ? esImportMatch[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0])
          : [esImportMatch[2] || esImportMatch[3]];
        const importTarget = esImportMatch[4];

        for (const sym of symbols) {
          if (sym) {
            relationships.push({
              repository_id: repositoryId,
              source_file_path: filePath,
              target_file_path: resolveRelativePath(filePath, importTarget),
              target_symbol: sym,
              relationship_type: 'IMPORTS',
            });
          }
        }
        continue;
      }

      // CommonJS require: const x = require('./path')
      const cjsMatch = line.match(/(?:const|let|var)\s+(?:\{([^}]+)\}|([a-zA-Z0-9_$]+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
      if (cjsMatch) {
        const symbols = cjsMatch[1]
          ? cjsMatch[1].split(',').map((s) => s.trim())
          : [cjsMatch[2]];
        const target = cjsMatch[3];

        for (const sym of symbols) {
          if (sym) {
            relationships.push({
              repository_id: repositoryId,
              source_file_path: filePath,
              target_file_path: resolveRelativePath(filePath, target),
              target_symbol: sym,
              relationship_type: 'IMPORTS',
            });
          }
        }
        continue;
      }

      // EXTENDS: class Foo extends Bar
      const extendsMatch = line.match(/class\s+([a-zA-Z0-9_$]+)\s+extends\s+([a-zA-Z0-9_$]+)/);
      if (extendsMatch) {
        relationships.push({
          repository_id: repositoryId,
          source_file_path: filePath,
          source_symbol: extendsMatch[1],
          target_symbol: extendsMatch[2],
          relationship_type: 'EXTENDS',
        });
      }

      // EXPORTS: export default ... or export function/class/const
      const exportMatch = line.match(/^export\s+(?:default\s+)?(?:async\s+)?(function|class|const|let|var)\s+([a-zA-Z0-9_$]+)/);
      if (exportMatch) {
        relationships.push({
          repository_id: repositoryId,
          source_file_path: filePath,
          source_symbol: exportMatch[2],
          relationship_type: 'EXPORTS',
        });
        continue;
      }
    }

    // Python extraction
    if (language === 'Python') {
      // from module import something
      const pyFromMatch = line.match(/^from\s+([a-zA-Z0-9_.]+)\s+import\s+([a-zA-Z0-9_*,\s]+)/);
      if (pyFromMatch) {
        const mod = pyFromMatch[1];
        const symbols = pyFromMatch[2].split(',').map((s) => s.trim());
        for (const sym of symbols) {
          relationships.push({
            repository_id: repositoryId,
            source_file_path: filePath,
            target_file_path: mod,
            target_symbol: sym,
            relationship_type: 'IMPORTS',
          });
        }
        continue;
      }

      // import module
      const pyImportMatch = line.match(/^import\s+([a-zA-Z0-9_.]+)/);
      if (pyImportMatch) {
        relationships.push({
          repository_id: repositoryId,
          source_file_path: filePath,
          target_file_path: pyImportMatch[1],
          relationship_type: 'IMPORTS',
        });
        continue;
      }

      // class Foo(Bar):
      const pyClassExtends = line.match(/^class\s+([a-zA-Z0-9_]+)\s*\(\s*([a-zA-Z0-9_]+)\s*\):/);
      if (pyClassExtends) {
        relationships.push({
          repository_id: repositoryId,
          source_file_path: filePath,
          source_symbol: pyClassExtends[1],
          target_symbol: pyClassExtends[2],
          relationship_type: 'EXTENDS',
        });
        continue;
      }
    }

    // Java / C++ extraction
    if (language === 'Java' || language === 'C++') {
      const javaImport = line.match(/^import\s+(?:static\s+)?([a-zA-Z0-9_.*]+);/);
      if (javaImport) {
        relationships.push({
          repository_id: repositoryId,
          source_file_path: filePath,
          target_file_path: javaImport[1],
          relationship_type: 'IMPORTS',
        });
        continue;
      }

      const cppInclude = line.match(/^#include\s+["<]([^">]+)[">]/);
      if (cppInclude) {
        relationships.push({
          repository_id: repositoryId,
          source_file_path: filePath,
          target_file_path: cppInclude[1],
          relationship_type: 'IMPORTS',
        });
        continue;
      }

      const javaExtends = line.match(/class\s+([a-zA-Z0-9_]+)\s+extends\s+([a-zA-Z0-9_]+)/);
      if (javaExtends) {
        relationships.push({
          repository_id: repositoryId,
          source_file_path: filePath,
          source_symbol: javaExtends[1],
          target_symbol: javaExtends[2],
          relationship_type: 'EXTENDS',
        });
        continue;
      }
    }

    // Go extraction
    if (language === 'Go') {
      const goImport = line.match(/^import\s+(?:\([^\)]+\)|"([^"]+)")/);
      if (goImport && goImport[1]) {
        relationships.push({
          repository_id: repositoryId,
          source_file_path: filePath,
          target_file_path: goImport[1],
          relationship_type: 'IMPORTS',
        });
        continue;
      }
    }
  }

  return relationships;
}

/**
 * Normalizes relative import paths like './utils' or '../auth/service'
 */
function resolveRelativePath(currentFilePath: string, importPath: string): string {
  if (!importPath.startsWith('.')) {
    return importPath; // External library or absolute package
  }

  const currentDirParts = currentFilePath.replace(/\\/g, '/').split('/').slice(0, -1);
  const importParts = importPath.split('/');

  for (const part of importParts) {
    if (part === '.') {
      continue;
    } else if (part === '..') {
      if (currentDirParts.length > 0) currentDirParts.pop();
    } else {
      currentDirParts.push(part);
    }
  }

  return currentDirParts.join('/');
}
