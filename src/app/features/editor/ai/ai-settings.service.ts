import { effect, inject, Injectable, signal } from '@angular/core';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';
import { EditorLocalStorageService } from '../state/editor-local-storage.service';
import { FIREBASE_AI_MODEL } from './firebase-ai.config';
import type { AiProviderType } from './ai-provider-result.model';

export const WEB_LLM_MODEL_OPTIONS = ['Llama-3.2-1B-Instruct-q4f16_1-MLC'] as const;
export const REMOTE_AI_MODEL_OPTIONS = ['gemini-3.1-flash-lite', 'gemini-3.1-flash'] as const;

export interface AiSettings {
  readonly temperature: number;
  readonly maxTokens: number;
  readonly providerType: AiProviderType;
  readonly webLlmModel: string;
  readonly remoteModel: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  temperature: 0.2,
  maxTokens: 900,
  providerType: 'webllm',
  webLlmModel: WEB_LLM_MODEL_OPTIONS[0],
  remoteModel: FIREBASE_AI_MODEL
};

@Injectable({ providedIn: 'root' })
export class AiSettingsService {
  private readonly storage = inject(EditorLocalStorageService);
  private readonly storageKey = EDITOR_STORAGE_KEYS.aiSettings;

  readonly settings = signal<AiSettings>(this.restoreSettings());

  constructor() {
    effect(() => {
      this.storage.setJson(this.storageKey, this.settings());
    });
  }

  patchSettings(patch: Partial<AiSettings>): void {
    this.settings.update((settings) => this.normalizeSettings({ ...settings, ...patch }));
  }

  resetToDefaults(): void {
    this.settings.set({ ...DEFAULT_AI_SETTINGS });
  }

  isDefault(): boolean {
    const settings = this.settings();
    return (
      settings.temperature === DEFAULT_AI_SETTINGS.temperature &&
      settings.maxTokens === DEFAULT_AI_SETTINGS.maxTokens &&
      settings.providerType === DEFAULT_AI_SETTINGS.providerType &&
      settings.webLlmModel === DEFAULT_AI_SETTINGS.webLlmModel &&
      settings.remoteModel === DEFAULT_AI_SETTINGS.remoteModel
    );
  }

  restoreFromStorageEvent(key: string | null, newValue: string | null): boolean {
    if (key !== this.storageKey) {
      return false;
    }

    this.settings.set(this.parseStoredSettings(newValue));
    return true;
  }

  private restoreSettings(): AiSettings {
    return this.parseStoredSettings(this.storage.getString(this.storageKey));
  }

  private parseStoredSettings(raw: string | null | undefined): AiSettings {
    if (!raw) {
      return { ...DEFAULT_AI_SETTINGS };
    }

    try {
      return this.normalizeSettings(JSON.parse(raw) as Partial<AiSettings>);
    } catch {
      return { ...DEFAULT_AI_SETTINGS };
    }
  }

  private normalizeSettings(settings: Partial<AiSettings> | null | undefined): AiSettings {
    return {
      temperature: this.clampNumber(settings?.temperature, DEFAULT_AI_SETTINGS.temperature, 0, 1.2),
      maxTokens: Math.round(this.clampNumber(settings?.maxTokens, DEFAULT_AI_SETTINGS.maxTokens, 250, 2000)),
      providerType: this.normalizeProviderType(settings?.providerType),
      webLlmModel: this.normalizeOption(settings?.webLlmModel, WEB_LLM_MODEL_OPTIONS, DEFAULT_AI_SETTINGS.webLlmModel),
      remoteModel: this.normalizeOption(settings?.remoteModel, REMOTE_AI_MODEL_OPTIONS, DEFAULT_AI_SETTINGS.remoteModel)
    };
  }

  private normalizeProviderType(value: unknown): AiProviderType {
    if (value === 'webllm' || value === 'local' || value === 'remote') {
      return value;
    }

    return DEFAULT_AI_SETTINGS.providerType;
  }

  private normalizeOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
    return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback;
  }

  private clampNumber(value: unknown, fallback: number, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, value));
  }
}
