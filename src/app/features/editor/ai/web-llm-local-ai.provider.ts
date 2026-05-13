import { effect, inject, Injectable, signal } from '@angular/core';
import {
  CreateWebWorkerMLCEngine,
  prebuiltAppConfig,
  type ChatCompletionChunk,
  type CompletionUsage,
  type InitProgressReport,
  type MLCEngineInterface,
  WebWorkerMLCEngine
} from '@mlc-ai/web-llm';
import type { AiProviderRequest, AiProviderTextResult, AiProviderUsage } from './ai-provider-result.model';
import type { LocalAiStatus } from './local-ai-status.model';
import { AiSettingsService, WEB_LLM_MODEL_OPTIONS } from './ai-settings.service';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';

const DEFAULT_WEB_LLM_MODEL = WEB_LLM_MODEL_OPTIONS[0];
const WEB_LLM_MAX_OUTPUT_TOKENS = 180;
const WEB_LLM_MAX_CONTEXT_ELEMENTS = 12;
const WEB_LLM_STATUS = signal<LocalAiStatus>(initialStatus());
const WEB_LLM_ENGINES = new Map<string, MLCEngineInterface>();
const WEB_LLM_LOADING_PROMISES = new Map<string, Promise<MLCEngineInterface>>();
let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;
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

  async generateText(request: AiProviderRequest, timeoutMs = request.options.webLlmTimeoutMs): Promise<AiProviderTextResult> {
    const modelName = request.options.webLlmModel;
    if (!this.isSupported()) {
      throw new Error('ai.errorWebLlmUnsupported');
    }

    const engine = await ensureEngine(modelName);
    const generated = await generateWithInterruptingTimeout(engine, request, timeoutMs);

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
  timeoutMs: number
): Promise<{ readonly text: string; readonly usage?: AiProviderUsage }> {
  let timedOut = false;
  let timeoutId = 0;
  const startedAt = performance.now();
  const generation = generateStreamingResponse(engine, request).then((result) => {
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

  try {
    return await Promise.race([generation, timeout]);
  } finally {
    globalThis.clearTimeout(timeoutId);
    if (timedOut) {
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
        content: localSystemInstruction()
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

function localSystemInstruction(): string {
  return [
    'Eres el asistente de Tikz Drawer.',
    'Devuelve solo JSON valido, sin markdown.',
    'Formato: {"type":"message"|"scenePatch"|"tikzCode","message":"...","patch":{...},"tikzCode":"..."}',
    'Nunca devuelvas {} ni un objeto vacio.',
    'Para charla usa type="message" y 1 frase.',
    'Para dibujar o editar usa scenePatch con pocos elementos claros.',
    'Si piden una figura en el canvas, devuelve type="scenePatch" y crea patch.create con al menos una figura.',
    'Ejemplo figura: {"kind":"rectangle","name":"Bloque","x":-1,"y":-1,"width":2,"height":1,"stroke":"#1d4ed8","fill":"#dbeafe","strokeWidth":0.04}.',
    'Ejemplo respuesta completa: {"type":"scenePatch","message":"He preparado un rectangulo azul.","patch":{"create":[{"kind":"rectangle","name":"Rectangulo azul","x":-1,"y":-0.5,"width":2,"height":1,"stroke":"#1d4ed8","fill":"#dbeafe","strokeWidth":0.04}]}}',
    'Usa numeros cortos, maximo 2 decimales.',
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
    const engine = await createPersistentEngine(modelName).catch((error) => {
      logWebLlm('service-worker:fallback-to-web-worker', { error: error instanceof Error ? error.message : String(error) });
      return CreateWebWorkerMLCEngine(new Worker(new URL('./web-llm.worker', import.meta.url), { type: 'module' }), modelName, {
        appConfig: { ...prebuiltAppConfig, cacheBackend: 'indexeddb' },
        initProgressCallback: updateProgress
      });
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

async function createPersistentEngine(modelName: string): Promise<MLCEngineInterface> {
  const registration = await registerWebLlmServiceWorker();
  const engine = new WebWorkerMLCEngine(new RegisteredServiceWorkerBridge(registration), {
    appConfig: { ...prebuiltAppConfig, cacheBackend: 'indexeddb' },
    initProgressCallback: updateProgress
  });
  await engine.reload(modelName);
  logWebLlm('service-worker:ready', { model: modelName, scope: registration.scope });
  return engine;
}

async function registerWebLlmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!canUseWebLlmServiceWorker()) {
    throw new Error('WebLLM persistent service worker is not available.');
  }

  serviceWorkerRegistrationPromise ??= navigator.serviceWorker
    .register('/web-llm.service-worker.js', {
      type: 'module',
      scope: './webllm/'
    })
    .then(async (registration) => {
      await navigator.serviceWorker.ready;
      await waitForActiveServiceWorker(registration);
      return registration;
    });

  return await serviceWorkerRegistrationPromise;
}

function canUseWebLlmServiceWorker(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && window.isSecureContext;
}

async function waitForActiveServiceWorker(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) {
    return;
  }

  const worker = registration.installing ?? registration.waiting;
  if (!worker) {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 250));
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => reject(new Error('WebLLM service worker activation timed out.')), 12000);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        globalThis.clearTimeout(timeoutId);
        resolve();
      }
    });
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
  console.info('[Tikz Drawer AI][WebLLM]', event, details);
}

class RegisteredServiceWorkerBridge {
  private messageHandler: (event: MessageEvent) => void = () => {};

  constructor(private readonly registration: ServiceWorkerRegistration) {
    navigator.serviceWorker.addEventListener('message', (event) => this.messageHandler(event));
  }

  get onmessage(): (event: MessageEvent) => void {
    return this.messageHandler;
  }

  set onmessage(handler: (event: MessageEvent) => void) {
    this.messageHandler = handler;
  }

  postMessage(message: unknown): void {
    const worker = this.registration.active ?? this.registration.waiting ?? this.registration.installing;
    if (!worker) {
      throw new Error('WebLLM service worker is not active.');
    }

    worker.postMessage(message);
  }
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
