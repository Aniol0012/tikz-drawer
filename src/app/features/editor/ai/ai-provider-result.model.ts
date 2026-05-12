export type AiProviderMode = 'local' | 'cloud';
export type AiProviderType = 'webllm' | 'local' | 'remote';

export interface AiGenerationOptions {
  readonly temperature: number;
  readonly maxTokens: number;
  readonly providerType: AiProviderType;
  readonly webLlmModel: string;
  readonly remoteModel: string;
}

export interface AiProviderRequest {
  readonly instruction: string;
  readonly contextJson: string;
  readonly systemInstruction: string;
  readonly options: AiGenerationOptions;
}

export interface AiProviderTextResult {
  readonly mode: AiProviderMode;
  readonly modelName: string;
  readonly text: string;
}
