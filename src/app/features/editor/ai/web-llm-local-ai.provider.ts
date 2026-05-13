import { effect, inject, Injectable, signal } from '@angular/core';
import { CreateWebWorkerMLCEngine, prebuiltAppConfig, type InitProgressReport, type MLCEngineInterface } from '@mlc-ai/web-llm';
import type { AiProviderRequest, AiProviderTextResult } from './ai-provider-result.model';
import type { LocalAiStatus } from './local-ai-status.model';
import { AiSettingsService, WEB_LLM_MODEL_OPTIONS } from './ai-settings.service';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';

const DEFAULT_WEB_LLM_MODEL = WEB_LLM_MODEL_OPTIONS[0];
const WEB_LLM_MAX_OUTPUT_TOKENS = 220;
const WEB_LLM_MAX_CONTEXT_ELEMENTS = 24;
const WEB_LLM_STATUS = signal<LocalAiStatus>(initialStatus());
const WEB_LLM_ENGINES = new Map<string, MLCEngineInterface>();
const WEB_LLM_LOADING_PROMISES = new Map<string, Promise<MLCEngineInterface>>();
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

    const engine = await ensureEngine(modelName);
    const response = await engine.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: localSystemInstruction()
        },
        {
          role: 'user',
          content: compactPromptPayload(request)
        }
      ],
      max_tokens: Math.min(request.options.maxTokens, WEB_LLM_MAX_OUTPUT_TOKENS),
      temperature: request.options.temperature,
      top_p: 0.82,
      repetition_penalty: 1.05,
      extra_body: {
        enable_latency_breakdown: true
      },
      stream: false
    });

    return {
      mode: this.mode,
      providerType: 'webllm',
      modelName,
      text: response.choices[0]?.message.content ?? '',
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        prefillTokensPerSecond: response.usage?.extra?.prefill_tokens_per_s,
        decodeTokensPerSecond: response.usage?.extra?.decode_tokens_per_s,
        timeToFirstTokenSeconds: response.usage?.extra?.time_to_first_token_s,
        endToEndLatencySeconds: response.usage?.extra?.e2e_latency_s
      }
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

function localSystemInstruction(): string {
  return [
    'Eres el asistente de Tikz Drawer.',
    'Devuelve solo JSON valido, sin markdown.',
    'Formato: {"type":"message"|"scenePatch"|"tikzCode","message":"...","patch":{...},"tikzCode":"..."}',
    'Para charla usa type="message" y 1 frase.',
    'Para dibujar o editar usa scenePatch con pocos elementos claros.',
    'Tipos permitidos: rectangle, circle, ellipse, line, text, triangle.',
    'El usuario previsualiza y aplica manualmente los cambios.'
  ].join('\n');
}

function compactPromptPayload(request: AiProviderRequest): string {
  try {
    const payload = JSON.parse(request.contextJson) as WebLlmPromptPayload;
    const elements = payload.context?.elements ?? [];
    return JSON.stringify({
      instruction: payload.instruction ?? request.instruction,
      now: payload.now,
      scene: {
        name: payload.context?.sceneName,
        selected: payload.context?.selectedElementIds ?? [],
        elements: elements.slice(0, WEB_LLM_MAX_CONTEXT_ELEMENTS).map(compactElement)
      },
      conversation: (payload.conversation ?? []).slice(-4)
    });
  } catch {
    return request.contextJson;
  }
}

function compactElement(element: WebLlmPromptElement): WebLlmPromptElement {
  return {
    id: element.id,
    name: element.name,
    kind: element.kind,
    locked: element.locked,
    geometry: element.geometry,
    style: element.style,
    text: element.text
  };
}

async function ensureEngine(modelName: string): Promise<MLCEngineInterface> {
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

async function createEngine(modelName: string): Promise<MLCEngineInterface> {
  patchStatus({ loadingState: 'loading', modelName, progress: 0, progressText: 'Preparing local model...', error: '' });

  try {
    const engine = await CreateWebWorkerMLCEngine(new Worker(new URL('./web-llm.worker', import.meta.url), { type: 'module' }), modelName, {
      appConfig: { ...prebuiltAppConfig, cacheBackend: 'indexeddb' },
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

interface WebLlmPromptPayload {
  readonly instruction?: string;
  readonly now?: unknown;
  readonly context?: {
    readonly sceneName?: string;
    readonly selectedElementIds?: readonly string[];
    readonly elements?: readonly WebLlmPromptElement[];
  };
  readonly conversation?: readonly { readonly role: string; readonly text: string }[];
}

interface WebLlmPromptElement {
  readonly id?: string;
  readonly name?: string;
  readonly kind?: string;
  readonly locked?: boolean;
  readonly geometry?: unknown;
  readonly style?: unknown;
  readonly text?: string;
}
