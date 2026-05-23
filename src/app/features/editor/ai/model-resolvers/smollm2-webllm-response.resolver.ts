import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import type { AiResponse, ScenePatch } from '../ai-message.model';
import type { AiProviderTextResult } from '../ai-provider-result.model';
import type { AiModelResolutionContext, AiModelResponseResolver, AiPreflightResolutionContext } from './ai-model-response-resolver';
import { mutableElements, selectedMutableElements } from './ai-model-response-resolver';

const SMOLLM_MODEL_ID = 'SmolLM2-360M-Instruct';
const DEFAULT_STROKE_WIDTH_DELTA = 0.04;
const DEFAULT_STROKE_WIDTH = 0.12;
const DEFAULT_COLOR_EDIT = { stroke: '#7c3aed', fill: '#ede9fe' } as const;

@Injectable({ providedIn: 'root' })
export class SmolLm2WebLlmResponseResolver implements AiModelResponseResolver {
  private readonly languageService = inject(EditorLanguageService);

  readonly id = 'smollm2-webllm';

  supports(result: AiProviderTextResult): boolean {
    return result.providerType === 'webllm' && result.modelName.includes(SMOLLM_MODEL_ID);
  }

  resolvePreflight(context: AiPreflightResolutionContext): AiResponse | null {
    if (context.intent.capabilityQuestion) {
      return this.localMessage(this.capabilityMessageKey(context));
    }

    if (context.intent.editRequest && context.intent.strokeWidthTarget && context.intent.rectangleTarget) {
      return this.resolveStrokeWidthEdit(context);
    }

    if (context.intent.editRequest && context.intent.colorTarget && context.intent.triangleTarget) {
      return this.resolveTriangleColorEdit(context);
    }

    if (context.intent.editRequest && context.intent.colorTarget) {
      return this.resolveSelectedColorEdit(context);
    }

    return null;
  }

  resolve(context: AiModelResolutionContext): AiResponse | null {
    if (context.intent.capabilityQuestion) {
      return this.message(context.response, this.capabilityMessageKey(context));
    }

    if (context.intent.editRequest) {
      return this.resolveEditRequest(context);
    }

    if (this.isLeakedExamplePatch(context)) {
      return this.message(context.response, this.languageService.t('ai.localModelUnclearResponse'));
    }

    if (this.isPromptEcho(context.response) && context.intent.conversation) {
      return this.message(
        context.response,
        context.intent.conversation === 'thanks' ? this.languageService.t('ai.localThanksFallback') : this.languageService.t('ai.localGreetingFallback')
      );
    }

    return null;
  }

  shouldRetryWithCloud(context: AiModelResolutionContext, allowRemoteFallback: boolean): boolean {
    return (
      allowRemoteFallback &&
      this.isPromptEcho(context.response) &&
      !context.intent.conversation &&
      !context.intent.capabilityQuestion &&
      !context.intent.editRequest
    );
  }

  private resolveEditRequest(context: AiModelResolutionContext): AiResponse {
    if (context.intent.strokeWidthTarget && context.intent.rectangleTarget) {
      return this.resolveStrokeWidthEdit(context);
    }

    if (context.intent.colorTarget && context.intent.triangleTarget) {
      return this.resolveTriangleColorEdit(context);
    }

    if (context.intent.colorTarget) {
      return this.resolveSelectedColorEdit(context);
    }

    if (context.response.type === 'scenePatch' && context.response.patch && this.patchCreatesWithoutUpdating(context.response.patch)) {
      return this.message(context.response, this.languageService.t('ai.localEditNeedsSelection'));
    }

    return context.response;
  }

  private capabilityMessageKey(context: AiPreflightResolutionContext): string {
    return this.languageService.t(context.intent.graphTarget ? 'ai.localCapabilityFallback' : 'ai.localShapeCapabilityFallback');
  }

  private resolveStrokeWidthEdit(context: AiPreflightResolutionContext): AiResponse {
    const target = this.rectangleTarget(context);
    if (!target) {
      return this.localMessage(this.languageService.t('ai.localEditNoMatchingShape'));
    }

    const nextStrokeWidth = this.nextStrokeWidth(target.style['strokeWidth']);
    return {
      type: 'scenePatch',
      message: this.languageService.t('ai.localStrokeWidthEditReady'),
      patch: {
        create: [],
        update: [{ id: target.id, changes: { strokeWidth: nextStrokeWidth } }],
        remove: []
      },
      parseStatus: 'local-conversation-fallback'
    };
  }

