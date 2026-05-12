import { inject, Injectable } from '@angular/core';
import { BrowserLocalAiProvider } from './browser-local-ai.provider';
import { FirebaseAiProvider } from './firebase-ai.provider';
import { WebLlmLocalAiProvider } from './web-llm-local-ai.provider';
import type { AiProviderRequest, AiProviderTextResult } from './ai-provider-result.model';

const WEB_LLM_GENERATION_TIMEOUT_MS = 4500;
const BROWSER_LOCAL_GENERATION_TIMEOUT_MS = 4500;
const CLOUD_GENERATION_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class AiProviderSelectorService {
  private readonly localProvider = inject(WebLlmLocalAiProvider);
  private readonly browserLocalProvider = inject(BrowserLocalAiProvider);
  private readonly firebaseProvider = inject(FirebaseAiProvider);

  readonly localStatus = this.localProvider.status;
  readonly browserLocalSupported = this.browserLocalProvider.supported;

  async generateText(request: AiProviderRequest): Promise<AiProviderTextResult> {
    switch (request.options.providerType) {
      case 'local':
        return await this.generateWithAutomaticLocal(request);
      case 'webllm':
        return await this.generateWithWebLlmFallback(request);
      case 'remote':
        return await this.generateWithCloud(request);
    }
  }

  readonly generateWithCloud = async (request: AiProviderRequest): Promise<AiProviderTextResult> => {
    return await this.withTimeout(this.firebaseProvider.generateText(request), CLOUD_GENERATION_TIMEOUT_MS, 'Firebase AI has timed out.');
  };

  private readonly generateWithWebLlm = async (request: AiProviderRequest): Promise<AiProviderTextResult> => {
    return await this.withTimeout(this.localProvider.generateText(request), WEB_LLM_GENERATION_TIMEOUT_MS, 'WebLLM has timed out.');
  };

  private readonly generateWithBrowserLocal = async (request: AiProviderRequest): Promise<AiProviderTextResult> => {
    return await this.withTimeout(this.browserLocalProvider.generateText(request), BROWSER_LOCAL_GENERATION_TIMEOUT_MS, 'Browser local AI has timed out.');
  };

  private async generateWithAutomaticLocal(request: AiProviderRequest): Promise<AiProviderTextResult> {
    if (this.localProvider.isReady(request.options.webLlmModel)) {
      return await this.generateWithFallback([this.generateWithWebLlm, this.generateWithBrowserLocal, this.generateWithCloud], request);
    }

    if (this.browserLocalSupported()) {
      return await this.generateWithFallback([this.generateWithBrowserLocal, this.generateWithCloud], request);
    }

    return await this.generateWithCloud(request);
  }

  private async generateWithWebLlmFallback(request: AiProviderRequest): Promise<AiProviderTextResult> {
    if (!this.localProvider.isSupported() || !this.localProvider.isReady(request.options.webLlmModel)) {
      return await this.generateWithCloud(request);
    }

    return await this.generateWithFallback([this.generateWithWebLlm, this.generateWithCloud], request);
  }

  private async generateWithFallback(
    providers: readonly ((request: AiProviderRequest) => Promise<AiProviderTextResult>)[],
    request: AiProviderRequest
  ): Promise<AiProviderTextResult> {
    let lastError: unknown = null;

    for (const provider of providers) {
      try {
        return await provider(request);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('No AI provider is available.');
  }

  private async withTimeout<T>(task: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timeoutId = 0;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = globalThis.setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    try {
      return await Promise.race([task, timeout]);
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }
}
