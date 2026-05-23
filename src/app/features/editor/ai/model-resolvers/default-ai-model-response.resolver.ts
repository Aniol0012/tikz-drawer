import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { AiSimpleScenePatchFactory } from '../ai-simple-scene-patch.factory';
import type { AiResponse } from '../ai-message.model';
import type { AiProviderTextResult } from '../ai-provider-result.model';
import type { AiModelResolutionContext, AiModelResponseResolver, AiPreflightResolutionContext } from './ai-model-response-resolver';

@Injectable({ providedIn: 'root' })
export class DefaultAiModelResponseResolver implements AiModelResponseResolver {
  private readonly languageService = inject(EditorLanguageService);
  private readonly simplePatchFactory = inject(AiSimpleScenePatchFactory);

  readonly id = 'default';

  supports(_result: AiProviderTextResult): boolean {
    return true;
  }

  resolvePreflight(context: AiPreflightResolutionContext): AiResponse | null {
    if (context.intent.createRequest) {
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
    if (context.response.message === this.languageService.t('ai.responseGenerated')) {
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

  private isUnusableLocalOutput(response: AiResponse): boolean {
    return this.isPromptEcho(response) || response.parseStatus === 'placeholder-json';
  }
}