  private rectangleTarget(context: AiPreflightResolutionContext) {
    return (
      selectedMutableElements(context.scene).find((element) => element.kind === 'rectangle') ??
      mutableElements(context.scene).find((element) => element.kind === 'rectangle')
    );
  }

  private resolveTriangleColorEdit(context: AiPreflightResolutionContext): AiResponse {
    const target = this.triangleTarget(context);
    if (!target) {
      return this.localMessage(this.languageService.t('ai.localEditNoMatchingTriangle'));
    }

    return {
      type: 'scenePatch',
      message: this.languageService.t('ai.localColorEditReady'),
      patch: {
        create: [],
        update: [{ id: target.id, changes: this.colorChanges(context.intent.normalized) }],
        remove: []
      },
      parseStatus: 'local-conversation-fallback'
    };
  }

  private triangleTarget(context: AiPreflightResolutionContext) {
    return (
      selectedMutableElements(context.scene).find((element) => element.kind === 'triangle') ??
      mutableElements(context.scene).find((element) => element.kind === 'triangle')
    );
  }

  private resolveSelectedColorEdit(context: AiPreflightResolutionContext): AiResponse {
    const selected = selectedMutableElements(context.scene);
    if (!selected.length) {
      return this.localMessage(this.languageService.t('ai.localEditNeedsSelection'));
    }

    const changes = this.colorChanges(context.intent.normalized);
    return {
      type: 'scenePatch',
      message: this.languageService.t('ai.localColorEditReadyGeneric'),
      patch: {
        create: [],
        update: selected.map((element) => ({ id: element.id, changes: this.colorChangesForKind(element.kind, changes) })),
        remove: []
      },
      parseStatus: 'local-conversation-fallback'
    };
  }

  private colorChangesForKind(kind: string, changes: { readonly stroke: string; readonly fill: string }): Record<string, string> {
    if (kind === 'line') {
      return { stroke: changes.stroke, arrowColor: changes.stroke };
    }

    if (kind === 'text') {
      return { color: changes.stroke };
    }

    return changes;
  }

  private colorChanges(instruction: string): { readonly stroke: string; readonly fill: string } {
    if (/\b(verd|verde|green)\b/.test(instruction)) {
      return { stroke: '#16a34a', fill: '#dcfce7' };
    }
    if (/\b(vermell|rojo|red)\b/.test(instruction)) {
      return { stroke: '#dc2626', fill: '#fee2e2' };
    }
    if (/\b(groc|amarillo|yellow)\b/.test(instruction)) {
      return { stroke: '#d97706', fill: '#fef3c7' };
    }
    if (/\b(blau|azul|blue)\b/.test(instruction)) {
      return { stroke: '#1d4ed8', fill: '#dbeafe' };
    }

    return DEFAULT_COLOR_EDIT;
  }

  private nextStrokeWidth(value: unknown): number {
    const current = typeof value === 'number' && Number.isFinite(value) ? value : DEFAULT_STROKE_WIDTH;
    return Number(Math.max(current + DEFAULT_STROKE_WIDTH_DELTA, DEFAULT_STROKE_WIDTH).toFixed(2));
  }

  private isLeakedExamplePatch(context: AiModelResolutionContext): boolean {
    if (context.response.type !== 'scenePatch' || !context.response.patch || context.intent.createRequest) {
      return false;
    }

    return this.patchCreatesWithoutUpdating(context.response.patch);
  }

  private patchCreatesWithoutUpdating(patch: ScenePatch): boolean {
    return patch.create.length > 0 && patch.update.length === 0 && patch.remove.length === 0;
  }

  private isPromptEcho(response: AiResponse): boolean {
    return response.parseStatus === 'prompt-echo' || response.parseStatus === 'compact-prompt-echo';
  }

  private message(response: AiResponse, message: string): AiResponse {
    return {
      ...response,
      type: 'message',
      message,
      patch: undefined,
      tikzCode: undefined,
      parseStatus: 'local-conversation-fallback'
    };
  }

  private localMessage(message: string): AiResponse {
    return {
      type: 'message',
      message,
      parseStatus: 'local-conversation-fallback'
    };
  }
}
