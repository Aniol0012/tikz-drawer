import { Injectable } from '@angular/core';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { FIREBASE_AI_MODEL, FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY, FIREBASE_CONFIG } from './firebase-ai.config';
import type { AiProviderRequest, AiProviderTextResult } from './ai-provider-result.model';

@Injectable({ providedIn: 'root' })
export class FirebaseAiProvider {
  readonly mode = 'cloud' as const;
  readonly modelName = FIREBASE_AI_MODEL;

  private readonly app: FirebaseApp;

  constructor() {
    this.app = initializeApp(FIREBASE_CONFIG);
    this.initializeAnalytics();
    this.initializeAppCheck();
  }

  async generateText(request: AiProviderRequest): Promise<AiProviderTextResult> {
    const modelName = request.options.remoteModel;
    const ai = getAI(this.app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
      model: modelName,
      generationConfig: {
        maxOutputTokens: request.options.maxTokens,
        temperature: request.options.temperature,
        responseMimeType: 'application/json',
        responseSchema: this.responseSchema()
      },
      systemInstruction: request.systemInstruction
    });

    const response = await model.generateContent(request.contextJson);
    return {
      mode: this.mode,
      modelName,
      text: response.response.text()
    };
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
