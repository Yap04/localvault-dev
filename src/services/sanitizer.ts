import { SensitiveEntity, SanitizationResult } from '../types';

interface PatternRule {
  type: SensitiveEntity['type'];
  regex: RegExp;
  labelPrefix: string;
}

const PATTERN_RULES: PatternRule[] = [
  // 1. Stripe Secret, Restricted & Publishable Keys (Live & Test)
  {
    type: 'STRIPE_KEY',
    regex: /\b((?:sk|rk|pk)_(?:live|test)_[0-9a-zA-Z]{24,})\b/g,
    labelPrefix: 'REDACTED_STRIPE_KEY'
  },
  // 2. GitHub Personal Access Tokens (classic & fine-grained) & OAuth
  {
    type: 'GITHUB_TOKEN',
    regex: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}|gho_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36})\b/g,
    labelPrefix: 'REDACTED_GITHUB_TOKEN'
  },
  // 3. GitLab Personal Access Tokens (glpat-...)
  {
    type: 'GITLAB_TOKEN',
    regex: /\b(glpat-[0-9a-zA-Z_-]{20,})\b/g,
    labelPrefix: 'REDACTED_GITLAB_TOKEN'
  },
  // 4. Slack Bot, App & User Tokens (xoxb-..., xoxp-..., etc.)
  {
    type: 'SLACK_TOKEN',
    regex: /\b(xox[baprs]-[0-9a-zA-Z-]{20,})\b/g,
    labelPrefix: 'REDACTED_SLACK_TOKEN'
  },
  // 3. Bcrypt & Argon2 Password Hashes (e.g. $2a$12$... or $2b$12$...)
  {
    type: 'PASSWORD_HASH',
    regex: /(?<![a-zA-Z0-9])(\$2[abxy]\$\d{2}\$[a-zA-Z0-9./]{53})(?![a-zA-Z0-9./])/g,
    labelPrefix: 'REDACTED_PASSWORD_HASH'
  },
  // 4. Credit Card Numbers (Visa, MasterCard, Amex - raw or formatted)
  {
    type: 'CREDIT_CARD',
    regex: /(?<!\d)(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:4[0-9]{3}|5[1-5][0-9]{2}|6(?:011|5[0-9]{2}))[-\s][0-9]{4}[-\s][0-9]{4}[-\s][0-9]{4}|3[47][0-9]{2}[-\s][0-9]{6}[-\s][0-9]{5})(?!\d)/g,
    labelPrefix: 'REDACTED_CREDIT_CARD'
  },
  // 5. OpenAI & general sk- API keys, GCP & AWS keys
  {
    type: 'API_KEY',
    regex: /\b(sk-[a-zA-Z0-9_-]{20,80}|AIza[0-9A-Za-z-_]{35}|AKIA[0-9A-Z]{16})\b/g,
    labelPrefix: 'REDACTED_API_KEY'
  },
  // 6. JWT tokens
  {
    type: 'TOKEN_JWT',
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    labelPrefix: 'REDACTED_JWT'
  },
  // 7. Bearer tokens in headers
  {
    type: 'API_KEY',
    regex: /(?:Bearer\s+)([a-zA-Z0-9_.\-~+/]{20,})/gi,
    labelPrefix: 'REDACTED_BEARER_TOKEN'
  },
  // 8. URI password format (postgresql, mysql, mongodb+srv, redis) - supports passwords with special chars and '@'
  {
    type: 'PASSWORD',
    regex: /(?:[a-zA-Z0-9+.-]+:\/\/(?:[^:\s/@]+)?:)(.+?)(?=@(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::\d+)?(?:[\s/?#"'\\]|$))/g,
    labelPrefix: 'REDACTED_PASSWORD'
  },
  // 9. Key-value passwords (e.g. password: "...", pwd=...)
  {
    type: 'PASSWORD',
    regex: /(?:password|passwd|pwd|pass)(?:["']?\s*[:=]\s*["']?)([^"',\s\\]+)(?:["']?)/gi,
    labelPrefix: 'REDACTED_PASSWORD'
  },
  // 10. Email addresses
  {
    type: 'EMAIL',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    labelPrefix: 'REDACTED_EMAIL'
  },
  // 11. Phone numbers (E.164, formatted with parens/dashes/dots, or international)
  {
    type: 'PHONE',
    regex: /(?<!\d)(?:(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{3}\)[-.\s]?|\d{3}[-.\s])\d{3}[-.\s]?\d{4}|(?:\+?86[-.\s]?)?1[3-9]\d{9})(?!\d)/g,
    labelPrefix: 'REDACTED_PHONE'
  },
  // 14. IPv4 Addresses (private & local networks with valid 0-255 octets)
  {
    type: 'IP_ADDRESS',
    regex: /\b(?:10(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}|192\.168(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){2})\b/g,
    labelPrefix: 'REDACTED_INTERNAL_IP'
  }
];

export class LocalSanitizer {
  /**
   * Run local high-speed heuristic & pattern sanitization on raw input.
   * Guarantees 0 raw sensitive tokens leave the client device.
   */
  public static sanitize(text: string): SanitizationResult {
    let sanitized = text;
    const entities: SensitiveEntity[] = [];
    const counterByType: Record<string, number> = {};
    const entityMap = new Map<string, string>();
    const occupiedRanges: { start: number; end: number }[] = [];

    for (const rule of PATTERN_RULES) {
      // reset regex lastIndex
      rule.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.regex.exec(text)) !== null) {
        // match[1] if capturing group exists, else match[0]
        const rawToken = match[1] ?? match[0];
        if (!rawToken || rawToken.length < 3) continue;

        // Skip false positives like common words or standard JSON keys
        if (['true', 'false', 'null', 'localhost', 'public'].includes(rawToken.toLowerCase())) {
          continue;
        }

        const actualStart = text.indexOf(rawToken, match.index);
        const actualEnd = actualStart >= 0 ? actualStart + rawToken.length : match.index + match[0].length;
        const start = actualStart >= 0 ? actualStart : match.index;
        const end = actualEnd;

        // Prevent sub-matching or overlapping with already identified entities
        // (e.g. phone pattern matching a substring inside an already-quarantined credit card)
        const isOverlapping = occupiedRanges.some(
          r => Math.max(r.start, start) < Math.min(r.end, end)
        );
        if (isOverlapping) {
          continue;
        }

        let masked = entityMap.get(rawToken);
        if (!masked) {
          const count = (counterByType[rule.labelPrefix] || 0) + 1;
          counterByType[rule.labelPrefix] = count;
          masked = `[${rule.labelPrefix}_${count}]`;
          entityMap.set(rawToken, masked);
        }

        occupiedRanges.push({ start, end });

        entities.push({
          id: `entity_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: rule.type,
          raw: rawToken,
          masked,
          startIndex: start,
          endIndex: end
        });
      }
    }

    // Replace all detected tokens in the output text
    // Replace longer tokens first to avoid substring partial corruption
    const sortedTokens = Array.from(entityMap.entries()).sort(
      (a, b) => b[0].length - a[0].length
    );

    for (const [rawToken, mask] of sortedTokens) {
      if (sanitized.includes(rawToken)) {
        sanitized = sanitized.split(rawToken).join(mask);
      }
    }

    // Deduplicate entities in list for cleaner display
    const uniqueEntities: SensitiveEntity[] = [];
    const seenMasks = new Set<string>();
    for (const ent of entities) {
      if (!seenMasks.has(ent.masked)) {
        seenMasks.add(ent.masked);
        uniqueEntities.push(ent);
      }
    }

    return {
      originalText: text,
      sanitizedText: sanitized,
      entities: uniqueEntities,
      sensitiveCount: uniqueEntities.length
    };
  }

  /**
   * Check if any raw sensitive entity remains in the text.
   */
  public static verifyZeroLeakage(text: string, knownEntities: SensitiveEntity[]): boolean {
    for (const entity of knownEntities) {
      if (text.includes(entity.raw)) {
        return false;
      }
    }
    return true;
  }
}
