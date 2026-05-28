import { effect, inject, Injectable, signal } from '@angular/core';
import {
  CreateWebWorkerMLCEngine,
  prebuiltAppConfig,
  type ChatCompletionChunk,
  type CompletionUsage,
  type InitProgressReport,
  type MLCEngineInterface
} from '@mlc-ai/web-llm';
import type { AiProviderRequest, AiProviderTextResult, AiProviderUsage } from './ai-provider-result.model';
import type { LocalAiStatus } from './local-ai-status.model';
import { AiSettingsService, WEB_LLM_MODEL_OPTIONS } from './ai-settings.service';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';
import { aiDebugLoggingEnabled } from './ai-debug-logging';

const DEFAULT_WEB_LLM_MODEL = WEB_LLM_MODEL_OPTIONS[0];
const WEB_LLM_MAX_OUTPUT_TOKENS = 384;
const WEB_LLM_MAX_CONTEXT_ELEMENTS = 4;
const WEB_LLM_ABORT_ERROR_KEY = 'ai.errorGenerationStopped';
const WEB_LLM_STATUS = signal<LocalAiStatus>(initialStatus());
const WEB_LLM_ENGINES = new Map<string, MLCEngineInterface>();
const WEB_LLM_LOADING_PROMISES = new Map<string, Promise<MLCEngineInterface>>();
let preloadStarted = false;

export function preloadWebLlmLocalAi(): void {
  if (preloadStarted || !WEB_LLM_STATUS().supported) {
    return;
  }

  preloadStarted = true;
  void ensureEngine(preloadModelName()).catch((error) => logWebLlm('preload:failed', { error: errorMessage(error) }));
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
        void ensureEngine(modelName).catch((error) => logWebLlm('settings-preload:failed', { error: errorMessage(error) }));
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

  async generateText(request: AiProviderRequest, timeoutMs = request.options.webLlmTimeoutMs): Promise<AiProviderTextResult> {
    const modelName = request.options.webLlmModel;
    if (!this.isSupported()) {
      throw new Error('ai.errorWebLlmUnsupported');
    }

    const engine = await ensureEngine(modelName);
    const generated = await generateWithInterruptingTimeout(engine, request, timeoutMs, request.abortSignal);

    return {
      mode: this.mode,
      providerType: 'webllm',
      modelName,
      text: generated.text,
      usage: generated.usage
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

async function generateWithInterruptingTimeout(
  engine: MLCEngineInterface,
  request: AiProviderRequest,
  timeoutMs: number,
  abortSignal: AbortSignal | undefined
): Promise<{ readonly text: string; readonly usage?: AiProviderUsage }> {
  let timedOut = false;
  let aborted = false;
  let timeoutId = 0;
  const abortHandler = () => {
    aborted = true;
    logWebLlm('generate:abort-interrupt', {});
    void engine.interruptGenerate();
    void engine.resetChat();
  };
  const startedAt = performance.now();
  if (abortSignal?.aborted) {
    abortHandler();
    throw new Error(WEB_LLM_ABORT_ERROR_KEY);
  }
  abortSignal?.addEventListener('abort', abortHandler, { once: true });
  const generation = generateStreamingResponse(engine, request).then((result) => {
    if (aborted) {
      throw new Error(WEB_LLM_ABORT_ERROR_KEY);
    }

    logWebLlm('generate:done', {
      durationMs: Math.round(performance.now() - startedAt),
      chars: result.text.length,
      tokens: result.usage?.totalTokens,
      preview: result.text.slice(0, 500)
    });
    return result;
  });
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      timedOut = true;
      logWebLlm('generate:timeout-interrupt', { timeoutMs });
      void engine.interruptGenerate();
      void engine.resetChat();
      reject(new Error('ai.errorWebLlmTimeout'));
    }, timeoutMs);
  });
  const abort = new Promise<never>((_, reject) => {
    abortSignal?.addEventListener('abort', () => reject(new Error(WEB_LLM_ABORT_ERROR_KEY)), { once: true });
  });

  try {
    return await Promise.race([generation, timeout, abort]);
  } finally {
    globalThis.clearTimeout(timeoutId);
    abortSignal?.removeEventListener('abort', abortHandler);
    if (timedOut || aborted) {
      generation.catch((error) => logWebLlm('generate:interrupted', { error: error instanceof Error ? error.message : String(error) }));
    }
  }
}

