export type TaskType = 'log-explainer' | 'json-to-interface' | 'quick-scratchpad';

export type EngineType = 'on-device' | 'cloud' | 'heuristic-local';

export interface SensitiveEntity {
  id: string;
  type:
    | 'API_KEY'
    | 'EMAIL'
    | 'PASSWORD'
    | 'TOKEN_JWT'
    | 'IP_ADDRESS'
    | 'PHONE'
    | 'CUSTOM_PII'
    | 'STRIPE_KEY'
    | 'GITHUB_TOKEN'
    | 'GITLAB_TOKEN'
    | 'SLACK_TOKEN'
    | 'PASSWORD_HASH'
    | 'CREDIT_CARD';
  raw: string;
  masked: string;
  startIndex: number;
  endIndex: number;
}

export interface SanitizationResult {
  originalText: string;
  sanitizedText: string;
  entities: SensitiveEntity[];
  sensitiveCount: number;
}

export interface LocalTaskResult {
  sanitizedText: string;
  localExplanation?: string;
  tsInterface?: string;
  engine: EngineType;
  modelName: string;
  executionTimeMs: number;
  entities: SensitiveEntity[];
}

export interface CloudAnalysisResult {
  rootCause: string;
  fixSuggestions: string[];
  securityAdvisory?: string;
  codeSnippet?: string;
  engine: EngineType;
  modelName: string;
  executionTimeMs: number;
}

export interface PresetDemo {
  id: string;
  title: string;
  badge: string;
  taskType: TaskType;
  description: string;
  content: string;
}

export interface NanoCapabilities {
  supported: boolean;
  status: 'readily' | 'after-download' | 'no' | 'unsupported-browser';
  details?: string;
}
