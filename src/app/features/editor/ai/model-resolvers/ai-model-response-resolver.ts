import type { AiSceneContext, AiSceneElement } from '../ai-scene-context.model';
import type { AiResponse } from '../ai-message.model';
import type { AiProviderTextResult } from '../ai-provider-result.model';
import type { AiInstructionIntent } from '../ai-instruction-intent.service';

export interface AiModelResolutionContext {
  readonly instruction: string;
  readonly scene: AiSceneContext;
  readonly response: AiResponse;
  readonly result: AiProviderTextResult;
  readonly intent: AiInstructionIntent;
}

export interface AiPreflightResolutionContext {
  readonly instruction: string;
  readonly scene: AiSceneContext;
  readonly intent: AiInstructionIntent;
}

export interface AiModelResponseResolver {
  readonly id: string;
  supports(result: AiProviderTextResult): boolean;
  resolvePreflight?(context: AiPreflightResolutionContext): AiResponse | null;
  resolve(context: AiModelResolutionContext): AiResponse | null;
  shouldRetryWithCloud?(context: AiModelResolutionContext, allowRemoteFallback: boolean): boolean;
}

export const mutableElements = (scene: AiSceneContext): readonly AiSceneElement[] => scene.elements.filter((element) => !element.locked);

export const selectedMutableElements = (scene: AiSceneContext): readonly AiSceneElement[] => {
  const selectedIds = new Set(scene.selectedElementIds);
  return mutableElements(scene).filter((element) => selectedIds.has(element.id));
};
