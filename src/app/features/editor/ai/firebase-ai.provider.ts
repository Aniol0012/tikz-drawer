import { Injectable } from '@angular/core';
import type * as FirebaseAi from 'firebase/ai';
import type * as FirebaseAppCheck from 'firebase/app-check';
import type { FirebaseApp } from 'firebase/app';
import type { Schema as FirebaseSchema } from 'firebase/ai';
import { FIREBASE_AI_MODEL, FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY, FIREBASE_CONFIG } from './firebase-ai.config';
import type { AiProviderRequest, AiProviderTextResult } from './ai-provider-result.model';

type FirebaseAiModule = typeof FirebaseAi;
type FirebaseAppCheckModule = typeof FirebaseAppCheck;

interface FirebaseAiRuntime {
  readonly app: FirebaseApp;
  readonly ai: FirebaseAiModule;
}

@Injectable({ providedIn: 'root' })
export class FirebaseAiProvider {
  readonly mode = 'cloud' as const;
  readonly modelName = FIREBASE_AI_MODEL;

  private runtimePromise: Promise<FirebaseAiRuntime> | null = null;

  async generateText(request: AiProviderRequest): Promise<AiProviderTextResult> {
    const { app, ai: firebaseAi } = await this.runtime();
    const modelName = request.options.remoteModel;
    const ai = firebaseAi.getAI(app, { backend: new firebaseAi.GoogleAIBackend() });
    const model = firebaseAi.getGenerativeModel(ai, {
      model: modelName,
      generationConfig: {
        maxOutputTokens: request.options.maxTokens,
        temperature: request.options.temperature,
        topP: 0.82,
        responseMimeType: 'application/json',
        responseSchema: this.responseSchema(firebaseAi.Schema)
      },
      systemInstruction: request.systemInstruction
    });

    const response = await model.generateContent(request.contextJson);
    return {
      mode: this.mode,
      providerType: 'remote',
      modelName,
      text: response.response.text()
    };
  }

  private async runtime(): Promise<FirebaseAiRuntime> {
    if (!this.runtimePromise) {
      this.runtimePromise = this.initializeRuntime().catch((error: unknown) => {
        this.runtimePromise = null;
        throw error;
      });
    }

    return await this.runtimePromise;
  }

  private async initializeRuntime(): Promise<FirebaseAiRuntime> {
    const appCheckModulePromise: Promise<FirebaseAppCheckModule | null> = FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY
      ? import('firebase/app-check')
      : Promise.resolve(null);
    const [firebaseApp, firebaseAi, appCheck] = await Promise.all([import('firebase/app'), import('firebase/ai'), appCheckModulePromise]);
    const app = firebaseApp.initializeApp(FIREBASE_CONFIG);

    if (appCheck) {
      appCheck.initializeAppCheck(app, {
        provider: new appCheck.ReCaptchaEnterpriseProvider(FIREBASE_APP_CHECK_RECAPTCHA_ENTERPRISE_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
    }

    return { app, ai: firebaseAi };
  }

  private responseSchema(schema: FirebaseAiModule['Schema']): FirebaseSchema {
    const shapeProperties = {
      kind: schema.enumString({ enum: ['rectangle', 'circle', 'ellipse', 'line', 'text', 'triangle'] }),
      name: schema.string(),
      x: schema.number(),
      y: schema.number(),
      width: schema.number(),
      height: schema.number(),
      cx: schema.number(),
      cy: schema.number(),
      r: schema.number(),
      rx: schema.number(),
      ry: schema.number(),
      fromX: schema.number(),
      fromY: schema.number(),
      toX: schema.number(),
      toY: schema.number(),
      text: schema.string(),
      stroke: schema.string(),
      fill: schema.string(),
      color: schema.string(),
      strokeWidth: schema.number(),
      fontSize: schema.number(),
      arrowStart: schema.boolean(),
      arrowEnd: schema.boolean()
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
    const patchShape = schema.object({
      properties: shapeProperties,
      optionalProperties: optionalShapeProperties
    });
    const patchShapeUpdate = schema.object({
      properties: shapeProperties,
      optionalProperties: ['kind', ...optionalShapeProperties]
    });

    return schema.object({
      properties: {
        type: schema.enumString({ enum: ['message', 'scenePatch', 'tikzCode'] }),
        message: schema.string(),
        patch: schema.object({
          properties: {
            create: schema.array({ items: patchShape }),
            update: schema.array({
              items: schema.object({
                properties: {
                  id: schema.string(),
                  changes: patchShapeUpdate
                },
                optionalProperties: []
              })
            }),
            remove: schema.array({ items: schema.string() })
          },
          optionalProperties: ['create', 'update', 'remove']
        }),
        tikzCode: schema.string()
      },
      optionalProperties: ['patch', 'tikzCode']
    });
  }
}
