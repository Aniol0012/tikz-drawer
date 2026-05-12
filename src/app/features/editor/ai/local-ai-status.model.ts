export type LocalAiLoadState = 'idle' | 'checking-cache' | 'loading' | 'ready' | 'failed' | 'unsupported';

export interface LocalAiStatus {
  readonly supported: boolean;
  readonly enabled: boolean;
  readonly installed: boolean;
  readonly loadingState: LocalAiLoadState;
  readonly modelName: string;
  readonly progress: number;
  readonly progressText: string;
  readonly error: string;
}
