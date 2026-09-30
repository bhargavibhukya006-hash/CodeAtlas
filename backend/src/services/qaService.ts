import { openaiService } from './openaiService';
import { vectorService } from './vectorService';
import { CODEBASE_QA_SYSTEM_PROMPT, buildCodebaseQAPrompt } from './prompts/codebaseQA';
import { QAResponse, SourceReference, CodeChunk } from '../types';
import { config } from '../config';

export class QAService {
  /**
   * Parse [filePath:startLine-endLine] citations from markdown text
   */
  private extractSourceReferences(text: string, evidenceChunks: CodeChunk[]): SourceReference[] {
    const citationRegex = /\[([a-zA-Z0-9_./\\-]+):(\d+)(?:-(\d+))?\]/g;
    const references: SourceReference[] = [];
    const seen = new Set<string>();

    let match;
    while ((match = citationRegex.exec(text)) !== null) {
      const rawCitation = match[0];
      const filePath = match[1];
      const startLine = parseInt(match[2], 10);
      const endLine = match[3] ? parseInt(match[3], 10) : startLine;

      const key = `${filePath}:${startLine}-${endLine}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Find matching symbol if exists in retrieved evidence
        const matchingChunk = evidenceChunks.find(
          (c) => c.file_path === filePath && c.start_line <= startLine && c.end_line >= endLine
        );

        references.push({
          filePath,
          startLine,
          endLine,
          symbolName: matchingChunk?.symbol_name,
          rawCitation,
        });
      }
    }

    return references;
  }

  /**
   * Ask CodeAtlas a natural-language codebase question
   */
  async askQuestion(repositoryId: string, question: string): Promise<QAResponse> {
    if (!question || !question.trim()) {
      throw new Error('Question cannot be empty');
    }

    // 1. Generate query embedding
    const queryEmbedding = await openaiService.generateSingleEmbedding(question.trim());

    // 2. Retrieve top K code chunks with query terms
    const retrievedChunks = await vectorService.searchSimilarChunks(
      repositoryId,
      queryEmbedding,
      config.retrieval.topK,
      question.trim()
    );

    // Filter chunks for term relevance
    const stopWords = new Set(['where', 'what', 'how', 'the', 'is', 'in', 'to', 'for', 'and', 'from', 'with', 'are', 'does', 'can', 'explain', 'show', 'located', 'handled', 'which', 'code', 'file']);
    const significantWords = question.toLowerCase().split(/[\s,?.!]+/).filter((w) => w.length > 2 && !stopWords.has(w));
    
    const matchingChunks = retrievedChunks.filter((c) => {
      if (significantWords.length === 0) return true;
      const text = `${c.file_path} ${c.symbol_name || ''} ${c.content}`.toLowerCase();
      return significantWords.some((w) => text.includes(w) || (w.length > 4 && text.includes(w.slice(0, 4))));
    });

    // Guard against hallucinating answers when concept doesn't exist in the repository
    if (matchingChunks.length === 0 && significantWords.length > 0) {
      return {
        question,
        answer: `I couldn't find enough evidence in the indexed repository to answer this confidently. No code files, symbols, or implementations related to "${question.trim()}" exist in the codebase.`,
        sourceReferences: [],
        evidence: [],
        confidence: 'insufficient_evidence',
      };
    }

    const relevantChunks = matchingChunks.length > 0 ? matchingChunks : retrievedChunks;

    // 3. Expand context through relationships (e.g. imports / definitions)
    const { chunks: expandedEvidence } = await vectorService.expandThroughRelationships(
      repositoryId,
      relevantChunks,
      2
    );

    // If no evidence found in repo
    if (expandedEvidence.length === 0) {
      return {
        question,
        answer:
          "I couldn't find enough evidence in the indexed repository to answer this confidently. No relevant code files or symbols matched your query.",
        sourceReferences: [],
        evidence: [],
        confidence: 'insufficient_evidence',
      };
    }

    // 4. Build prompt and invoke LLM (or synthesize grounded answer in offline demo mode)
    let rawAnswer: string;
    if (!openaiService.hasApiKey()) {
      const topChunk = expandedEvidence[0];
      const secondChunk = expandedEvidence.length > 1 ? expandedEvidence[1] : null;
      const refs = expandedEvidence.slice(0, 3).map((c) => `[${c.file_path}:${c.start_line}-${c.end_line}]`);

      rawAnswer = `Based on the retrieved code chunks in this repository:\n\n` +
        `• Primary logic is implemented in \`${topChunk.file_path}\` (Lines ${topChunk.start_line}-${topChunk.end_line}) within \`${topChunk.symbol_name || 'module'}\` ${refs[0]}.\n` +
        (secondChunk ? `• Supporting connections and flow are handled in \`${secondChunk.file_path}\` ${refs[1]}.\n\n` : '\n') +
        `*(Note: Running in Offline Demo Mode. Configure \`OPENAI_API_KEY\` in .env for live generative reasoning).*`;
    } else {
      const userPrompt = buildCodebaseQAPrompt(question, expandedEvidence);
      rawAnswer = await openaiService.generateCompletion(
        CODEBASE_QA_SYSTEM_PROMPT,
        userPrompt,
        'text'
      );
    }

    // 5. Extract citations
    const sourceReferences = this.extractSourceReferences(rawAnswer, expandedEvidence);

    // Determine confidence based on presence of citations and keywords
    const isInsufficient = rawAnswer.includes("couldn't find enough evidence") || sourceReferences.length === 0;
    const confidence = isInsufficient
      ? 'insufficient_evidence'
      : sourceReferences.length >= 3
      ? 'high'
      : 'medium';

    return {
      question,
      answer: rawAnswer,
      sourceReferences,
      evidence: expandedEvidence,
      confidence,
    };
  }
}

export const qaService = new QAService();
