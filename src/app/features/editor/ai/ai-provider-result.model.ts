export type AiProviderMode = 'local' | 'cloud';
export type AiProviderType = 'local' | 'webllm' | 'remote';
export type AiProviderRuntimeType = 'browser-local' | 'webllm' | 'remote';

export interface AiGenerationOptions {
  readonly temperature: number;
  readonly maxTokens: number;
  readonly providerType: AiProviderType;
  readonly webLlmModel: string;
  readonly remoteModel: string;
  readonly webLlmTimeoutMs: number;
  readonly automaticWebLlmTimeoutMs: number;
  readonly allowRemoteFallback: boolean;
  readonly debugLogs: boolean;
}

export interface AiProviderRequest {
  readonly instruction: string;
  readonly contextJson: string;
  readonly systemInstruction: string;
  readonly options: AiGenerationOptions;
}

export interface AiProviderTextResult {
  readonly mode: AiProviderMode;
  readonly providerType: AiProviderRuntimeType;
  readonly modelName: string;
  readonly text: string;
  readonly durationMs?: number;
  readonly usage?: AiProviderUsage;
}

export interface AiProviderUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
  readonly prefillTokensPerSecond?: number;
  readonly decodeTokensPerSecond?: number;
  readonly timeToFirstTokenSeconds?: number;
  readonly endToEndLatencySeconds?: number;
}
