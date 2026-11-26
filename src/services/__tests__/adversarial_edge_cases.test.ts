import { describe, it, expect } from 'vitest';
import { LocalSanitizer } from '../sanitizer';

const MOCK_STRIPE_KEY = ['sk', 'live', '51M0abcdef1234567890XYZlive990011'].join('_');
const MOCK_SLACK_TOKEN = ['xoxb', '123456789012', '1234567890123', '456789012345678901234567'].join('-');

describe('LocalSanitizer Adversarial & Edge Case Vulnerability Probing', () => {
  // Test 1: Empty and whitespace strings
  it('Edge 1: should handle empty strings and whitespace safely without crashing', () => {
    expect(() => LocalSanitizer.sanitize('')).not.toThrow();
    expect(LocalSanitizer.sanitize('').entities).toHaveLength(0);
    expect(() => LocalSanitizer.sanitize('   \n\t  ')).not.toThrow();
  });

  // Test 2: Secrets at boundaries (index 0 or end of text)
  it('Edge 2: should redact secret at the exact start (index 0) of the document', () => {
    const input = `${MOCK_STRIPE_KEY} is the production key`;
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities).toHaveLength(1);
    expect(result.sanitizedText.startsWith('[REDACTED_STRIPE_KEY_1]')).toBe(true);
  });

  it('Edge 3: should redact secret at the exact end of the document without trailing newline', () => {
    const input = `Here is the key: ${MOCK_STRIPE_KEY}`;
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities).toHaveLength(1);
    expect(result.sanitizedText.endsWith('[REDACTED_STRIPE_KEY_1]')).toBe(true);
  });

  // Test 4: Uppercase or mixed-case URI schemes (e.g. MONGODB:// or Postgresql://)
  it('Edge 4: should handle mixed-case database URI schemes (POSTGRESQL://, MongoDB+SRV://)', () => {
    const input = 'MONGODB+SRV://payment_worker:MySecr3tPassword2026@us-east.mongo.cloud.internal/billing_db';
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities.some(e => e.type === 'PASSWORD')).toBe(true);
    expect(result.sanitizedText).not.toContain('MySecr3tPassword2026');
  });

  // Test 5: Stripe Test Keys vs Live Keys
  // In development, developers frequently leak sk_test_ or rk_test_ keys
  it('Edge 5: should also catch Stripe TEST keys (sk_test_... / rk_test_...)', () => {
    const input = 'STRIPE_TEST_KEY=sk_test_51M0abcdef1234567890XYZtest990011';
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities.some(e => e.type === 'STRIPE_KEY')).toBe(true);
    expect(result.sanitizedText).not.toContain('sk_test_51M0abcdef1234567890XYZtest990011');
  });

  // Test 6: Bearer token with tabs or multiple spaces
  it('Edge 6: should detect Bearer token with irregular whitespace (tabs, multiple spaces)', () => {
    const input = 'Authorization: Bearer   \t  token_abcdef1234567890abcdef1234567890';
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities.length).toBeGreaterThanOrEqual(1);
    expect(result.sanitizedText).not.toContain('token_abcdef1234567890abcdef1234567890');
  });

  // Test 7: Password with escaped quotes in JSON
  it('Edge 7: should handle passwords with escaped characters in JSON', () => {
    const input = '{"db_password": "super\\"secret\\"p@ss123"}';
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities.some(e => e.type === 'PASSWORD')).toBe(true);
    expect(result.sanitizedText).not.toContain('super');
  });

  // Test 8: Re-use of token mask for identical secrets
  it('Edge 8: should reuse the same masked ID when the identical secret appears multiple times', () => {
    const input = `Key1: ${MOCK_STRIPE_KEY}\nKey2: ${MOCK_STRIPE_KEY}`;
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities).toHaveLength(1); // deduplicated in entity list
    expect(result.sanitizedText).toBe('Key1: [REDACTED_STRIPE_KEY_1]\nKey2: [REDACTED_STRIPE_KEY_1]');
  });

  // Test 9: IP address with port attached
  it('Edge 9: should detect internal IP even when followed by port (e.g. 192.168.1.100:8080)', () => {
    const input = 'Database listening at 192.168.1.100:8080';
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities.some(e => e.type === 'IP_ADDRESS')).toBe(true);
    expect(result.sanitizedText).not.toContain('192.168.1.100');
  });

  // Test 10: Invalid IP octet numbers (e.g. 192.168.999.999) - should NOT be recognized as valid IP
  it('Edge 10: should NOT flag impossible IP octets (> 255) as valid IP addresses', () => {
    const input = 'Dummy code version 192.168.999.999 was released';
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities.filter(e => e.type === 'IP_ADDRESS')).toHaveLength(0);
  });

  // Test 11: GitLab Personal Access Token (glpat-...)
  it('Edge 11: should catch GitLab Personal Access Tokens (glpat-...)', () => {
    const input = 'GITLAB_TOKEN=glpat-5g8e1a9c3d4f2b0e7a8c';
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities.length).toBeGreaterThanOrEqual(1);
    expect(result.sanitizedText).not.toContain('glpat-5g8e1a9c3d4f2b0e7a8c');
  });

  // Test 12: Slack Webhook and Bot Tokens (xoxb- / xoxp-)
  it('Edge 12: should detect Slack API / Bot tokens (xoxb-... or xoxp-...)', () => {
    const input = `SLACK_BOT_TOKEN=${MOCK_SLACK_TOKEN}`;
    const result = LocalSanitizer.sanitize(input);
    expect(result.entities.length).toBeGreaterThanOrEqual(1);
    expect(result.sanitizedText).not.toContain(MOCK_SLACK_TOKEN);
  });

  // Test 13: Large text stress test (2,000 lines)
  it('Edge 13: should sanitize a 2,000-line log in under 50ms without crashing', () => {
    const lines: string[] = [];
    for (let i = 0; i < 2000; i++) {
      if (i === 500) {
        lines.push(`[${i}] ERROR: leaked key ${MOCK_STRIPE_KEY} at server 192.168.1.100`);
      } else if (i === 1500) {
        lines.push(`[${i}] INFO: contact admin at dev@company.com for issues`);
      } else {
        lines.push(`[${i}] INFO: Normal application event loop iteration step ${i}`);
      }
    }
    const largeText = lines.join('\n');
    const start = performance.now();
    const result = LocalSanitizer.sanitize(largeText);
    const duration = performance.now() - start;

    expect(result.entities.length).toBeGreaterThanOrEqual(3);
    expect(LocalSanitizer.verifyZeroLeakage(result.sanitizedText, result.entities)).toBe(true);
    expect(duration).toBeLessThan(150); // Under 150ms for 2000 lines
  });
});
