export type RepositoryStatus = 'pending' | 'fetching' | 'indexing' | 'ready' | 'failed';

export interface Repository {
  id: string;
  owner: string;
  name: string;
  url: string;
  default_branch: string;
  status: RepositoryStatus;
  status_message: string;
  file_count: number;
  chunk_count: number;
  languages: string[];
  indexed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  path: string;
  language: string;
  size: number;
}

export type SymbolType =
  | 'function'
  | 'class'
  | 'method'
  | 'interface'
  | 'route'
  | 'export'
  | 'model'
  | 'block';

export interface CodeChunk {
  id: string;
  repository_id: string;
  file_id: string;
  file_path: string;
  language: string;
  symbol_name?: string;
  symbol_type?: SymbolType;
  start_line: number;
  end_line: number;
  content: string;
  similarity?: number;
}

export interface SearchResult extends CodeChunk {
  similarity: number;
}

export interface SourceReference {
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  rawCitation: string;
}

export interface QAResponse {
  question: string;
  answer: string;
  sourceReferences: SourceReference[];
  evidence: CodeChunk[];
  confidence: 'high' | 'medium' | 'low' | 'insufficient_evidence';
}

export interface AffectedFile {
  path: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  relevantSymbols: string[];
  references: SourceReference[];
}

export interface AffectedComponent {
  name: string;
  type: 'function' | 'class' | 'route' | 'service' | 'database_model' | 'ui_component';
  filePath: string;
  impactReason: string;
}

export interface PlanStep {
  step: number;
  title: string;
  description: string;
  affectedFiles: string[];
  references: SourceReference[];
}

export interface RiskArea {
  area: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
  references: SourceReference[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'function' | 'service' | 'route' | 'database';
  filePath?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface ImpactReport {
  summary: string;
  affectedFiles: AffectedFile[];
  components: AffectedComponent[];
  dependencyGraph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  implementationPlan: PlanStep[];
  risks: RiskArea[];
  evidence: CodeChunk[];
}
