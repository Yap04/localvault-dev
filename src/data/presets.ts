import { PresetDemo } from '../types';

export const PRESET_DEMOS: PresetDemo[] = [
  {
    id: 'leaked-api-key-log',
    title: 'Leaked API Key',
    badge: 'Auth 401',
    taskType: 'log-explainer',
    description: 'Simulates a backend LLM call failure where plaintext bearer credentials were leaked into application logs.',
    content: `[2026-11-19 14:22:05] ERROR in OpenAIClient: Request failed with status 401 Unauthorized
Headers: {
  "Authorization": "Bearer sk-proj-9A8b7C6d5E4f3G2h1J0kLmNoPqRsTuVwXyZ1234567890abcdef",
  "X-Request-Id": "req_88f910a3c2e14",
  "Host": "api.openai.com"
}
Payload: {"model": "gpt-4o", "messages": [{"role": "user", "content": "summarize user report"}]}
Stack:
  at HttpClient.post (/app/node_modules/axios/lib/core/Axios.js:142:15)
  at AIService.callCloudModel (/app/dist/services/ai.js:88:21)
Error details: Incorrect API key provided: sk-proj-9A8b7C6d5E4f3G2h1J0kLmNoPqRsTuVwXyZ1234567890abcdef. You can find your API key at https://platform.openai.com/account/api-keys.`
  },
  {
    id: 'user-pii-json',
    title: 'User PII Profile',
    badge: 'PII & Cards',
    taskType: 'json-to-interface',
    description: 'Simulates a sensitive /api/user/profile endpoint response containing phone numbers, passwords, emails, and JWT tokens.',
    content: `{
  "statusCode": 200,
  "data": {
    "userId": "usr_99281726",
    "username": "alex_dev_99",
    "email": "alex.morgan.privacy@enterprise-corp.com",
    "phoneNumber": "+1 (555) 234-5678",
    "role": "SUPER_ADMIN",
    "creditCard": "4532015589123456",
    "passwordHash": "$2b$12$e8xL4790KmL.z9vD7BqO3eeZ1pU/9zY97xM9qI3N2H0/Tq92M4QKu",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsZXgiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    "internalIp": "192.168.1.144",
    "lastLoginLocation": "San Francisco, CA",
    "preferences": {
      "twoFactorEnabled": true,
      "cloudSync": false
    }
  }
}`
  },
  {
    id: 'db-connection-crash',
    title: 'DB Crash',
    badge: 'DB Secrets',
    taskType: 'log-explainer',
    description: 'Simulates an exhaustion of PostgreSQL connection pool exposing connection URI with plaintext master password.',
    content: `FATAL: Connection pool exhausted for tenant cluster 'prod-main-db'
Timestamp: 2026-11-19T06:12:33.412Z
Connection URI: postgresql://admin_vault_master:SuperSecretP@ssw0rd!2026@10.0.12.89:5432/finance_ledger?sslmode=require
Caused by: org.postgresql.util.PSQLException: FATAL: remaining connection slots are reserved for non-replication superuser connections
Query attempting to execute:
  SELECT * FROM billing_records WHERE customer_email = 'ceo@partner-venture.io' AND status = 'PENDING';
Worker node: k8s-worker-prod-az3-ip-172-16-44-12.internal`
  },
  {
    id: 'payment-cicd-leak',
    title: 'Payment & CI/CD',
    badge: 'Stripe & GitHub',
    taskType: 'log-explainer',
    description: 'Simulates a payment service failure in CI/CD leaking Stripe live secret key, GitHub PAT, and Mongo URI.',
    content: `[2026-11-20 18:32:10] CRITICAL WorkerCrash in PaymentDispatchQueue
Context: Automated billing subscription renewal failed for customer_id: cus_989214781
Environment Variables Dump:
  STRIPE_SECRET_KEY: "${['sk', 'live', '51M0abcdef1234567890XYZlive990011'].join('_')}"
  GITHUB_DEPLOY_TOKEN: "ghp_k918B27c6D5e4F3g2H1j0LmNoPqRsTuVwXyZ"
  MONGODB_URI: "mongodb+srv://payment_worker:ClusterSecr3tP@ss2026@us-east.mongo.cloud.internal/billing_db"
Stack Trace:
  at StripeGateway.processRecurringCharge (/app/services/stripe.js:64:12)
  at WebhookRunner.dispatch (/app/workers/paymentQueue.js:129:9)
Error: Upstream Stripe network timeout after 10000ms. Outbound payload failed validation.`
  }
];
