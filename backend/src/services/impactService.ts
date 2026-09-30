import { openaiService } from './openaiService';
import { vectorService } from './vectorService';
import { IMPACT_ANALYSIS_SYSTEM_PROMPT, buildImpactAnalysisPrompt } from './prompts/impactAnalysis';
import { ImpactReport, CodeChunk, Relationship } from '../types';
import { config } from '../config';

export class ImpactService {
  /**
   * Sanitizes and parses LLM JSON output with recovery from markdown fences or partial structures
   */
  public parseAndValidateReport(rawOutput: string, evidence: CodeChunk[]): ImpactReport {
    let cleanJson = rawOutput.trim();

    // Strip markdown code fences if wrapped in ```json ... ```
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('[ImpactService] JSON parse failed, attempting regex object extraction...');
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          // Fallback minimal report
          parsed = null;
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        summary: 'Change impact analysis performed. Please review retrieved code evidence.',
        affectedFiles: evidence.slice(0, 3).map((e) => ({
          path: e.file_path,
          reason: `Potentially affected by change (contains symbol ${e.symbol_name || 'module'})`,
          confidence: 'medium',
          relevantSymbols: e.symbol_name ? [e.symbol_name] : [],
          references: [
            {
              filePath: e.file_path,
              startLine: e.start_line,
              endLine: e.end_line,
              rawCitation: `[${e.file_path}:${e.start_line}-${e.end_line}]`,
            },
          ],
        })),
        components: [],
        dependencyGraph: { nodes: [], edges: [] },
        implementationPlan: [
          {
            step: 1,
            title: 'Inspect affected files',
            description: 'Review the identified files and integrate required modifications.',
            affectedFiles: evidence.slice(0, 2).map((e) => e.file_path),
            references: [],
          },
        ],
        risks: [
          {
            area: 'Integration regression',
            severity: 'medium',
            description: 'Ensure existing functionality and unit tests are preserved.',
            mitigation: 'Add automated tests for the new feature flow.',
            references: [],
          },
        ],
        evidence,
      };
    }

    // Normalize and validate parsed report
    const validReport: ImpactReport = {
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Impact analysis completed.',
      affectedFiles: Array.isArray(parsed.affectedFiles)
        ? parsed.affectedFiles.map((f: any) => ({
            path: f.path || 'Unknown',
            reason: f.reason || 'Affected by change',
            confidence: ['high', 'medium', 'low'].includes(f.confidence) ? f.confidence : 'medium',
            relevantSymbols: Array.isArray(f.relevantSymbols) ? f.relevantSymbols : [],
            references: Array.isArray(f.references) ? f.references : [],
          }))
        : [],
      components: Array.isArray(parsed.components)
        ? parsed.components.map((c: any) => ({
            name: c.name || 'Component',
            type: c.type || 'function',
            filePath: c.filePath || '',
            impactReason: c.impactReason || '',
          }))
        : [],
      dependencyGraph: {
        nodes: Array.isArray(parsed.dependencyGraph?.nodes) ? parsed.dependencyGraph.nodes : [],
        edges: Array.isArray(parsed.dependencyGraph?.edges) ? parsed.dependencyGraph.edges : [],
      },
      implementationPlan: Array.isArray(parsed.implementationPlan)
        ? parsed.implementationPlan.map((p: any, idx: number) => ({
            step: p.step || idx + 1,
            title: p.title || `Step ${idx + 1}`,
            description: p.description || '',
            affectedFiles: Array.isArray(p.affectedFiles) ? p.affectedFiles : [],
            references: Array.isArray(p.references) ? p.references : [],
          }))
        : [],
      risks: Array.isArray(parsed.risks)
        ? parsed.risks.map((r: any) => ({
            area: r.area || 'Risk Area',
            severity: ['high', 'medium', 'low'].includes(r.severity) ? r.severity : 'medium',
            description: r.description || '',
            mitigation: r.mitigation || '',
            references: Array.isArray(r.references) ? r.references : [],
          }))
        : [],
      evidence,
    };

    // If dependencyGraph is empty, build a helpful graph from affected files and relationships
    if (validReport.dependencyGraph.nodes.length === 0 && validReport.affectedFiles.length > 0) {
      validReport.dependencyGraph = this.buildFallbackGraph(validReport);
    }

    return validReport;
  }

  /**
   * Generates a visual relationship graph from the impact findings
   */
  private buildFallbackGraph(report: ImpactReport): { nodes: any[]; edges: any[] } {
    const nodes: any[] = [];
    const edges: any[] = [];
    const seenNodes = new Set<string>();

    report.affectedFiles.slice(0, 6).forEach((f, idx) => {
      const fileNodeId = `file-${idx}`;
      nodes.push({
        id: fileNodeId,
        label: f.path.split('/').pop() || f.path,
        type: 'file',
        filePath: f.path,
      });
      seenNodes.add(fileNodeId);

      // Link to components
      const fileComps = report.components.filter((c) => c.filePath === f.path || f.relevantSymbols.includes(c.name));
      fileComps.forEach((comp, cIdx) => {
        const compNodeId = `comp-${idx}-${cIdx}`;
        nodes.push({
          id: compNodeId,
          label: comp.name,
          type: comp.type === 'route' ? 'route' : 'function',
          filePath: f.path,
        });
        edges.push({
          source: fileNodeId,
          target: compNodeId,
          label: 'defines',
        });
      });
    });

    // Connect files sequentially or to a central database node if any models exist
    const hasDb = report.components.some((c) => c.type === 'database_model');
    if (hasDb) {
      const dbNodeId = 'node-db';
      nodes.push({
        id: dbNodeId,
        label: 'Database / Storage',
        type: 'database',
      });
      nodes.filter((n) => n.type === 'file').forEach((fn) => {
        edges.push({ source: fn.id, target: dbNodeId, label: 'queries' });
      });
    }

    return { nodes, edges };
  }

  /**
   * Run change impact analysis on repository
   */
  async analyzeChange(repositoryId: string, changeDescription: string): Promise<ImpactReport> {
    if (!changeDescription || !changeDescription.trim()) {
      throw new Error('Change description is required');
    }

    // 1. Generate query embedding for change description
    const queryEmbedding = await openaiService.generateSingleEmbedding(changeDescription.trim());

    // 2. Retrieve top code chunks using vector similarity
    const retrievedChunks = await vectorService.searchSimilarChunks(
      repositoryId,
      queryEmbedding,
      config.retrieval.topK
    );

    // 3. Expand through code relationships (imports, definitions, db calls)
    const { chunks: expandedEvidence, relationships } = await vectorService.expandThroughRelationships(
      repositoryId,
      retrievedChunks,
      4
    );

    // 4. Send grounded prompt to LLM (or use realistic offline demonstration generator if API key is not yet added)
    if (!openaiService.hasApiKey()) {
      return this.generateOfflineDemoReport(changeDescription, expandedEvidence, relationships);
    }

    const prompt = buildImpactAnalysisPrompt(changeDescription, expandedEvidence, relationships);
    const rawResult = await openaiService.generateCompletion(
      IMPACT_ANALYSIS_SYSTEM_PROMPT,
      prompt,
      'json_object'
    );

    // 5. Parse, validate, and return structured impact report
    return this.parseAndValidateReport(rawResult, expandedEvidence);
  }

  /**
   * Generates a grounded, dynamic demonstration report for offline testing
   * Customizes plan, risks, components, and citations based on the exact user input!
   */
  private generateOfflineDemoReport(
    changeDescription: string,
    evidence: CodeChunk[],
    relationships: Relationship[]
  ): ImpactReport {
    const text = changeDescription.toLowerCase();
    const uniqueFiles = Array.from(new Set(evidence.map((e) => e.file_path)));

    // Categorize change intent
    const isRateLimit = text.includes('rate') || text.includes('limit') || text.includes('throttle');
    const isEmail = text.includes('email') || text.includes('verify') || text.includes('verification') || text.includes('signup');
    const isRbac = text.includes('rbac') || text.includes('role') || text.includes('admin') || text.includes('permission');
    const isDatabase = text.includes('database') || text.includes('transaction') || text.includes('pool') || text.includes('query') || text.includes('migrate');
    const isOauth = text.includes('oauth') || text.includes('google') || text.includes('github') || text.includes('sso');

    let categoryTitle = 'Feature Implementation';
    if (isRateLimit) categoryTitle = 'API Rate Limiting & Throttling';
    else if (isEmail) categoryTitle = 'Email Verification & Account Activation';
    else if (isRbac) categoryTitle = 'Role-Based Access Control (RBAC)';
    else if (isDatabase) categoryTitle = 'Database Transaction & Connection Pooling';
    else if (isOauth) categoryTitle = 'OAuth Federated Authentication';

    // Build affected files with domain-specific explanations
    const affectedFiles = uniqueFiles.map((filePath) => {
      const fileChunks = evidence.filter((e) => e.file_path === filePath);
      const symbols = Array.from(new Set(fileChunks.map((c) => c.symbol_name).filter(Boolean))) as string[];

      let reason = `Requires updates to integrate "${changeDescription}".`;
      let confidence: 'high' | 'medium' | 'low' = 'medium';

      if (isRateLimit) {
        if (filePath.includes('app') || filePath.includes('route')) {
          reason = `Must attach rate limiting middleware before route handlers to throttle incoming requests.`;
          confidence = 'high';
        } else if (filePath.includes('config')) {
          reason = `Requires rate limiting thresholds (e.g. MAX_REQUESTS, WINDOW_MS) configuration.`;
          confidence = 'medium';
        }
      } else if (isEmail) {
        if (filePath.includes('userModel') || filePath.includes('model')) {
          reason = `Must persist is_verified boolean flag and verification token expiration timestamps.`;
          confidence = 'high';
        } else if (filePath.includes('authService') || filePath.includes('service')) {
          reason = `Needs activation token generation and validation logic during signup and confirmation.`;
          confidence = 'high';
        } else if (filePath.includes('route') || filePath.includes('controller')) {
          reason = `Must expose GET /verify-email endpoint and handle activation redirect response.`;
          confidence = 'high';
        }
      } else if (isRbac) {
        if (filePath.includes('userModel')) {
          reason = `Requires role column schema definition (admin, user, moderator).`;
          confidence = 'high';
        } else if (filePath.includes('authService')) {
          reason = `Must encode user role and permission scopes inside signed JWT claims.`;
          confidence = 'high';
        } else if (filePath.includes('route') || filePath.includes('app')) {
          reason = `Must wrap protected endpoints with authorizeRole('admin') middleware.`;
          confidence = 'high';
        }
      } else if (isDatabase) {
        if (filePath.includes('database') || filePath.includes('config')) {
          reason = `Must configure connection pool sizing, connection timeout, and transaction helpers.`;
          confidence = 'high';
        } else if (filePath.includes('model')) {
          reason = `Must refactor atomic queries to execute within transactional BEGIN / COMMIT / ROLLBACK clients.`;
          confidence = 'high';
        }
      } else if (isOauth) {
        if (filePath.includes('authService')) {
          reason = `Needs OAuth profile verification and token exchange methods.`;
          confidence = 'high';
        } else if (filePath.includes('route') || filePath.includes('controller')) {
          reason = `Must register OAuth initiation and callback redirection route handlers.`;
          confidence = 'high';
        } else if (filePath.includes('model')) {
          reason = `Must store external provider IDs (e.g. google_id) to link accounts.`;
          confidence = 'high';
        }
      }

      return {
        path: filePath,
        reason,
        confidence,
        relevantSymbols: symbols.length > 0 ? symbols : ['module'],
        references: fileChunks.slice(0, 2).map((c) => ({
          filePath: c.file_path,
          startLine: c.start_line,
          endLine: c.end_line,
          symbolName: c.symbol_name,
          rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
        })),
      };
    });

    // Build affected components
    const components = evidence
      .filter((e) => e.symbol_name)
      .slice(0, 6)
      .map((e) => {
        let impactReason = `Must adapt internal logic to support "${changeDescription}".`;
        if (isRateLimit) impactReason = `Apply request counter inspection before invoking ${e.symbol_name}.`;
        else if (isEmail) impactReason = `Verify account activation status before granting access via ${e.symbol_name}.`;
        else if (isRbac) impactReason = `Enforce role permission validation within ${e.symbol_name}.`;
        else if (isDatabase) impactReason = `Acquire transaction client and ensure connection release in ${e.symbol_name}.`;
        else if (isOauth) impactReason = `Handle federated identity payload in ${e.symbol_name}.`;

        return {
          name: e.symbol_name!,
          type: (e.symbol_type === 'route'
            ? 'route'
            : e.file_path.includes('model')
            ? 'database_model'
            : e.file_path.includes('service')
            ? 'service'
            : 'function') as any,
          filePath: e.file_path,
          impactReason,
        };
      });

    // Domain-tailored Implementation Plan
    let plan: any[] = [];
    if (isRateLimit) {
      plan = [
        {
          step: 1,
          title: 'Implement rate limiting middleware',
          description: 'Construct a sliding-window or token-bucket rate limiter tracking client IP addresses.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('app') || f.includes('middleware')),
          references: evidence.filter((e) => e.file_path.includes('app')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 2,
          title: 'Configure threshold parameters',
          description: 'Define max requests allowed per time window (e.g. 100 requests per 15 minutes) and configurable environment overrides.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('config')),
          references: [],
        },
        {
          step: 3,
          title: 'Mount middleware on sensitive public routes',
          description: 'Attach the rate limiter to auth routes (/login, /register) to safeguard against brute force attacks.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('route')),
          references: evidence.filter((e) => e.file_path.includes('route')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 4,
          title: 'Return standardized HTTP 429 Too Many Requests response',
          description: 'Include Retry-After and X-RateLimit headers and format error messages consistent with global error handling.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('app') || f.includes('middleware')),
          references: [],
        },
        {
          step: 5,
          title: 'Add automated rate limiting test coverage',
          description: 'Write integration tests asserting HTTP 429 after exceeding request quotas.',
          affectedFiles: uniqueFiles.slice(0, 2),
          references: [],
        },
      ];
    } else if (isEmail) {
      plan = [
        {
          step: 1,
          title: 'Update UserModel schema for verification flags',
          description: 'Add is_verified (boolean) and verification_token (varchar) with expiration timestamps to the user table.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('model')),
          references: evidence.filter((e) => e.file_path.includes('model')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 2,
          title: 'Update registration logic in AuthService',
          description: 'Generate a secure cryptographic token on user creation and dispatch the verification email.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('service')),
          references: evidence.filter((e) => e.file_path.includes('service')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 3,
          title: 'Expose email verification route & controller',
          description: 'Add GET /api/auth/verify-email endpoint to validate tokens and activate user accounts.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('route') || f.includes('controller')),
          references: evidence.filter((e) => e.file_path.includes('route')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 4,
          title: 'Enforce verification check during loginUser',
          description: 'Block unverified users from authenticating or issue restricted session scopes.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('service')),
          references: [],
        },
      ];
    } else if (isRbac) {
      plan = [
        {
          step: 1,
          title: 'Define role types and schema attributes',
          description: 'Add role column with default "user" value in UserModel and TypeScript interfaces.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('model')),
          references: evidence.filter((e) => e.file_path.includes('model')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 2,
          title: 'Embed role claims into JWT session token',
          description: 'Update AuthService.loginUser to include user.role inside the signed JWT payload.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('service')),
          references: evidence.filter((e) => e.file_path.includes('service')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 3,
          title: 'Create requireRole authorization middleware',
          description: 'Intercept incoming requests, decode role claims, and reject with HTTP 403 Forbidden if unauthorized.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('app') || f.includes('route')),
          references: [],
        },
        {
          step: 4,
          title: 'Protect administrative routes and endpoints',
          description: 'Apply requireRole("admin") to administrative and user management endpoints.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('route')),
          references: evidence.filter((e) => e.file_path.includes('route')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
      ];
    } else if (isDatabase) {
      plan = [
        {
          step: 1,
          title: 'Configure pool limits & timeout safeguards',
          description: 'Set max connection pool size, connection timeout, and idle client eviction in database.ts.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('database') || f.includes('config')),
          references: evidence.filter((e) => e.file_path.includes('database')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 2,
          title: 'Implement transaction execution wrapper',
          description: 'Create a reusable withTransaction(async (client) => ...) helper ensuring BEGIN, COMMIT, and automatic ROLLBACK.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('database')),
          references: [],
        },
        {
          step: 3,
          title: 'Refactor UserModel queries to support transactional clients',
          description: 'Update UserModel methods to optionally accept a PoolClient instance to participate in active transactions.',
          affectedFiles: uniqueFiles.filter((f) => f.includes('model')),
          references: evidence.filter((e) => e.file_path.includes('model')).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 4,
          title: 'Add connection leak detection & pool stress tests',
          description: 'Verify that client.release() is guaranteed across both success and exception execution branches.',
          affectedFiles: uniqueFiles.slice(0, 2),
          references: [],
        },
      ];
    } else {
      // Default tailored to the specific change description
      plan = [
        {
          step: 1,
          title: `Configure requirements for ${changeDescription}`,
          description: `Define configuration settings and environment prerequisites for "${changeDescription}".`,
          affectedFiles: uniqueFiles.filter((f) => f.includes('config') || f.includes('app')),
          references: evidence.filter((e) => e.file_path.includes('config') || e.file_path.includes('app')).slice(0, 2).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 2,
          title: `Extend core service logic`,
          description: `Implement the operational procedures required for "${changeDescription}" within the service layer.`,
          affectedFiles: uniqueFiles.filter((f) => f.includes('service')),
          references: evidence.filter((e) => e.file_path.includes('service')).slice(0, 2).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 3,
          title: `Update API endpoints & handlers`,
          description: `Connect controllers and route handlers to invoke the updated functionality.`,
          affectedFiles: uniqueFiles.filter((f) => f.includes('route') || f.includes('controller')),
          references: evidence.filter((e) => e.file_path.includes('route')).slice(0, 2).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 4,
          title: `Update database and model layer`,
          description: `Persist new fields or entity relationships necessary for "${changeDescription}".`,
          affectedFiles: uniqueFiles.filter((f) => f.includes('model') || f.includes('database')),
          references: evidence.filter((e) => e.file_path.includes('model')).slice(0, 2).map((c) => ({
            filePath: c.file_path,
            startLine: c.start_line,
            endLine: c.end_line,
            rawCitation: `[${c.file_path}:${c.start_line}-${c.end_line}]`,
          })),
        },
        {
          step: 5,
          title: `Add regression tests`,
          description: `Assert correctness of ${changeDescription} and verify existing behaviors remain unbroken.`,
          affectedFiles: uniqueFiles.slice(0, 2),
          references: [],
        },
      ];
    }

    // Domain-tailored Risk Areas
    let risks: any[] = [];
    if (isRateLimit) {
      risks = [
        {
          area: 'Legitimate user throttling behind NAT / Shared Proxies',
          severity: 'high' as const,
          description: 'Users on corporate networks or mobile gateways sharing public IPs may face unintended throttling.',
          mitigation: 'Incorporate user authentication IDs (req.user.id) rather than raw IP addresses for authenticated routes.',
          references: [],
        },
        {
          area: 'Memory exhaustion with in-memory stores',
          severity: 'medium' as const,
          description: 'Storing client hit counts in Node.js process memory can cause memory leaks under large volumetric scans.',
          mitigation: 'Back the rate limiter with Redis or set an LRU eviction policy.',
          references: [],
        },
      ];
    } else if (isEmail) {
      risks = [
        {
          area: 'Registration latency and email provider downtime',
          severity: 'high' as const,
          description: 'Sending verification emails synchronously during the HTTP signup request will degrade response times.',
          mitigation: 'Dispatch verification emails asynchronously through a background queue (e.g. BullMQ / RabbitMQ).',
          references: [],
        },
        {
          area: 'Token brute force or expiration issues',
          severity: 'medium' as const,
          description: 'Short tokens can be guessed or valid tokens could expire before the user opens their inbox.',
          mitigation: 'Use crypto.randomBytes(32) with a 24-hour expiration window and allow token re-sending.',
          references: [],
        },
      ];
    } else if (isRbac) {
      risks = [
        {
          area: 'Privilege escalation via forged tokens',
          severity: 'high' as const,
          description: 'If JWT role claims are decoded on the client or server without verifying cryptographic signature.',
          mitigation: 'Always verify JWT signature using jwt.verify with the secret key before trusting the role claim.',
          references: [],
        },
        {
          area: 'Unassigned role null-pointer exceptions',
          severity: 'medium' as const,
          description: 'Existing user records created before the role column was introduced may have NULL role values.',
          mitigation: 'Add a default role migration (e.g. DEFAULT "user") and handle undefined roles safely in middleware.',
          references: [],
        },
      ];
    } else if (isDatabase) {
      risks = [
        {
          area: 'Connection starvation & pool exhaustion',
          severity: 'high' as const,
          description: 'Failing to call client.release() in an error catch block will exhaust pool capacity and freeze the API.',
          mitigation: 'Always encapsulate client release in a finally block or use a scoped transaction wrapper.',
          references: [],
        },
        {
          area: 'Deadlocks from inconsistent locking order',
          severity: 'medium' as const,
          description: 'Concurrent transactions updating related tables in differing orders can produce PostgreSQL deadlocks.',
          mitigation: 'Enforce deterministic row update ordering across all transaction handlers.',
          references: [],
        },
      ];
    } else {
      risks = [
        {
          area: 'Backward compatibility and integration regression',
          severity: 'medium' as const,
          description: `Existing consumers relying on current contracts may experience regressions when integrating "${changeDescription}".`,
          mitigation: 'Preserve existing endpoint response signatures and run automated integration suites.',
          references: [],
        },
      ];
    }

    const report: ImpactReport = {
      summary: `Change Impact Analysis for "${changeDescription}" (${categoryTitle}): Identified ${affectedFiles.length} affected files, ${components.length} cascading components, and tailored implementation steps. (Running in Offline Simulation Mode — add OPENAI_API_KEY to .env for live LLM reasoning).`,
      affectedFiles,
      components,
      dependencyGraph: { nodes: [], edges: [] },
      implementationPlan: plan,
      risks,
      evidence,
    };

    report.dependencyGraph = this.buildFallbackGraph(report);
    return report;
  }
}

export const impactService = new ImpactService();
