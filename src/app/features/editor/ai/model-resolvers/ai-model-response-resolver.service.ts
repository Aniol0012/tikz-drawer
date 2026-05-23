import { Injectable, inject } from '@angular/core';
import { AiInstructionIntentService } from '../ai-instruction-intent.service';
import type { AiSceneContext } from '../ai-scene-context.model';
import type { AiResponse } from '../ai-message.model';
import type { AiProviderTextResult } from '../ai-provider-result.model';
import { DefaultAiModelResponseResolver } from './default-ai-model-response.resolver';
import { SmolLm2WebLlmResponseResolver } from './smollm2-webllm-response.resolver';
import type { AiModelResolutionContext, AiModelResponseResolver, AiPreflightResolutionContext } from './ai-model-response-resolver';

@Injectable({ providedIn: 'root' })
export class AiModelResponseResolverService {
  private readonly intentService = inject(AiInstructionIntentService);
  private readonly smolLm2Resolver = inject(SmolLm2WebLlmResponseResolver);
  private readonly defaultResolver = inject(DefaultAiModelResponseResolver);

  resolvePreflight(instruction: string, scene: AiSceneContext): AiResponse | null {
    const context: AiPreflightResolutionContext = {
      instruction,
      scene,
      intent: this.intentService.analyze(instruction)
    };

    for (const resolver of this.resolvers()) {
      const response = resolver.resolvePreflight?.(context);
      if (response) {
        return response;
      }
    }

    return null;
  }

  resolve(instruction: string, scene: AiSceneContext, response: AiResponse, result: AiProviderTextResult): AiResponse {
    const context = this.context(instruction, scene, response, result);
    return this.matchingResolvers(result).reduce((resolved, resolver) => {
      const nextContext = { ...context, response: resolved };
      return resolver.resolve(nextContext) ?? resolved;
    }, response);
  }

  shouldRetryWithCloud(instruction: string, scene: AiSceneContext, response: AiResponse, result: AiProviderTextResult, allowRemoteFallback: boolean): boolean {
    const context = this.context(instruction, scene, response, result);
    return this.matchingResolvers(result).some((resolver) => resolver.shouldRetryWithCloud?.(context, allowRemoteFallback) ?? false);
  }

  private context(instruction: string, scene: AiSceneContext, response: AiResponse, result: AiProviderTextResult): AiModelResolutionContext {
    return {
      instruction,
      scene,
      response,
      result,
      intent: this.intentService.analyze(instruction)
    };
  }

  private matchingResolvers(result: AiProviderTextResult): readonly AiModelResponseResolver[] {
    return this.resolvers().filter((resolver) => resolver.supports(result));
  }

  private resolvers(): readonly AiModelResponseResolver[] {
    return [this.smolLm2Resolver, this.defaultResolver];
  }
}
