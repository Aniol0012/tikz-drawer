import type { CanvasShape } from '../models/tikz.models';
import type { AiProviderMode, AiProviderRuntimeType, AiProviderType, AiProviderUsage } from './ai-provider-result.model';

export type AiMessageRole = 'user' | 'assistant' | 'system';
export type AiResponseType = 'message' | 'scenePatch' | 'tikzCode';

export interface AiMessage {
  readonly id: string;
  readonly role: AiMessageRole;
  readonly text: string;
  readonly createdAt: number;
  readonly response?: AiResponse;
  readonly debugInfo?: AiMessageDebugInfo;
}

export interface AiMessageDebugInfo {
  readonly providerType: AiProviderType;
  readonly modelName: string;
}

export interface AiSceneElementUpdate {
  readonly id: string;
  readonly changes: Partial<CanvasShape>;
}

export interface ScenePatch {
  readonly create: readonly Partial<CanvasShape>[];
  readonly update: readonly AiSceneElementUpdate[];
  readonly remove: readonly string[];
}

export interface AiResponse {
  readonly type: AiResponseType;
  readonly message: string;
  readonly patch?: ScenePatch;
  readonly tikzCode?: string;
  readonly parseStatus?: AiResponseParseStatus;
  readonly rawTextPreview?: string;
  readonly aiMode?: AiProviderMode;
  readonly aiProviderType?: AiProviderRuntimeType;
  readonly aiModelName?: string;
  readonly aiDurationMs?: number;
  readonly aiUsage?: AiProviderUsage;
}

export type AiResponseParseStatus =
  | 'json'
  | 'json-repaired'
  | 'text-fallback'
  | 'empty-json'
  | 'prompt-echo'
  | 'compact-prompt-echo'
  | 'local-conversation-fallback';