async function generateStreamingResponse(
  engine: MLCEngineInterface,
  request: AiProviderRequest
): Promise<{ readonly text: string; readonly usage?: AiProviderUsage }> {
  const prompt = compactPromptPayload(request);
  const maxTokens = Math.min(request.options.maxTokens, WEB_LLM_MAX_OUTPUT_TOKENS);
  logWebLlm('generate:start', {
    model: request.options.webLlmModel,
    maxTokens,
    promptChars: prompt.length
  });

  const chunks = await engine.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: localSystemInstruction(request)
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: maxTokens,
    temperature: request.options.temperature,
    top_p: 0.8,
    repetition_penalty: 1.03,
    extra_body: {
      enable_latency_breakdown: true
    },
    stream: true,
    stream_options: { include_usage: true }
  });

  let text = '';
  const startedAt = performance.now();
  let firstTokenMs = 0;
  let usage: AiProviderUsage | undefined;
  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta.content ?? '';
    if (delta && !firstTokenMs) {
      firstTokenMs = Math.round(performance.now() - startedAt);
      logWebLlm('generate:first-token', { elapsedMs: firstTokenMs });
    }
    text += delta;
    usage = usageFromChunk(chunk) ?? usage;
  }

  const finalText = text.trim() || (await engine.getMessage()).trim();
  return { text: finalText, usage };
}

function usageFromChunk(chunk: ChatCompletionChunk): AiProviderUsage | undefined {
  return chunk.usage ? usageFromCompletionUsage(chunk.usage) : undefined;
}

function usageFromCompletionUsage(usage: CompletionUsage): AiProviderUsage {
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    prefillTokensPerSecond: usage.extra?.prefill_tokens_per_s,
    decodeTokensPerSecond: usage.extra?.decode_tokens_per_s,
    timeToFirstTokenSeconds: usage.extra?.time_to_first_token_s,
    endToEndLatencySeconds: usage.extra?.e2e_latency_s
  };
}

function localSystemInstruction(request: AiProviderRequest): string {
  const localized = webLlmPromptPayload(request)?.language?.webLlm?.systemInstruction;
  if (typeof localized === 'string' && localized.trim()) {
    return localized
      .split('|')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n');
  }

  return [
    'Eres el asistente de Tikz Drawer.',
    'Devuelve un unico JSON valido, sin markdown ni texto extra.',
    'Para mensajes usa campos type=message y message con una frase real.',
    'Para cambios usa type=scenePatch, message breve y patch con create/update/remove.',
    'Charla o preguntas: type="message", una frase, segunda persona. Nunca digas "el usuario puede".',
    'Crear: usa patch.create solo si el usuario pide crear o dibujar.',
    'Editar: usa patch.update con IDs existentes; no crees rectangulos para editar.',
    'Tipos: rectangle, circle, ellipse, line, text, triangle. Numeros cortos.'
  ].join('\n');
}

function compactPromptPayload(request: AiProviderRequest): string {
  try {
    const payload = JSON.parse(request.contextJson) as WebLlmPromptPayload;
    const labels = promptLabels(payload);
    const selectedIds = payload.context?.selectedElementIds ?? [];
    const elements = promptElementsForPayload(payload.context?.elements ?? [], selectedIds);
    return [
      `${labels.taskLabel}: ${payload.instruction ?? request.instruction}`,
      `${labels.selectionLabel}: ${selectedIds.join(', ') || labels.noneLabel}`,
      `${labels.elementsLabel}:`,
      ...(elements.length ? elements.map(formatPromptElement) : [`- ${labels.noneLabel}`]),
      labels.answerInstruction
    ].join('\n');
  } catch {
    return request.contextJson;
  }
}

function webLlmPromptPayload(request: AiProviderRequest): WebLlmPromptPayload | null {
  try {
    return JSON.parse(request.contextJson) as WebLlmPromptPayload;
  } catch {
    return null;
  }
}

