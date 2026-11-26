import { describe, it, expect } from 'vitest';
import { LocalSanitizer } from '../sanitizer';

const MOCK_STRIPE_KEY = ['sk', 'live', '51M0abcdef1234567890XYZlive990011'].join('_');

describe('LocalSanitizer Test Suite', () => {
  // ==========================================
  // Suite 1: Standard Credential & PII Recognition
  // ==========================================
  describe('Suite 1: Standard Credential & PII Recognition', () => {
    it('should detect and redact Stripe live keys', () => {
      const input = `STRIPE_KEY="${MOCK_STRIPE_KEY}"`;
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('STRIPE_KEY');
      expect(result.entities[0].masked).toBe('[REDACTED_STRIPE_KEY_1]');
      expect(result.sanitizedText).toBe('STRIPE_KEY="[REDACTED_STRIPE_KEY_1]"');
    });

    it('should detect and redact GitHub PAT tokens', () => {
      const input = 'GITHUB_TOKEN=ghp_k918B27c6D5e4F3g2H1j0LmNoPqRsTuVwXyZ';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('GITHUB_TOKEN');
      expect(result.sanitizedText).toContain('[REDACTED_GITHUB_TOKEN_1]');
    });

    it('should detect and redact Bcrypt password hashes in JSON', () => {
      const input = '{"passwordHash": "$2b$12$e8xL4790KmL.z9vD7BqO3eeZ1pU/9zY97xM9qI3N2H0/Tq92M4QKu"}';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('PASSWORD_HASH');
      expect(result.sanitizedText).toBe('{"passwordHash": "[REDACTED_PASSWORD_HASH_1]"}');
    });

    it('should detect standard 16-digit credit card', () => {
      const input = 'user_card: 4532015589123456';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('CREDIT_CARD');
      expect(result.sanitizedText).toBe('user_card: [REDACTED_CREDIT_CARD_1]');
    });

    it('should detect OpenAI sk- API keys and AWS access keys', () => {
      const input = 'OPENAI=sk-proj-9A8b7C6d5E4f3G2h1J0kLmNoPqRsTuVwXyZ1234567890abcdef and AWS=AKIAIOSFODNN7EXAMPLE';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.length).toBeGreaterThanOrEqual(2);
      expect(result.sanitizedText).not.toContain('sk-proj-9A8b7C6d5E4f3G2h1J0kLmNoPqRsTuVwXyZ1234567890abcdef');
      expect(result.sanitizedText).not.toContain('AKIAIOSFODNN7EXAMPLE');
    });

    it('should detect JWT tokens', () => {
      const input = 'jwt: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsZXgifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.some(e => e.type === 'TOKEN_JWT')).toBe(true);
      expect(result.sanitizedText).toContain('[REDACTED_JWT_1]');
    });

    it('should detect Bearer tokens in headers', () => {
      const input = 'Authorization: Bearer secret_bearer_token_value_abc1234567890';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.length).toBeGreaterThanOrEqual(1);
      expect(result.sanitizedText).toContain('[REDACTED_BEARER_TOKEN_1]');
    });

    it('should detect private IPv4 addresses', () => {
      const input = 'Server internal IP: 192.168.1.144 and gateway 10.0.0.1';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.filter(e => e.type === 'IP_ADDRESS')).toHaveLength(2);
      expect(result.sanitizedText).not.toContain('192.168.1.144');
      expect(result.sanitizedText).not.toContain('10.0.0.1');
    });

    it('should detect standard email addresses', () => {
      const input = 'Contact lead dev at alex.morgan.privacy@enterprise-corp.com for security';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('EMAIL');
      expect(result.sanitizedText).toBe('Contact lead dev at [REDACTED_EMAIL_1] for security');
    });

    it('should detect standard formatted phone numbers', () => {
      const input = 'Call support at +1 (555) 234-5678 or 555-234-5678';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.filter(e => e.type === 'PHONE').length).toBeGreaterThanOrEqual(1);
      expect(result.sanitizedText).not.toContain('+1 (555) 234-5678');
    });
  });

  // ==========================================
  // Suite 2: Format Variations & Complex Delimiters
  // ==========================================
  describe('Suite 2: Format Variations & Complex Delimiters', () => {
    it('should detect credit cards with spaces or hyphens', () => {
      const input = 'Card A: 4532 0155 8912 3456, Card B: 4532-0155-8912-3456';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.filter(e => e.type === 'CREDIT_CARD')).toHaveLength(2);
      expect(result.sanitizedText).not.toContain('4532 0155 8912 3456');
      expect(result.sanitizedText).not.toContain('4532-0155-8912-3456');
    });

    it('should detect full database password with @ and special chars in URI', () => {
      const input = 'mongodb+srv://worker:ClusterSecr3tP@ss2026@us-east.mongo.cloud.internal/billing_db';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('PASSWORD');
      expect(result.entities[0].raw).toBe('ClusterSecr3tP@ss2026');
      expect(result.sanitizedText).toBe('mongodb+srv://worker:[REDACTED_PASSWORD_1]@us-east.mongo.cloud.internal/billing_db');
    });

    it('should detect PostgreSQL URI password and internal IP simultaneously', () => {
      const input = 'postgresql://admin:SuperSecretP@ssw0rd!2026@10.0.12.89:5432/finance_ledger';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.some(e => e.type === 'PASSWORD')).toBe(true);
      expect(result.entities.some(e => e.type === 'IP_ADDRESS')).toBe(true);
      expect(result.sanitizedText).toContain('[REDACTED_PASSWORD_1]');
      expect(result.sanitizedText).toContain('[REDACTED_INTERNAL_IP_1]');
    });

    it('should detect password in Redis URI without username', () => {
      const input = 'redis://:my_p@ss_redis_123@10.0.1.5:6379/0';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.some(e => e.type === 'PASSWORD')).toBe(true);
      expect(result.sanitizedText).not.toContain('my_p@ss_redis_123');
    });
  });

  // ==========================================
  // Suite 3: False-Positive & Overlap Collision Defense (Anti-False-Alarm)
  // ==========================================
  describe('Suite 3: False-Positive & Overlap Collision Defense', () => {
    it('should NOT misclassify 16-digit credit card as phone number', () => {
      const input = '{"creditCard": "4532015589123456"}';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].type).toBe('CREDIT_CARD');
      expect(result.entities.some(e => e.type === 'PHONE')).toBe(false);
    });

    it('should NOT misclassify MongoDB URI host as an email address', () => {
      const input = 'mongodb+srv://payment_worker:ClusterSecr3tP@ss2026@us-east.mongo.cloud.internal/billing_db';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities.some(e => e.type === 'EMAIL')).toBe(false);
    });

    it('should NOT flag Unix timestamps as credit cards or phone numbers', () => {
      const input = 'event_time: 1716239022000, updated_at: 1716239022550';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(0);
      expect(result.sanitizedText).toBe(input);
    });

    it('should NOT flag UUIDs as sensitive tokens', () => {
      const input = 'requestId: "c8f1e6a0-4b21-4f9e-9b5a-1a2b3c4d5e6f"';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(0);
      expect(result.sanitizedText).toBe(input);
    });

    it('should ignore common programming keywords like true, false, null, localhost', () => {
      const input = '{"debug": false, "active": true, "extra": null, "host": "localhost"}';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(0);
    });

    it('should NOT flag normal variable names as secrets', () => {
      const input = 'const api_key_length = 32; function verify_password_hash() {}';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(0);
    });

    it('should NOT flag public IP addresses as internal IPs', () => {
      const input = 'Public DNS: 8.8.8.8 and Cloudflare: 1.1.1.1';
      const result = LocalSanitizer.sanitize(input);
      expect(result.entities).toHaveLength(0);
    });
  });

  // ==========================================
  // Suite 4: 0-Leakage Egress Verification
  // ==========================================
  describe('Suite 4: 0-Leakage Egress Verification', () => {
    it('verifyZeroLeakage should return false on raw secret text', () => {
      const raw = `User key is ${MOCK_STRIPE_KEY}`;
      const result = LocalSanitizer.sanitize(raw);
      expect(LocalSanitizer.verifyZeroLeakage(raw, result.entities)).toBe(false);
    });

    it('verifyZeroLeakage should return true on sanitized text', () => {
      const raw = `User key is ${MOCK_STRIPE_KEY} and email alex@enterprise.com`;
      const result = LocalSanitizer.sanitize(raw);
      expect(LocalSanitizer.verifyZeroLeakage(result.sanitizedText, result.entities)).toBe(true);
    });

    it('should guarantee valid JSON output structure after sanitizing JSON', () => {
      const jsonRaw = JSON.stringify({
        user: 'alex_99',
        card: '4532015589123456',
        token: MOCK_STRIPE_KEY,
        email: 'alex@enterprise.com'
      }, null, 2);

      const result = LocalSanitizer.sanitize(jsonRaw);
      expect(LocalSanitizer.verifyZeroLeakage(result.sanitizedText, result.entities)).toBe(true);
      // Ensure sanitized text is still syntactically valid JSON
      expect(() => JSON.parse(result.sanitizedText)).not.toThrow();
      const parsed = JSON.parse(result.sanitizedText);
      expect(parsed.card).toBe('[REDACTED_CREDIT_CARD_1]');
      expect(parsed.token).toBe('[REDACTED_STRIPE_KEY_1]');
      expect(parsed.email).toBe('[REDACTED_EMAIL_1]');
    });
  });
});
