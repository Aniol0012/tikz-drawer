import type { CanvasShape, ShapeKind } from '../models/tikz.models';

export type AiCapability = 'message' | 'scenePatch' | 'tikzCode';

export interface AiSceneElement {
  readonly id: string;
  readonly name: string;
  readonly kind: ShapeKind;
  readonly locked: boolean;
  readonly geometry: Record<string, number | string | boolean | readonly Record<string, number>[]>;
  readonly style: Record<string, number | string | boolean>;
  readonly text?: string;
}

export interface AiSceneContext {
  readonly sceneName: string;
  readonly selectedElementIds: readonly string[];
  readonly elements: readonly AiSceneElement[];
  readonly capabilities: readonly AiCapability[];
  readonly supportedElementKinds: readonly CanvasShape['kind'][];
}
