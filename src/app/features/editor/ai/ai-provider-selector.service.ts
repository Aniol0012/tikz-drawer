import { inject, Injectable } from '@angular/core';
import { BrowserLocalAiProvider } from './browser-local-ai.provider';
import { FirebaseAiProvider } from './firebase-ai.provider';
import { WebLlmLocalAiProvider } from './web-llm-local-ai.provider';
import type { AiProviderRequest, AiProviderTextResult } from './ai-provider-result.model';

const BROWSER_LOCAL_GENERATION_TIMEOUT_MS = 30000;
const CLOUD_GENERATION_TIMEOUT_MS = 30000;

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
    this.log('remote:start', { model: request.options.remoteModel });
    return await this.timeProvider(this.withTimeout(this.firebaseProvider.generateText(request), CLOUD_GENERATION_TIMEOUT_MS, 'ai.errorFirebaseTimeout'));
  };

  private readonly generateWithWebLlm = async (request: AiProviderRequest, timeoutMs = request.options.webLlmTimeoutMs): Promise<AiProviderTextResult> => {
    this.log('webllm:start', { model: request.options.webLlmModel, timeoutMs });
    return await this.timeProvider(this.localProvider.generateText(request, timeoutMs));
  };

  private readonly generateWithBrowserLocal = async (request: AiProviderRequest): Promise<AiProviderTextResult> => {
    this.log('browser-local:start', { timeoutMs: BROWSER_LOCAL_GENERATION_TIMEOUT_MS });
    return await this.timeProvider(
      this.withTimeout(this.browserLocalProvider.generateText(request), BROWSER_LOCAL_GENERATION_TIMEOUT_MS, 'ai.errorBrowserLocalTimeout')
    );
  };

  private async generateWithAutomaticLocal(request: AiProviderRequest): Promise<AiProviderTextResult> {
    if (this.localProvider.isSupported()) {
      const providers = [
        (providerRequest: AiProviderRequest) => this.generateWithWebLlm(providerRequest, providerRequest.options.automaticWebLlmTimeoutMs),
        this.generateWithBrowserLocal,
        ...(request.options.allowRemoteFallback ? [this.generateWithCloud] : [])
      ];
      return await this.generateWithFallback(providers, request);
    }

    if (this.browserLocalSupported()) {
      return await this.generateWithFallback(
        [this.generateWithBrowserLocal, ...(request.options.allowRemoteFallback ? [this.generateWithCloud] : [])],
        request
      );
    }

    if (request.options.allowRemoteFallback) {
      return await this.generateWithCloud(request);
    }

    throw new Error('ai.errorLocalUnavailableNoFallback');
  }

  private async generateWithWebLlmFallback(request: AiProviderRequest): Promise<AiProviderTextResult> {
    if (!this.localProvider.isSupported()) {
      if (request.options.allowRemoteFallback) {
        return await this.generateWithCloud(request);
      }

      throw new Error('ai.errorWebLlmUnsupported');
    }

    return await this.generateWithFallback([this.generateWithWebLlm, ...(request.options.allowRemoteFallback ? [this.generateWithCloud] : [])], request);
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
        this.log('provider:failed', { error: error instanceof Error ? error.message : String(error) });
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

  private async timeProvider(task: Promise<AiProviderTextResult>): Promise<AiProviderTextResult> {
    const startedAt = performance.now();
    const result = await task;
    const durationMs = Math.round(performance.now() - startedAt);
    this.log('provider:done', { runtime: result.providerType, model: result.modelName, durationMs });
    return {
      ...result,
      durationMs
    };
  }

  private log(event: string, details: Record<string, unknown>): void {
    console.info('[Tikz Drawer AI]', event, details);
  }
}