function promptLabels(payload: WebLlmPromptPayload): WebLlmPromptLabels {
  const webLlm = payload.language?.webLlm;
  return {
    taskLabel: webLlm?.taskLabel?.trim() || 'TAREA',
    selectionLabel: webLlm?.selectionLabel?.trim() || 'SELECCION',
    elementsLabel: webLlm?.elementsLabel?.trim() || 'ELEMENTOS',
    noneLabel: webLlm?.noneLabel?.trim() || 'ninguna',
    answerInstruction:
      webLlm?.answerInstruction?.trim() ||
      'RESPONDE SOLO JSON. Escribe un message real, nunca puntos suspensivos. Si edita: update. Si crea: create. No copies el prompt.'
  };
}

function promptElementsForPayload(elements: readonly WebLlmPromptElement[], selectedIds: readonly string[]): readonly WebLlmPromptElement[] {
  if (!elements.length) {
    return [];
  }

  const selected = new Set(selectedIds);
  return [...elements]
    .sort((left, right) => Number(selected.has(formatPromptValue(right.id))) - Number(selected.has(formatPromptValue(left.id))))
    .slice(0, WEB_LLM_MAX_CONTEXT_ELEMENTS);
}

function formatPromptElement(element: WebLlmPromptElement): string {
  return [
    `- id=${formatPromptValue(element.id)}`,
    `kind=${formatPromptValue(element.kind)}`,
    `name=${formatPromptValue(element.name)}`,
    element.locked ? 'locked=true' : '',
    `geometry=${formatPromptRecord(element.geometry)}`,
    `style=${formatPromptStyle(element.style)}`,
    element.text ? `text=${formatPromptValue(element.text)}` : ''
  ]
    .filter(Boolean)
    .join('; ');
}

function formatPromptRecord(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  return Object.entries(value as Record<string, unknown>)
    .map(([key, entry]) => `${key}=${formatPromptValue(entry)}`)
    .filter((entry) => !entry.endsWith('='))
    .join(',');
}

function formatPromptStyle(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '';
  }

  const style = value as Record<string, unknown>;
  return formatPromptRecord({
    strokeWidth: style['strokeWidth'],
    stroke: style['stroke'],
    fill: style['fill']
  });
}

function formatPromptValue(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(Number(value.toFixed(2))) : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'string') {
    return value.replaceAll(/\s+/g, ' ').trim().slice(0, 160);
  }

  if (Array.isArray(value)) {
    return value.length ? `${value.length} items` : 'none';
  }

  if (value && typeof value === 'object') {
    return formatPromptRecord(value);
  }

  return '';
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
    const engine = await createBrowserWorkerEngine(modelName);

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

async function createBrowserWorkerEngine(modelName: string): Promise<MLCEngineInterface> {
  return await CreateWebWorkerMLCEngine(new Worker(new URL('./web-llm.worker', import.meta.url), { type: 'module' }), modelName, {
    appConfig: { ...prebuiltAppConfig, cacheBackend: 'indexeddb' },
    initProgressCallback: updateProgress
  });
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

function logWebLlm(event: string, details: Record<string, unknown>): void {
  if (!aiDebugLoggingEnabled()) {
    return;
  }

  console.info('[Tikz Drawer AI][WebLLM]', event, details);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface WebLlmPromptPayload {
  readonly instruction?: string;
  readonly now?: unknown;
  readonly language?: {
    readonly code?: string;
    readonly webLlm?: Partial<WebLlmPromptLabels> & {
      readonly systemInstruction?: string;
    };
  };
  readonly context?: {
    readonly sceneName?: string;
    readonly selectedElementIds?: readonly string[];
    readonly elements?: readonly WebLlmPromptElement[];
  };
  readonly conversation?: readonly { readonly role: string; readonly text: string }[];
}

interface WebLlmPromptLabels {
  readonly taskLabel: string;
  readonly selectionLabel: string;
  readonly elementsLabel: string;
  readonly noneLabel: string;
  readonly answerInstruction: string;
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
