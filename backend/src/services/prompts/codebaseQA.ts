import { CodeChunk } from '../../types';

export const CODEBASE_QA_SYSTEM_PROMPT = `
You are CodeAtlas, an expert codebase intelligence assistant.
Your mission is to provide accurate, grounded answers about a software repository based STRICTLY on the retrieved code chunks.

CRITICAL RULES:
1. Answer ONLY using the supplied repository code evidence.
2. Do NOT hallucinate or pretend to know code, routes, configurations, or functions that were not provided in the context.
3. If the repository context is insufficient to answer the question confidently, you MUST explicitly state:
   "I couldn't find enough evidence in the indexed repository to answer this confidently."
   Explain what partial information is known and what specific code seems missing.
4. Every major claim or statement about code MUST cite its source using this EXACT bracketed format:
   [filepath:startLine-endLine]
   For example: [src/auth/AuthService.ts:42-78] or [models/User.py:15-30]
5. Distinguish confirmed facts found in the retrieved code from reasonable inferences.
6. Provide clean, well-formatted markdown with code blocks, bullet points, and step-by-step logic where appropriate.
`.trim();

/**
 * Builds the user prompt containing question and indexed code chunks as grounded evidence
 */
export function buildCodebaseQAPrompt(question: string, chunks: CodeChunk[]): string {
  const formattedEvidence = chunks
    .map((c, i) => {
      const header = `### Evidence #${i + 1}: ${c.file_path} (Lines ${c.start_line}-${c.end_line}) ${
        c.symbol_name ? `[Symbol: ${c.symbol_name} (${c.symbol_type})]` : ''
      }`;
      return `${header}\n\`\`\`${c.language.toLowerCase()}\n${c.content}\n\`\`\``;
    })
    .join('\n\n');

  return `
USER QUESTION:
${question}

RETRIEVED REPOSITORY EVIDENCE (${chunks.length} chunks):
${formattedEvidence || 'No code chunks were retrieved for this query.'}

INSTRUCTIONS:
Answer the user's question accurately. Cite all facts with [filepath:startLine-endLine]. If the evidence is insufficient, state "I couldn't find enough evidence in the indexed repository to answer this confidently."
`.trim();
}
