import { Injectable, inject } from '@angular/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { FIREBASE_AI_MODEL, FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY, FIREBASE_CONFIG } from './firebase-ai.config';
import { AiResponseParserService } from './ai-response-parser.service';
import type { AiSceneContext } from './ai-scene-context.model';
import type { AiResponse } from './ai-message.model';

@Injectable({ providedIn: 'root' })
export class AiClientService {
  private readonly parser = inject(AiResponseParserService);
  private readonly app: FirebaseApp;

  constructor() {
    this.app = initializeApp(FIREBASE_CONFIG);
    this.initializeAnalytics();
    this.initializeAppCheck();
  }

  async sendPrompt(instruction: string, context: AiSceneContext): Promise<AiResponse> {
    const localResponse = await this.tryLocalModel(instruction, context);
    if (localResponse) {
      return localResponse;
    }

    const ai = getAI(this.app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      model: FIREBASE_AI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: this.responseSchema()
      },
      systemInstruction: this.systemInstruction()
    });

    const response = await model.generateContent(JSON.stringify({ instruction, context }));
    const text = response.response.text();
    return this.parser.parse(text);
  }

  private async tryLocalModel(instruction: string, context: AiSceneContext): Promise<AiResponse | null> {
    const languageModel = this.localLanguageModel();
    if (!languageModel?.create) {
      return null;
    }

    try {
      const availability = languageModel.availability ? await languageModel.availability() : 'available';
      if (availability === 'unavailable') {
        return null;
      }

      const session = await languageModel.create({
        systemPrompt: `${this.systemInstruction()}\nDevuelve solo JSON valido.`
      });
      const text = await session.prompt(JSON.stringify({ instruction, context }));
      session.destroy?.();
      return this.parser.parse(text);
    } catch {
      return null;
    }
  }

  private localLanguageModel(): LocalLanguageModel | null {
    const candidate = globalThis as typeof globalThis & {
      LanguageModel?: LocalLanguageModel;
      ai?: { languageModel?: LocalLanguageModel };
    };

    return candidate.LanguageModel ?? candidate.ai?.languageModel ?? null;
  }

  private initializeAnalytics(): void {
    void isAnalyticsSupported().then((supported) => {
      if (supported) {
        getAnalytics(this.app);
      }
    });
  }

  private initializeAppCheck(): void {
    if (!FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY) {
      return;
    }

    initializeAppCheck(this.app, {
      provider: new ReCaptchaEnterpriseProvider(FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  }

  private systemInstruction(): string {
    return [
      'Eres el asistente contextual de Tikz Drawer.',
      'Responde siempre en JSON siguiendo el esquema.',
      'Puedes explicar, generar TikZ o proponer patches de escena editables.',
      'No elimines ni modifiques elementos bloqueados.',
      'Para scenePatch, usa solo tipos nativos: rectangle, circle, ellipse, line, text, triangle.',
      'La app validara todo y el usuario aplicara manualmente los cambios.'
    ].join('\n');
  }

  private responseSchema(): Schema {
    const shapeProperties = {
      kind: Schema.enumString({ enum: ['rectangle', 'circle', 'ellipse', 'line', 'text', 'triangle'] }),
      name: Schema.string(),
      x: Schema.number(),
      y: Schema.number(),
      width: Schema.number(),
      height: Schema.number(),
      cx: Schema.number(),
      cy: Schema.number(),
      r: Schema.number(),
      rx: Schema.number(),
      ry: Schema.number(),
      fromX: Schema.number(),
      fromY: Schema.number(),
      toX: Schema.number(),
      toY: Schema.number(),
      text: Schema.string(),
      stroke: Schema.string(),
      fill: Schema.string(),
      color: Schema.string(),
      strokeWidth: Schema.number(),
      fontSize: Schema.number(),
      arrowStart: Schema.boolean(),
      arrowEnd: Schema.boolean()
    };
    const optionalShapeProperties = [
      'name',
      'x',
      'y',
      'width',
      'height',
      'cx',
      'cy',
      'r',
      'rx',
      'ry',
      'fromX',
      'fromY',
      'toX',
      'toY',
      'text',
      'stroke',
      'fill',
      'color',
      'strokeWidth',
      'fontSize',
      'arrowStart',
      'arrowEnd'
    ];
    const patchShape = Schema.object({
      properties: shapeProperties,
      optionalProperties: optionalShapeProperties
    });
    const patchShapeUpdate = Schema.object({
      properties: shapeProperties,
      optionalProperties: ['kind', ...optionalShapeProperties]
    });

    return Schema.object({
      properties: {
        type: Schema.enumString({ enum: ['message', 'scenePatch', 'tikzCode'] }),
        message: Schema.string(),
        patch: Schema.object({
          properties: {
            create: Schema.array({ items: patchShape }),
            update: Schema.array({
              items: Schema.object({
                properties: {
                  id: Schema.string(),
                  changes: patchShapeUpdate
                },
                optionalProperties: []
              })
            }),
            remove: Schema.array({ items: Schema.string() })
          },
          optionalProperties: ['create', 'update', 'remove']
        }),
        tikzCode: Schema.string()
      },
      optionalProperties: ['patch', 'tikzCode']
    });
  }
}

interface LocalLanguageModel {
  readonly availability?: () => Promise<string>;
  readonly create?: (options: { readonly systemPrompt: string }) => Promise<{
    readonly prompt: (input: string) => Promise<string>;
    readonly destroy?: () => void;
  }>;
}
