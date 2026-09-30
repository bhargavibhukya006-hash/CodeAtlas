import { ImpactService } from '../services/impactService';
import { CodeChunk } from '../types';

describe('Impact Analysis Parser and Validator', () => {
  const service = new ImpactService();

  const mockEvidence: CodeChunk[] = [
    {
      id: 'c1',
      repository_id: 'r1',
      file_id: 'f1',
      file_path: 'src/auth/authService.ts',
      language: 'TypeScript',
      symbol_name: 'AuthService',
      symbol_type: 'class',
      start_line: 10,
      end_line: 45,
      content: 'export class AuthService { login() {} }',
    },
  ];

  it('correctly parses well-formed JSON output', () => {
    const rawJson = JSON.stringify({
      summary: 'Adding Google OAuth requires updating authentication routes and user model.',
      affectedFiles: [
        {
          path: 'src/auth/authService.ts',
          reason: 'Must implement verifyGoogleToken method',
          confidence: 'high',
          relevantSymbols: ['AuthService'],
          references: [{ filePath: 'src/auth/authService.ts', startLine: 10, endLine: 45, rawCitation: '[src/auth/authService.ts:10-45]' }],
        },
      ],
      components: [
        {
          name: 'AuthService',
          type: 'service',
          filePath: 'src/auth/authService.ts',
          impactReason: 'Add OAuth exchange method',
        },
      ],
      dependencyGraph: {
        nodes: [{ id: 'n1', label: 'AuthService', type: 'service' }],
        edges: [],
      },
      implementationPlan: [
        {
          step: 1,
          title: 'Add Google Client ID',
          description: 'Configure environment variables',
          affectedFiles: ['src/config.ts'],
          references: [],
        },
      ],
      risks: [
        {
          area: 'Token expiration',
          severity: 'medium',
          description: 'OAuth tokens may expire unexpectedly',
          mitigation: 'Implement refresh token flow',
          references: [],
        },
      ],
    });

    const report = service.parseAndValidateReport(rawJson, mockEvidence);
    expect(report.summary).toContain('Google OAuth');
    expect(report.affectedFiles.length).toBe(1);
    expect(report.affectedFiles[0].confidence).toBe('high');
    expect(report.components.length).toBe(1);
    expect(report.implementationPlan.length).toBe(1);
    expect(report.risks.length).toBe(1);
  });

  it('recovers from markdown code fences (```json ... ```)', () => {
    const fenced = "```json\n" + JSON.stringify({
      summary: 'Impact summary inside fence',
      affectedFiles: [],
      components: [],
      implementationPlan: [],
      risks: [],
    }) + "\n```";

    const report = service.parseAndValidateReport(fenced, mockEvidence);
    expect(report.summary).toBe('Impact summary inside fence');
  });

  it('gracefully handles malformed JSON without crashing', () => {
    const malformed = "{ this is completely invalid JSON broken output ...";
    const report = service.parseAndValidateReport(malformed, mockEvidence);

    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(Array.isArray(report.affectedFiles)).toBe(true);
    expect(Array.isArray(report.implementationPlan)).toBe(true);
  });
});
