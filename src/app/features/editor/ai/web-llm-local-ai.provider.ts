import { effect, inject, Injectable, signal } from '@angular/core';
import { CreateMLCEngine, type InitProgressReport, type MLCEngine } from '@mlc-ai/web-llm';
import type { AiProviderRequest, AiProviderTextResult } from './ai-provider-result.model';
import type { LocalAiStatus } from './local-ai-status.model';
import { AiSettingsService, WEB_LLM_MODEL_OPTIONS } from './ai-settings.service';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';

const DEFAULT_WEB_LLM_MODEL = WEB_LLM_MODEL_OPTIONS[0];
const WEB_LLM_STATUS = signal<LocalAiStatus>(initialStatus());
const WEB_LLM_ENGINES = new Map<string, MLCEngine>();
const WEB_LLM_LOADING_PROMISES = new Map<string, Promise<MLCEngine>>();
let preloadStarted = false;

export function preloadWebLlmLocalAi(): void {
  if (preloadStarted || !WEB_LLM_STATUS().supported) {
    return;
  }

  preloadStarted = true;
  void ensureEngine(preloadModelName());
}

@Injectable({ providedIn: 'root' })
export class WebLlmLocalAiProvider {
  private readonly aiSettingsService = inject(AiSettingsService);
  private autoRequestedModel = '';

  readonly mode = 'local' as const;
  readonly modelName = DEFAULT_WEB_LLM_MODEL;
  readonly status = WEB_LLM_STATUS;

  constructor() {
    preloadWebLlmLocalAi();
    effect(() => {
      const modelName = this.aiSettingsService.settings().webLlmModel;
      if (this.status().supported && this.autoRequestedModel !== modelName) {
        this.autoRequestedModel = modelName;
        void ensureEngine(modelName);
      }
    });
  }

  async installLocalModel(): Promise<void> {
    if (!this.status().supported) {
      patchStatus({
        loadingState: 'unsupported',
        error: 'WebGPU is not available in this browser.'
      });
      return;
    }

    await ensureEngine(this.aiSettingsService.settings().webLlmModel);
  }

  async retryLocalModel(): Promise<void> {
    patchStatus({ error: '', progress: 0, progressText: '' });
    await ensureEngine(this.aiSettingsService.settings().webLlmModel);
  }

  async generateText(request: AiProviderRequest): Promise<AiProviderTextResult> {
    const modelName = request.options.webLlmModel;
    if (!this.isSupported()) {
      throw new Error('ai.errorWebLlmUnsupported');
    }

    if (!this.isReady(modelName)) {
      throw new Error('ai.errorWebLlmNotReady');
    }

    const engine = await ensureEngine(modelName);
    const response = await engine.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: `${request.systemInstruction}\nReturn only valid JSON.`
        },
        {
          role: 'user',
          content: request.contextJson
        }
      ],
      max_tokens: request.options.maxTokens,
      temperature: request.options.temperature,
      top_p: 0.82,
      response_format: { type: 'json_object' },
      stream: false
    });

    return {
      mode: this.mode,
      modelName,
      text: response.choices[0]?.message.content ?? ''
    };
  }

  isSupported(): boolean {
    return this.status().supported;
  }

  isReady(modelName: string = DEFAULT_WEB_LLM_MODEL): boolean {
    return WEB_LLM_ENGINES.has(modelName);
  }

  isLoading(modelName: string = DEFAULT_WEB_LLM_MODEL): boolean {
    return WEB_LLM_LOADING_PROMISES.has(modelName);
  }
}

async function ensureEngine(modelName: string): Promise<MLCEngine> {
  const existingEngine = WEB_LLM_ENGINES.get(modelName);
  if (existingEngine) {
    return existingEngine;
  }

  const existingPromise = WEB_LLM_LOADING_PROMISES.get(modelName);
  if (existingPromise) {
    return await existingPromise;
  }

  const loadingPromise = createEngine(modelName);
  WEB_LLM_LOADING_PROMISES.set(modelName, loadingPromise);
  try {
    const engine = await loadingPromise;
    WEB_LLM_ENGINES.set(modelName, engine);
    return engine;
  } finally {
    WEB_LLM_LOADING_PROMISES.delete(modelName);
  }
}

async function createEngine(modelName: string): Promise<MLCEngine> {
  patchStatus({ loadingState: 'loading', modelName, progress: 0, progressText: 'Preparing local model...', error: '' });

  try {
    const engine = await CreateMLCEngine(modelName, {
      initProgressCallback: updateProgress
    });

    patchStatus({
      installed: true,
      loadingState: 'ready',
      modelName,
      progress: 1,
      progressText: 'Local AI ready.',
      error: ''
    });

    return engine;
  } catch (error) {
    patchStatus({
      loadingState: 'failed',
      progressText: '',
      error: error instanceof Error ? error.message : 'Unable to load local AI.'
    });
    throw error;
  }
}

function updateProgress(report: InitProgressReport): void {
  patchStatus({
    loadingState: 'loading',
    progress: report.progress,
    progressText: report.text
  });
}

function initialStatus(): LocalAiStatus {
  const supported = detectWebGpuSupport();
  const modelName = preloadModelName();
  return {
    supported,
    enabled: supported,
    installed: false,
    loadingState: supported ? 'idle' : 'unsupported',
    modelName,
    progress: 0,
    progressText: '',
    error: ''
  };
}

function preloadModelName(): string {
  const storedModel = storedWebLlmModelName();
  return storedModel && WEB_LLM_MODEL_OPTIONS.includes(storedModel as (typeof WEB_LLM_MODEL_OPTIONS)[number]) ? storedModel : DEFAULT_WEB_LLM_MODEL;
}

function storedWebLlmModelName(): string | null {
  try {
    const raw = globalThis.localStorage?.getItem(EDITOR_STORAGE_KEYS.aiSettings);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { readonly webLlmModel?: unknown };
    return typeof parsed.webLlmModel === 'string' ? parsed.webLlmModel : null;
  } catch {
    return null;
  }
}

function detectWebGpuSupport(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

function patchStatus(patch: Partial<LocalAiStatus>): void {
  WEB_LLM_STATUS.update((status) => ({
    ...status,
    ...patch
  }));
}
