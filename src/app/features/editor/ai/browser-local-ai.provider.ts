import { Injectable, signal } from '@angular/core';
import type { AiProviderRequest, AiProviderTextResult } from './ai-provider-result.model';

const BROWSER_LOCAL_MODEL_NAME = 'Chrome Built-in LanguageModel';

@Injectable({ providedIn: 'root' })
export class BrowserLocalAiProvider {
  readonly mode = 'local' as const;
  readonly modelName = BROWSER_LOCAL_MODEL_NAME;
  readonly supported = signal(this.detectSupport());

  async generateText(request: AiProviderRequest): Promise<AiProviderTextResult> {
    const languageModel = this.localLanguageModel();
    if (!languageModel?.create) {
      throw new Error('Browser local AI is not available.');
    }

    const availability = languageModel.availability ? await languageModel.availability() : 'available';
    if (availability === 'unavailable') {
      throw new Error('Browser local AI is unavailable.');
    }

    const session = await languageModel.create({
      systemPrompt: `${request.systemInstruction}\nReturn only valid JSON.`
    });

    try {
      return {
        mode: this.mode,
        modelName: this.modelName,
        text: await session.prompt(request.contextJson)
      };
    } finally {
      session.destroy?.();
    }
  }

  private detectSupport(): boolean {
    return !!this.localLanguageModel()?.create;
  }

  private localLanguageModel(): LocalLanguageModel | null {
    const candidate = globalThis as typeof globalThis & {
      LanguageModel?: LocalLanguageModel;
      ai?: { languageModel?: LocalLanguageModel };
    };

    return candidate.LanguageModel ?? candidate.ai?.languageModel ?? null;
  }
}

interface LocalLanguageModel {
  readonly availability?: () => Promise<string>;
  readonly create?: (options: { readonly systemPrompt: string }) => Promise<{
    readonly prompt: (input: string) => Promise<string>;
    readonly destroy?: () => void;
  }>;
}
