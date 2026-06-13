import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { AiSimpleScenePatchFactory } from '../ai-simple-scene-patch.factory';
import { AiInstructionIntentService } from '../ai-instruction-intent.service';
import type { AiResponse } from '../ai-message.model';
import type { AiProviderTextResult } from '../ai-provider-result.model';
import type { AiModelResolutionContext, AiModelResponseResolver, AiPreflightResolutionContext } from './ai-model-response-resolver';
import { mutableElements } from './ai-model-response-resolver';
import type { CanvasShape } from '../../models/tikz.models';
import { ColorRangeRandomizerService } from '../color-range-randomizer.service';
import { REGEX } from '../../../../shared/regex/regex.utils';

const LABEL_COLOR_OPTIONS = {
  saturation: [8, 28],
  lightness: [18, 42]
} as const;

@Injectable({ providedIn: 'root' })
export class DefaultAiModelResponseResolver implements AiModelResponseResolver {
  private readonly languageService = inject(EditorLanguageService);
  private readonly simplePatchFactory = inject(AiSimpleScenePatchFactory);
  private readonly colorRandomizer = inject(ColorRangeRandomizerService);
  private readonly intentService = inject(AiInstructionIntentService);

  readonly id = 'default';

  supports(_result: AiProviderTextResult): boolean {
    return true;
  }

  resolvePreflight(context: AiPreflightResolutionContext): AiResponse | null {
    if (this.looksLikeAddLabels(context.intent.normalized)) {
      return this.addLabels(context);
    }

    if (this.looksLikeExplainScene(context.intent.normalized)) {
      return this.explainScene(context);
    }

    if (context.intent.createRequest && this.shouldUseObviousCreateFallback(context.intent.normalized)) {
      const shapes = this.simplePatchFactory.createShapes(context.instruction);
      if (shapes.length) {
        return {
          type: 'scenePatch',
          message: this.languageService.t('ai.simpleProposalReady'),
          patch: { create: shapes, update: [], remove: [] },
          parseStatus: 'local-conversation-fallback'
        };
      }
    }

    if (this.looksLikeImproveScene(context.intent.normalized)) {
      return this.improveScene(context);
    }

    if (this.looksLikeSimplifyScene(context.intent.normalized)) {
      return this.simplifyScene(context);
    }

    if (!context.intent.conversation) {
      return null;
    }

    return {
      type: 'message',
      message: context.intent.conversation === 'thanks' ? this.languageService.t('ai.localThanksFallback') : this.languageService.t('ai.localGreetingFallback'),
      parseStatus: 'local-conversation-fallback'
    };
  }

  resolve(context: AiModelResolutionContext): AiResponse | null {
    if (context.response.type === 'message' && context.response.message === this.languageService.t('ai.responseGenerated')) {
      return {
        ...context.response,
        message: this.languageService.t('ai.errorUnclearResponse')
      };
    }

    if (context.response.type === 'message' && this.shouldUseSimpleDrawingFallback(context.response)) {
      const shapes = this.simplePatchFactory.createShapes(context.instruction);
      if (shapes.length) {
        return {
          type: 'scenePatch',
          message: this.languageService.t('ai.simpleProposalReady'),
          patch: { create: shapes, update: [], remove: [] }
        };
      }
    }

    return null;
  }

  shouldRetryWithCloud(context: AiModelResolutionContext, allowRemoteFallback: boolean): boolean {
    return allowRemoteFallback && this.isUnusableLocalOutput(context.response) && !context.intent.conversation && !context.intent.capabilityQuestion;
  }

  protected shouldUseSimpleDrawingFallback(response: AiResponse): boolean {
    return (
      response.message === this.languageService.t('ai.responseGenerated') ||
      response.parseStatus === 'prompt-echo' ||
      response.parseStatus === 'compact-prompt-echo' ||
      response.parseStatus === 'placeholder-json' ||
      response.parseStatus === 'text-fallback'
    );
  }

  protected isPromptEcho(response: AiResponse): boolean {
    return response.parseStatus === 'prompt-echo' || response.parseStatus === 'compact-prompt-echo';
  }

  private improveScene(context: AiPreflightResolutionContext): AiResponse | null {
    const elements = mutableElements(context.scene).slice(0, 8);
    if (!elements.length) {
      return null;
    }

    const spacingX = this.randomFrom([2, 2.3, 2.55]);
    const spacingY = this.randomFrom([1.55, 1.8, 2.05]);
    const columns = Math.ceil(Math.sqrt(elements.length));
    const rows = Math.ceil(elements.length / columns);
    const update = elements.map((element, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const targetX = (column - (columns - 1) / 2) * spacingX + this.jitter(0.08);
      const targetY = ((rows - 1) / 2 - row) * spacingY + this.jitter(0.08);
      return { id: element.id, changes: this.positionChanges(element.kind, targetX, targetY) };
    });

    return {
      type: 'scenePatch',
      message: this.languageService.t('ai.localQuickActionReady'),
      patch: { create: [], update, remove: [] },
      parseStatus: 'local-conversation-fallback'
    };
  }

