import type { CanvasShape } from '../models/tikz.models';

export type AiMessageRole = 'user' | 'assistant' | 'system';
export type AiResponseType = 'message' | 'scenePatch' | 'tikzCode';

export interface AiMessage {
  readonly id: string;
  readonly role: AiMessageRole;
  readonly text: string;
  readonly createdAt: number;
  readonly response?: AiResponse;
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
}
