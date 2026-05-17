import { inject, Injectable } from '@angular/core';
import { BrowserLocalAiProvider } from './browser-local-ai.provider';
import { FirebaseAiProvider } from './firebase-ai.provider';
import { WebLlmLocalAiProvider } from './web-llm-local-ai.provider';
import type { AiProviderRequest, AiProviderTextResult } from './ai-provider-result.model';
import { aiDebugLoggingEnabled } from './ai-debug-logging';

const BROWSER_LOCAL_GENERATION_TIMEOUT_MS = 30000;
const CLOUD_GENERATION_TIMEOUT_MS = 30000;
const NO_PROVIDER_AVAILABLE_ERROR_KEY = 'ai.errorNoAiProviderAvailable';
const REMOTE_UNAVAILABLE_ERROR_KEY = 'ai.errorRemoteUnavailableFallback';

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
    try {
      return await this.timeProvider(this.withTimeout(this.firebaseProvider.generateText(request), CLOUD_GENERATION_TIMEOUT_MS, 'ai.errorFirebaseTimeout'));
    } catch (error) {
      if (this.isCloudConfigurationError(error)) {
        throw new Error(REMOTE_UNAVAILABLE_ERROR_KEY);
      }

      throw error;
    }
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
    const providers = this.automaticProviders(request);
    if (providers.length) {
      return await this.generateWithFallback(providers, request);
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

    if (request.options.allowRemoteFallback && this.isRemoteUnavailableError(lastError)) {
      throw new Error(NO_PROVIDER_AVAILABLE_ERROR_KEY);
    }

    throw lastError instanceof Error ? lastError : new Error(NO_PROVIDER_AVAILABLE_ERROR_KEY);
  }

  private automaticProviders(request: AiProviderRequest): readonly ((request: AiProviderRequest) => Promise<AiProviderTextResult>)[] {
    const providers: ((request: AiProviderRequest) => Promise<AiProviderTextResult>)[] = [];
    const webLlmModel = request.options.webLlmModel;

    if (this.localProvider.isSupported()) {
      if (this.localProvider.isReady(webLlmModel)) {
        providers.push((providerRequest) => this.generateWithWebLlm(providerRequest, providerRequest.options.automaticWebLlmTimeoutMs));
      } else {
        this.log('webllm:deferred', {
          model: webLlmModel,
          loading: this.localProvider.isLoading(webLlmModel),
          reason: 'WebLLM is still preparing; this request can use the next available provider.'
        });
      }
    }

    if (this.browserLocalSupported()) {
      providers.push(this.generateWithBrowserLocal);
    }

    if (request.options.allowRemoteFallback) {
      providers.push(this.generateWithCloud);
    }

    return providers;
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
    if (!aiDebugLoggingEnabled()) {
      return;
    }

    console.info('[Tikz Drawer AI]', event, details);
  }

  private isRemoteUnavailableError(error: unknown): boolean {
    return error instanceof Error && (error.message === REMOTE_UNAVAILABLE_ERROR_KEY || error.message === 'ai.errorFirebaseTimeout');
  }

  private isCloudConfigurationError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return ['billing', 'quota', 'resource_exhausted', 'permission_denied', 'model', 'not found', 'not_found', '404', '429', 'api key', 'disabled'].some(
      (token) => message.includes(token)
    );
  }
}