  private addLabels(context: AiPreflightResolutionContext): AiResponse | null {
    const elements = mutableElements(context.scene).slice(0, 6);
    if (!elements.length) {
      return null;
    }

    const create = elements.map((element, index) => {
      const center = this.elementCenter(element);
      return {
        kind: 'text' as const,
        name: this.languageService.localizedShapeKind('text'),
        x: center.x,
        y: center.y - this.randomFrom([0.85, 1, 1.15]),
        text: element.name || `${this.languageService.localizedShapeKind(element.kind as CanvasShape['kind'])} ${index + 1}`,
        fontSize: this.randomFrom([0.14, 0.16, 0.18]),
        color: this.colorRandomizer.getRandomColor('gray', LABEL_COLOR_OPTIONS),
        stroke: 'transparent',
        strokeWidth: 0.02
      };
    });

    return {
      type: 'scenePatch',
      message: this.languageService.t('ai.localQuickActionReady'),
      patch: { create, update: [], remove: [] },
      parseStatus: 'local-conversation-fallback'
    };
  }

  private simplifyScene(context: AiPreflightResolutionContext): AiResponse | null {
    const elements = mutableElements(context.scene);
    if (elements.length < 5) {
      return this.improveScene(context);
    }

    const removable = elements.slice(4 + Math.floor(Math.random() * 2));
    return {
      type: 'scenePatch',
      message: this.languageService.t('ai.localQuickActionReady'),
      patch: { create: [], update: [], remove: removable.map((element) => element.id) },
      parseStatus: 'local-conversation-fallback'
    };
  }

  private explainScene(context: AiPreflightResolutionContext): AiResponse {
    const elements = mutableElements(context.scene);
    const summary = elements.length ? this.summarizeElements(elements) : this.languageService.t('ai.localSceneEmptySummary');

    return {
      type: 'message',
      message: this.languageService.t('ai.localSceneExplanation').replace('{count}', String(elements.length)).replace('{summary}', summary),
      parseStatus: 'local-conversation-fallback'
    };
  }

  private positionChanges(kind: string, x: number, y: number): Partial<CanvasShape> {
    if (kind === 'circle' || kind === 'ellipse') {
      return { cx: this.round(x), cy: this.round(y) } as Partial<CanvasShape>;
    }

    if (kind === 'line') {
      return {
        from: { x: this.round(x - 0.8), y: this.round(y) },
        to: { x: this.round(x + 0.8), y: this.round(y) }
      } as Partial<CanvasShape>;
    }

    return { x: this.round(x - 0.8), y: this.round(y - 0.45) } as Partial<CanvasShape>;
  }

  private elementCenter(element: { readonly kind: string; readonly geometry: Record<string, unknown> }): { readonly x: number; readonly y: number } {
    const geometry = element.geometry;
    if (typeof geometry['cx'] === 'number' && typeof geometry['cy'] === 'number') {
      return { x: geometry['cx'], y: geometry['cy'] };
    }

    const x = typeof geometry['x'] === 'number' ? geometry['x'] : 0;
    const y = typeof geometry['y'] === 'number' ? geometry['y'] : 0;
    const width = typeof geometry['width'] === 'number' ? geometry['width'] : 0;
    const height = typeof geometry['height'] === 'number' ? geometry['height'] : 0;
    return { x: x + width / 2, y: y + height / 2 };
  }

  private looksLikeImproveScene(instruction: string): boolean {
    return REGEX.ai.layoutIntent.test(instruction);
  }

  private looksLikeAddLabels(instruction: string): boolean {
    return REGEX.ai.labelIntent.test(instruction);
  }

  private looksLikeSimplifyScene(instruction: string): boolean {
    return REGEX.ai.simplifyIntent.test(instruction);
  }

  private looksLikeExplainScene(instruction: string): boolean {
    return REGEX.ai.explainIntent.test(instruction);
  }

  private shouldUseObviousCreateFallback(instruction: string): boolean {
    if (this.intentService.hasLocalizedTerm(instruction, 'ai.intent.graphTargets')) {
      return false;
    }

    return (
      this.intentService.hasLocalizedTerm(instruction, 'ai.intent.diagramTargets') ||
      this.intentService.hasLocalizedTerm(instruction, 'ai.intent.vagueShapeTargets') ||
      this.intentService.hasLocalizedTerm(instruction, 'ai.intent.circleTargets') ||
      this.intentService.hasLocalizedTerm(instruction, 'ai.intent.triangleTargets') ||
      this.intentService.hasLocalizedTerm(instruction, 'ai.intent.ellipseTargets') ||
      this.intentService.hasLocalizedTerm(instruction, 'ai.intent.rectangleTargets') ||
      this.intentService.hasLocalizedTerm(instruction, 'ai.intent.squareTargets') ||
      this.intentService.hasLocalizedTerm(instruction, 'ai.intent.arrowTargets')
    );
  }

  private randomFrom<T>(values: readonly T[]): T {
    const fallback = values[0];
    if (fallback === undefined) {
      throw new Error('Cannot choose from an empty list.');
    }

    return values[Math.floor(Math.random() * values.length)] ?? fallback;
  }

  private jitter(amount: number): number {
    return (Math.random() * 2 - 1) * amount;
  }

  private round(value: number): number {
    return Number(value.toFixed(2));
  }

  private summarizeElements(elements: ReturnType<typeof mutableElements>): string {
    const counts = new Map<CanvasShape['kind'], number>();
    for (const element of elements) {
      counts.set(element.kind, (counts.get(element.kind) ?? 0) + 1);
    }

    return [...counts].map(([kind, count]) => `${count} ${this.languageService.localizedShapeKind(kind as CanvasShape['kind'])}`).join(', ');
  }

  private isUnusableLocalOutput(response: AiResponse): boolean {
    return this.isPromptEcho(response) || response.parseStatus === 'placeholder-json';
  }
}
