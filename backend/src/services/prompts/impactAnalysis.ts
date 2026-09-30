import { CodeChunk, Relationship } from '../../types';

export const IMPACT_ANALYSIS_SYSTEM_PROMPT = `
You are CodeAtlas Change Impact Engine, an advanced static and semantic code intelligence analyzer.
Your task is to analyze a proposed architectural or code change against the retrieved repository evidence and dependencies.

CRITICAL INSTRUCTIONS:
1. Ground your entire analysis strictly in the provided code chunks and dependency relationships.
2. DO NOT invent risks, nonexistent modules, or imaginary files without evidence in the repository.
3. If an affected area is inferred rather than directly observed, clearly classify confidence as "medium" or "low" and explain why.
4. For all citations, use format: [filepath:startLine-endLine].
5. You MUST return ONLY a valid, parseable JSON object with the exact schema detailed below. No markdown fences around the JSON if possible, or clean standard JSON.

JSON SCHEMA:
{
  "summary": "Brief 2-3 sentence overview of the requested change and overarching architectural impact",
  "affectedFiles": [
    {
      "path": "exact/file/path.ext",
      "reason": "Specific technical explanation of why this file must be modified or created",
      "confidence": "high" | "medium" | "low",
      "relevantSymbols": ["symbol1", "symbol2"],
      "references": [
        { "filePath": "exact/file/path.ext", "startLine": 10, "endLine": 45, "rawCitation": "[exact/file/path.ext:10-45]" }
      ]
    }
  ],
  "components": [
    {
      "name": "Component or symbol name (e.g. AuthService, /api/login)",
      "type": "function" | "class" | "route" | "service" | "database_model" | "ui_component",
      "filePath": "exact/file/path.ext",
      "impactReason": "How this specific component needs to adapt"
    }
  ],
  "dependencyGraph": {
    "nodes": [
      { "id": "node-1", "label": "Label or File Name", "type": "file" | "function" | "service" | "route" | "database", "filePath": "optional/path" }
    ],
    "edges": [
      { "source": "node-1", "target": "node-2", "label": "calls | imports | modifies | queries" }
    ]
  },
  "implementationPlan": [
    {
      "step": 1,
      "title": "Clear step title",
      "description": "Concrete technical actions, files to edit, imports to add, schemas to migrate",
      "affectedFiles": ["exact/file/path.ext"],
      "references": [
        { "filePath": "exact/file/path.ext", "startLine": 1, "endLine": 20, "rawCitation": "[exact/file/path.ext:1-20]" }
      ]
    }
  ],
  "risks": [
    {
      "area": "Specific area of vulnerability or regression risk",
      "severity": "high" | "medium" | "low",
      "description": "Concrete explanation of why this could break based on repository evidence",
      "mitigation": "Recommended safeguards, integration tests, or fallback strategies",
      "references": []
    }
  ]
}
`.trim();

/**
 * Builds user prompt for change impact analysis with code chunks and relationship graph
 */
export function buildImpactAnalysisPrompt(
  changeDescription: string,
  chunks: CodeChunk[],
  relationships: Relationship[]
): string {
  const formattedEvidence = chunks
    .map((c, i) => {
      const header = `### Chunk #${i + 1}: ${c.file_path} (Lines ${c.start_line}-${c.end_line}) ${
        c.symbol_name ? `[Symbol: ${c.symbol_name} (${c.symbol_type})]` : ''
      }`;
      return `${header}\n\`\`\`${c.language.toLowerCase()}\n${c.content}\n\`\`\``;
    })
    .join('\n\n');

  const formattedRelationships = relationships.length > 0
    ? relationships
        .map(
          (r) =>
            `- [${r.relationship_type}] ${r.source_file_path}${r.source_symbol ? ` (${r.source_symbol})` : ''} -> ${
              r.target_file_path || 'External'
            }${r.target_symbol ? ` (${r.target_symbol})` : ''}`
        )
        .join('\n')
    : 'No explicit static relationships found for the retrieved chunks.';

  return `
PROPOSED CHANGE:
"${changeDescription}"

REPOSITORY EVIDENCE (${chunks.length} chunks retrieved via semantic similarity):
${formattedEvidence || 'No code chunks retrieved.'}

DETECTED CODE RELATIONSHIPS & DEPENDENCIES:
${formattedRelationships}

Analyze the change impact rigorously. Return the structured JSON object adhering to the schema.
`.trim();
}
