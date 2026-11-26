# 🛡️ LocalVault Dev — Local-First Privacy Firewall for Hybrid AI

> Built for the **Google Firebase #BuildHybridAI 2026 Hackathon**  
> *"Cloud provides infinite intelligence; on-device guarantees absolute control and privacy."*

[![Firebase](https://img.shields.io/badge/Firebase-AI%20Logic%20(Web%20v11)-FFA611?style=flat&logo=firebase&logoColor=white)](https://firebase.google.com/docs/ai-logic)
[![Chrome Built-in AI](https://img.shields.io/badge/Chrome-Gemini%20Nano%20(Prompt%20API)-4285F4?style=flat&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/ai/built-in)
[![Cloud Model](https://img.shields.io/badge/Cloud%20LLM-Gemini%203.5%20Flash%20Lite-34A853?style=flat&logo=google&logoColor=white)](https://aistudio.google.com/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Tailwind%20CSS-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

---

## 💡 The Problem
Every day, developers and operations engineers paste crash dumps, stack traces, and API payloads into cloud LLMs to troubleshoot bugs. In doing so, **live API keys, database passwords, JWT bearer tokens, and customer PII (emails, phone numbers, IPs)** are inadvertently transmitted over the internet to remote cloud servers. Once leaked into cloud prompts, credentials become susceptible to logging exposures, compliance breaches (GDPR/HIPAA/SOC2), and lateral network traversal.

## 🚀 The Solution: LocalVault Dev
**LocalVault Dev** is a **Local-First Privacy Firewall and Hybrid AI Debugger**. It establishes an uncompromising security gate right inside the developer's client browser:

1. **Instant On-Device Redaction (<1ms)**: A deterministic on-device regex and heuristic engine captures and quarantines sensitive credentials into memory, replacing them with type-safe scalar tokens (e.g., `[REDACTED_API_KEY_1]`).
2. **On-Device Fast Triage (Chrome Gemini Nano)**: Leverages Chrome's Built-in AI (`LanguageModel` / Prompt API) to analyze logs and generate TypeScript interfaces locally on device with **zero egress network traffic** and **streaming typing output**.
3. **Cloud Deep Reasoning (Firebase AI Logic)**: When deep multi-system root cause analysis is required, the user authorizes transmission. The **0-Leakage Guard** verifies that zero plaintext secrets leave the browser, dispatching sanitized buffers to **Gemini 3.5 Flash Lite** via the official **Firebase AI Logic SDK** (`firebase/ai`).

---

## 🏗️ Architecture & Hybrid AI Pipeline

```
                                      LOCAL MACHINE / BROWSER RUNTIME
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                        │
 │   Raw Developer Logs / JSON                                                            │
 │   (with Bearer Tokens, DB Passwords, PII)                                              │
 │                   │                                                                    │
 │                   ▼                                                                    │
 │   ┌─────────────────────────────────────────────────────────┐                          │
 │   │  On-Device Deterministic Sanitizer (Local Memory)       │                          │
 │   │  • Regex + AST Pattern Heuristics                       │                          │
 │   │  • Quarantines raw secrets locally in client state      │                          │
 │   │  • Replaces secrets with [REDACTED_*] scalar tokens     │                          │
 │   └─────────────────────────┬───────────────────────────────┘                          │
 │                             │                                                          │
 │                             ▼                                                          │
 │   ┌─────────────────────────────────────────────────────────┐                          │
 │   │  On-Device Built-in AI (Chrome Gemini Nano)             │                          │
 │   │  • W3C LanguageModel / Prompt API Standard              │                          │
 │   │  • Background Pre-Warming & Singleton Session Reuse     │                          │
 │   │  • Real-time Streaming Output (Zero network egress)     │                          │
 │   │  • Fallback: 5ms Local AST / Fast Heuristic Engine      │                          │
 │   └─────────────────────────┬───────────────────────────────┘                          │
 │                             │                                                          │
 │                             ▼                                                          │
 │   ┌─────────────────────────────────────────────────────────┐                          │
 │   │  🛡️ 0-Leakage Egress Barrier (Pre-flight Audit)        │                          │
 │   │  • Verifies zero plaintext credentials in egress buffer │                          │
 │   │  • Blocks request if unmasked secrets are detected      │                          │
 │   └─────────────────────────┬───────────────────────────────┘                          │
 └─────────────────────────────┼──────────────────────────────────────────────────────────┘
                               │ Sanitized Buffer ONLY ([REDACTED_*])
                               ▼ (Encrypted HTTPS)
               ┌────────────────────────────────────────────────────────┐
               │              FIREBASE & GOOGLE CLOUD BACKEND           │
               │                                                        │
               │   • Firebase App Check (Debug Attestation Provider)   │
               │   • Firebase AI Logic SDK (`firebase/ai`)              │
               │   • GoogleAIBackend (Spark/Free Plan Compatible)       │
               │   • Google Gemini 3.5 Flash Lite Cloud Inference       │
               │                                                        │
               │   Outputs: Actionable Fixes, Security Advisories,      │
               │            and Defensive Mitigation Code Snippets      │
               └────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

* **⚡ On-Device Chrome Gemini Nano**:
  * Native integration with Chrome's Built-in AI (`LanguageModel` / Prompt API).
  * **Background Pre-Warming**: Automatically instantiates and warms up the local model session on app load, eliminating cold-start latency.
  * **Live Streaming Output**: Token-by-token live typing animation on device.
  * **Dual-Engine Toggle Switch**: Seamlessly switch between `Gemini Nano` and ultra-fast `Fast 5ms` AST rule engine.
* **☁️ Firebase AI Logic SDK Integration**:
  * Uses the official Firebase Web SDK v11 `firebase/ai` (`getAI`, `getGenerativeModel`, `GoogleAIBackend`).
  * Runs on Firebase's Spark (Free) tier with zero billing prerequisites.
  * Employs model `gemini-3.5-flash-lite` for high-throughput cloud reasoning.
* **🛡️ 0-Leakage Pre-flight Security Barrier**:
  * High-risk credentials (OpenAI/Anthropic API keys, JWT tokens, AWS/GCP secrets, DB URIs, Phone numbers, Emails, Internal IPs) are replaced before egress.
  * A second pre-flight gate (`LocalSanitizer.verifyZeroLeakage`) aborts network calls if any raw token is detected.
* **🔁 Resilient Cloud Failover**:
  1. *Primary*: Firebase AI Logic SDK (`firebase/ai`) with App Check attestation.
  2. *Fallback*: Local Demo Fallback Shield for offline/airplane mode with zero disruption.
* **🎨 Linear / Raycast Aesthetic Workbench**:
  * Split-screen interface with instant visual Diff inspection.
  * Interactive "Reveal/Hide Raw Secrets" toggle with container truncation to avoid overflow.
  * Interactive Quarantined Secret Tags: click any quarantined credential tag to smoothly scroll and highlight its live position in the code editor.
  * Real-time Synchronization: editing or deleting secrets in the editor immediately removes ghost tags and updates the safe buffer in `<1ms`.
  * 4 one-click developer scenarios: Leaked API Key Log, User PII JSON, Database Crash Dump, and Payment & CI/CD Leak.

---

## 🧪 Automated Testing Suite (Vitest)

LocalVault Dev is backed by a comprehensive **52-test suite** validating zero-leakage, credential variants, AST data modeling, and multi-tier cloud failover:

```bash
# Run unit tests
npm test
```

```text
 ✓ src/services/__tests__/adversarial_edge_cases.test.ts (13 tests)
 ✓ src/services/__tests__/sanitizer.test.ts (24 tests)
 ✓ src/services/__tests__/aiService.test.ts (15 tests)

 Test Files  3 passed (3)
      Tests  52 passed (52)
```

* **Test Coverage**:
  * **Sanitizer & Anti-False-Alarm (37 tests)**: All 10+ credential types (Stripe, GitHub, GitLab, Slack, AWS, OpenAI, Bcrypt, Credit Cards, JWT, URI passwords, Emails, Phones, IPs), boundary conditions (index 0, EOF, escaped quotes, mixed-case URI schemes), and anti-false-alarm filters (UUIDs, Unix timestamps, software build versions like `192.168.999.999`).
  * **AI Pipeline & Data Engine (15 tests)**: JSON to TypeScript Interface AST generator (nested objects, array primitives, null types, syntax error handling), on-device log triage summarizer, markdown-wrapped JSON extraction, and cloud simulation routing.
  * **0-Leakage Physical Egress Gate**: Mathematical assertion confirming requests are forcibly halted if any unmasked secret is detected in outbound buffers.
  * **Performance & Resilience**: 2,000-line log stress test (<30ms execution) and zero-downtime offline fallback.

---

## 🛠️ Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher (Tested on Node v22)
* **Browser**: Modern Google Chrome (Chrome 128+ or Chrome Canary for Gemini Nano support; works on all standard browsers via automatic fallback)

### Installation
```bash
# Clone repository
git clone https://github.com/Yap04/localvault-dev.git
cd localvault-dev

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## ⚙️ Configuration (.env)

On-device sanitization, Chrome Gemini Nano triage, and the local 5ms fallback run out of the box with zero keys. To enable live **Firebase AI Logic** cloud deep reasoning:

1. Copy `.env.example` to `.env` in the root directory and fill in your Firebase Web App credentials:
```env
VITE_FIREBASE_API_KEY=AIzaSyYourActualApiKeyHere
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=your-recaptcha-enterprise-site-key
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true
```
2. Enable **Firebase AI Logic API** (`firebasevertexai.googleapis.com`) in your Google Cloud Console.

---

## 🧪 Built-in AI (Chrome Gemini Nano) Setup

To activate hardware-accelerated Chrome Gemini Nano on your device:
1. Open Google Chrome.
2. Navigate to `chrome://settings/ai` and toggle **On-device AI** to **On**.
3. Open `http://localhost:5173`. The top navigation badge will automatically illuminate:
   ```text
   ⚡ Gemini Nano [Active]
   ```
4. If your browser does not yet have Built-in AI enabled, LocalVault automatically falls back to the **Fast 5ms Local AST Engine** with zero downtime.

---

## 📄 License
Apache License 2.0. Created for the Google Firebase #BuildHybridAI 2026 Hackathon. See [LICENSE](LICENSE) for details.
