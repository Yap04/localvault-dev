import { describe, it, expect } from 'vitest';
import { AIService } from '../aiService';
import { SensitiveEntity } from '../../types';

describe('AIService Hybrid AI Pipeline & Data Engine', () => {
  // ==========================================
  // Suite 1: JSON to TypeScript Interface Generator
  // ==========================================
  describe('Suite 1: JSON to TypeScript Interface Generator', () => {
    it('should generate valid TypeScript interface from flat primitive JSON', () => {
      const json = JSON.stringify({
        username: 'dev_alex',
        age: 28,
        isVerified: true
      });

      const ts = AIService.generateTypeScriptFromJson(json);
      expect(ts).toContain('export interface RootPayload {');
      expect(ts).toContain('username: string;');
      expect(ts).toContain('age: number;');
      expect(ts).toContain('isVerified: boolean;');
    });

    it('should handle nested objects and arrays of primitives', () => {
      const json = JSON.stringify({
        user: {
          id: 'usr_100',
          roles: ['ADMIN', 'DEVELOPER']
        },
        scores: [95, 88, 100]
      });

      const ts = AIService.generateTypeScriptFromJson(json);
      expect(ts).toContain('roles: string[];');
      expect(ts).toContain('scores: number[];');
      expect(ts).toContain('user: {');
      expect(ts).toContain('id: string;');
    });

    it('should handle null and empty arrays gracefully', () => {
      const json = JSON.stringify({
        metadata: null,
        emptyList: []
      });

      const ts = AIService.generateTypeScriptFromJson(json);
      expect(ts).toContain('metadata: null | unknown;');
      expect(ts).toContain('emptyList: unknown[];');
    });

    it('should handle sanitized redacted tokens inside JSON', () => {
      const json = JSON.stringify({
        userId: 'usr_99',
        apiKey: '[REDACTED_API_KEY_1]',
        secretToken: '[REDACTED_JWT_1]'
      });

      const ts = AIService.generateTypeScriptFromJson(json);
      expect(ts).toContain('apiKey: string;');
      expect(ts).toContain('secretToken: string;');
    });

    it('should gracefully handle malformed JSON syntax without throwing', () => {
      const malformedJson = '{ invalid: unquoted, broken: }';
      expect(() => AIService.generateTypeScriptFromJson(malformedJson)).not.toThrow();
      const output = AIService.generateTypeScriptFromJson(malformedJson);
      expect(output).toContain('Input content is not valid JSON');
    });
  });

  // ==========================================
  // Suite 2: Fast On-Device Log Triage
  // ==========================================
  describe('Suite 2: Fast On-Device Log Triage', () => {
    it('should extract error signature and summarize quarantined tokens', () => {
      const log = `[2026-11-20 12:00:00] INFO Starting service\n[2026-11-20 12:00:01] ERROR Connection refused: sk-proj-[REDACTED_API_KEY_1]`;
      const entities: SensitiveEntity[] = [
        {
          id: '1',
          type: 'API_KEY',
          raw: 'sk-proj-test',
          masked: '[REDACTED_API_KEY_1]',
          startIndex: 0,
          endIndex: 10
        }
      ];

      const triage = AIService.generateLocalLogTriage(log, entities);
      expect(triage).toContain('[On-Device Triage]');
      expect(triage).toContain('Error Signature:');
      expect(triage).toContain('Connection refused');
      expect(triage).toContain('API_KEY ([REDACTED_API_KEY_1])');
      expect(triage).toContain('Cleared for "Send to Cloud Deep Reasoning"');
    });

    it('should handle logs with zero detected secrets gracefully', () => {
      const log = 'INFO All services operating nominally';
      const triage = AIService.generateLocalLogTriage(log, []);
      expect(triage).toContain('No secrets detected');
    });
  });

  // ==========================================
  // Suite 3: Cloud Structured JSON Parser
  // ==========================================
  describe('Suite 3: Cloud Structured JSON Parser', () => {
    it('should parse standard clean JSON model responses', () => {
      const modelOutput = JSON.stringify({
        rootCause: 'Token expired',
        fixSuggestions: ['Rotate token', 'Update secrets'],
        securityAdvisory: 'Store in KMS',
        codeSnippet: '// fix code'
      });

      const parsed = AIService.parseCloudJsonResponse(modelOutput);
      expect(parsed).not.toBeNull();
      expect(parsed?.rootCause).toBe('Token expired');
      expect(parsed?.fixSuggestions).toHaveLength(2);
      expect(parsed?.codeSnippet).toBe('// fix code');
    });

    it('should strip markdown code ticks (```json ... ```) and parse cleanly', () => {
      const markdownWrapped = `\`\`\`json
{
  "rootCause": "Database socket timeout",
  "fixSuggestions": ["Increase connection timeout"],
  "securityAdvisory": "Neutralized DB password",
  "codeSnippet": "timeout = 5000"
}
\`\`\``;

      const parsed = AIService.parseCloudJsonResponse(markdownWrapped);
      expect(parsed?.rootCause).toBe('Database socket timeout');
      expect(parsed?.fixSuggestions[0]).toBe('Increase connection timeout');
    });

    it('should provide sensible fallback structure if cloud model returns unformatted text', () => {
      const plainText = 'The server failed because the database was unreachable due to firewall rules.';
      const parsed = AIService.parseCloudJsonResponse(plainText);
      expect(parsed).not.toBeNull();
      expect(parsed?.rootCause).toContain('The server failed because');
      expect(parsed?.fixSuggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================
  // Suite 4: 0-Leakage Egress Gate (Physical Network Blocker)
  // ==========================================
  describe('Suite 4: 0-Leakage Egress Gate (Physical Network Blocker)', () => {
    it('should strictly BLOCK and throw error if unmasked credentials remain in outbound text', async () => {
      const mockStripeKey = ['sk', 'live', '51M0abcdef1234567890XYZlive990011'].join('_');
      const leakyText = `Here is the raw leaked key: ${mockStripeKey}`;
      const entities: SensitiveEntity[] = [
        {
          id: 'ent_1',
          type: 'STRIPE_KEY',
          raw: mockStripeKey,
          masked: '[REDACTED_STRIPE_KEY_1]',
          startIndex: 28,
          endIndex: 68
        }
      ];

      // Must throw security violation error
      await expect(
        AIService.runCloudDeepAnalysis(leakyText, 'log-explainer', entities)
      ).rejects.toThrow(/Privacy Firewall Blocked/i);
    });

    it('should PERMIT egress when all sensitive tokens have been sanitized', async () => {
      const mockStripeKey = ['sk', 'live', '51M0abcdef1234567890XYZlive990011'].join('_');
      const safeText = 'Here is the sanitized key: [REDACTED_STRIPE_KEY_1]';
      const entities: SensitiveEntity[] = [
        {
          id: 'ent_1',
          type: 'STRIPE_KEY',
          raw: mockStripeKey,
          masked: '[REDACTED_STRIPE_KEY_1]',
          startIndex: 28,
          endIndex: 68
        }
      ];

      // Pre-flight check passes, completes fallback simulation
      const result = await AIService.runCloudDeepAnalysis(safeText, 'log-explainer', entities);
      expect(result).toBeDefined();
      expect(result.engine).toBe('cloud');
      expect(result.rootCause).toBeDefined();
    });
  });

  // ==========================================
  // Suite 5: Cloud Simulation Routing Verification
  // ==========================================
  describe('Suite 5: Cloud Simulation Routing Verification', () => {
    const dummyEntities: SensitiveEntity[] = [];

    it('should route Payment & CI/CD logs to payment gateway analysis (not DB crash)', async () => {
      const paymentLog = `[2026-11-20 18:32:10] CRITICAL WorkerCrash in PaymentDispatchQueue
  STRIPE_SECRET_KEY: "[REDACTED_STRIPE_KEY_1]"
  GITHUB_DEPLOY_TOKEN: "[REDACTED_GITHUB_TOKEN_1]"
  MONGODB_URI: "mongodb+srv://payment_worker:[REDACTED_PASSWORD_1]@us-east.mongo.cloud.internal/billing_db"`;

      const result = await AIService.runCloudDeepAnalysis(paymentLog, 'log-explainer', dummyEntities);
      expect(result.rootCause).toContain('Payment gateway');
      expect(result.codeSnippet).toContain('pino');
    });

    it('should route DB Crash logs to PostgreSQL pool analysis', async () => {
      const dbLog = `FATAL: Connection pool exhausted for tenant cluster 'prod-main-db'
Connection URI: postgresql://admin_vault_master:[REDACTED_PASSWORD_1]@[REDACTED_INTERNAL_IP_1]:5432/finance_ledger`;

      const result = await AIService.runCloudDeepAnalysis(dbLog, 'log-explainer', dummyEntities);
      expect(result.rootCause).toContain('PostgreSQL');
      expect(result.codeSnippet).toContain('Pool');
    });

    it('should route Auth 401 logs to API Key rotation analysis', async () => {
      const authLog = `ERROR in OpenAIClient: Request failed with status 401 Unauthorized: [REDACTED_API_KEY_1]`;

      const result = await AIService.runCloudDeepAnalysis(authLog, 'log-explainer', dummyEntities);
      expect(result.rootCause).toContain('401 Unauthorized');
      expect(result.codeSnippet).toContain('axiosInstance');
    });
  });
});
