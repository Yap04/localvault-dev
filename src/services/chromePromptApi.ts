import { NanoCapabilities } from '../types';

export class ChromePromptApi {
  private static warmSession: any = null;
  private static isPrewarming = false;

  /**
   * Check if Chrome Built-in AI (Gemini Nano) is available in current browser
   */
  public static async checkCapabilities(): Promise<NanoCapabilities> {
    if (typeof window === 'undefined') {
      return { supported: false, status: 'unsupported-browser', details: 'Non-browser environment' };
    }

    try {
      // Check window.ai.languageModel (Chrome Prompt API standard spec) or global LanguageModel (W3C spec)
      const ai = (window as any).ai;
      const LM = (window as any).LanguageModel || ai?.languageModel;

      if (LM) {
        let available = 'no';
        if (typeof LM.availability === 'function') {
          try {
            available = await LM.availability({
              expectedOutputs: [{ type: 'text', languages: ['en'] }],
              expectedInputs: [{ type: 'text', languages: ['en'] }]
            });
          } catch {
            available = await LM.availability();
          }
        } else if (typeof LM.capabilities === 'function') {
          const capabilities = await LM.capabilities();
          available = capabilities?.available;
        }

        const isReady = available === 'readily' || available === 'available';
        const isDownloading = available === 'after-download' || available === 'downloadable' || available === 'downloading';

        if (isReady) {
          return { supported: true, status: 'readily', details: 'Gemini Nano is ready for on-device zero-latency triage.' };
        } else if (isDownloading) {
          return { supported: true, status: 'after-download', details: 'Gemini Nano model download in progress.' };
        } else {
          return { supported: false, status: 'no', details: 'Gemini Nano is unavailable or disabled in chrome://settings/ai.' };
        }
      }

      // Legacy window.model or early canary trial checks
      if ((window as any).model) {
        return { supported: true, status: 'readily', details: 'Chrome Experimental Model API is ready.' };
      }

      return {
        supported: false,
        status: 'unsupported-browser',
        details: 'Built-in AI API not detected. Falling back to local deterministic rule engine.'
      };
    } catch (err: any) {
      return {
        supported: false,
        status: 'no',
        details: `Failed to check on-device model capabilities: ${err?.message || err}`
      };
    }
  }

  /**
   * Pre-warm Gemini Nano Session in background (singleton session resident in memory)
   */
  public static async prewarm(): Promise<void> {
    if (this.warmSession || this.isPrewarming) return;
    this.isPrewarming = true;

    try {
      const cap = await this.checkCapabilities();
      if (!cap.supported || cap.status !== 'readily') {
        this.isPrewarming = false;
        return;
      }

      const ai = (window as any).ai;
      const LM = (window as any).LanguageModel || ai?.languageModel;
      if (!LM) return;

      console.log('[ChromePromptApi] ⚡ Pre-warming Gemini Nano resident session in memory...');
      this.warmSession = await this.createSessionInstance(LM);
      console.log('[ChromePromptApi] ✅ Gemini Nano session pre-warmed! Subsequent calls will have 0 cold start.');
    } catch (e) {
      console.warn('[ChromePromptApi] Pre-warm notice (fallback to on-demand creation):', e);
    } finally {
      this.isPrewarming = false;
    }
  }

  /**
   * Helper: Create single session instance
   */
  private static async createSessionInstance(LM: any, systemPrompt?: string): Promise<any> {
    const sysPrompt = systemPrompt || 'You are an on-device privacy-first developer assistant.';
    try {
      return await LM.create({
        systemPrompt: sysPrompt,
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        outputLanguage: 'en',
        expectedOutputLanguages: ['en'],
        temperature: 0.2,
        topK: 3
      });
    } catch {
      try {
        return await LM.create({
          systemPrompt: sysPrompt,
          expectedOutputs: [{ type: 'text', languages: ['en'] }]
        });
      } catch {
        try {
          return await LM.create({ systemPrompt: sysPrompt, outputLanguage: 'en' });
        } catch {
          try {
            return await LM.create({ systemPrompt: sysPrompt });
          } catch {
            return await LM.create();
          }
        }
      }
    }
  }

  /**
   * Acquire or reuse resident singleton session
   */
  public static async getOrCreateSession(systemPrompt?: string): Promise<any> {
    const ai = (window as any).ai;
    const LM = (window as any).LanguageModel || ai?.languageModel;
    if (!LM) throw new Error('LanguageModel is unavailable');

    if (!this.warmSession) {
      this.warmSession = await this.createSessionInstance(LM, systemPrompt);
    }
    return this.warmSession;
  }

  /**
   * Stream output chunks using promptStreaming with fallback to prompt
   */
  public static async promptStreaming(
    userPrompt: string,
    systemPrompt?: string,
    onChunk?: (text: string) => void
  ): Promise<string> {
    const ai = (window as any).ai;
    const LM = (window as any).LanguageModel || ai?.languageModel;
    if (!LM) throw new Error('Gemini Nano Prompt API is unavailable');

    let session = await this.getOrCreateSession(systemPrompt);

    try {
      if (typeof session.promptStreaming === 'function') {
        const stream = session.promptStreaming(userPrompt);
        let fullText = '';
        for await (const chunk of stream) {
          if (typeof chunk === 'string') {
            if (chunk.startsWith(fullText)) {
              fullText = chunk; // cumulative stream
            } else {
              fullText += chunk; // delta stream
            }
            onChunk?.(fullText);
          }
        }
        if (fullText) return fullText;
      }
    } catch (streamErr) {
      console.warn('[ChromePromptApi] Streaming notice, falling back to standard prompt:', streamErr);
      this.warmSession = null; // reset if session crashed
    }

    // Standard prompt fallback
    session = await this.getOrCreateSession(systemPrompt);
    const result = await session.prompt(userPrompt);
    onChunk?.(result);
    return result;
  }

  /**
   * Run local inference with Gemini Nano (Single output)
   */
  public static async prompt(userPrompt: string, systemPrompt?: string): Promise<string> {
    return this.promptStreaming(userPrompt, systemPrompt);
  }
}
