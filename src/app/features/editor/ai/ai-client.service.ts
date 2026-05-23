import { Injectable, inject, signal } from '@angular/core';
import { AiResponseParserService } from './ai-response-parser.service';
import type { AiProviderTextResult } from './ai-provider-result.model';
import type { AiSceneContext } from './ai-scene-context.model';
import type { AiMessage, AiResponse } from './ai-message.model';
import { AiProviderSelectorService } from './ai-provider-selector.service';
import { AiSettingsService } from './ai-settings.service';
import { EditorDevModeService } from '../state/editor-dev-mode.service';
import { AiModelResponseResolverService } from './model-resolvers/ai-model-response-resolver.service';

@Injectable({ providedIn: 'root' })
export class AiClientService {
  private readonly parser = inject(AiResponseParserService);
  private readonly providerSelector = inject(AiProviderSelectorService);
  private readonly settingsService = inject(AiSettingsService);
  private readonly devModeService = inject(EditorDevModeService);
  private readonly modelResolver = inject(AiModelResponseResolverService);

  readonly lastProviderMode = signal<'local' | 'cloud'>('cloud');
  readonly lastModelName = signal('');

  resolveBeforeProvider(instruction: string, context: AiSceneContext): AiResponse | null {
    return this.modelResolver.resolvePreflight(instruction, context);
  }

  async sendPrompt(instruction: string, context: AiSceneContext, messages: readonly AiMessage[] = []): Promise<AiResponse> {
    const preflightResponse = this.resolveBeforeProvider(instruction, context);
    if (preflightResponse) {
      this.logLocalResponse(preflightResponse);
      return preflightResponse;
    }

    const request = {
      instruction,
      contextJson: JSON.stringify({
        instruction,
        now: {
          iso: new Date().toISOString(),
          locale: Intl.DateTimeFormat().resolvedOptions().locale,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        context,
        conversation: this.conversationForPrompt(messages)
      }),
      systemInstruction: this.systemInstruction(),
      options: this.settingsService.settings()
    };

    const result = await this.providerSelector.generateText(request);
    try {
      const response = this.responseFromTextResult(result, instruction, context);
      if (this.modelResolver.shouldRetryWithCloud(instruction, context, response, result, request.options.allowRemoteFallback)) {
        this.logWarning('prompt-echo:cloud-fallback', {
          runtime: result.providerType,
          model: result.modelName,
          instruction,
          rawPreview: this.previewText(result.text)
        });
        return this.responseFromTextResult(await this.providerSelector.generateWithCloud(request), instruction, context);
      }

      return response;
    } catch (error) {
      this.logWarning('parse:failed', {
        runtime: result.providerType,
        model: result.modelName,
        error: error instanceof Error ? error.message : String(error),
        rawPreview: result.text.slice(0, 2000)
      });

      if (result.providerType === 'remote' || !request.options.allowRemoteFallback) {
        throw error;
      }

      return this.responseFromTextResult(await this.providerSelector.generateWithCloud(request), instruction, context);
    }
  }

  private responseFromTextResult(result: AiProviderTextResult, instruction: string, context: AiSceneContext): AiResponse {
    const response = this.modelResolver.resolve(instruction, context, this.parser.parse(result.text), result);
    this.logProviderResponse(result, response);
    this.lastProviderMode.set(result.mode);
    this.lastModelName.set(result.modelName);
    return {
      ...response,
      rawTextPreview: this.previewText(result.text),
      aiMode: result.mode,
      aiProviderType: result.providerType,
      aiModelName: result.modelName,
      aiDurationMs: result.durationMs,
      aiUsage: result.usage
    };
  }

  private logProviderResponse(result: AiProviderTextResult, response: AiResponse): void {
    if (!this.debugLogsEnabled()) {
      return;
    }

    console.debug('[Tikz Drawer AI]', 'provider:response', {
      runtime: result.providerType,
      mode: result.mode,
      model: result.modelName,
      durationMs: result.durationMs,
      usage: result.usage,
      parseStatus: response.parseStatus,
      responseType: response.type,
      hasPatch: !!response.patch,
      hasTikzCode: !!response.tikzCode,
      messagePreview: this.previewText(response.message),
      rawPreview: this.previewText(result.text)
    });
  }

  private logLocalResponse(response: AiResponse): void {
    if (!this.debugLogsEnabled()) {
      return;
    }

    console.debug('[Tikz Drawer AI]', 'resolver:response', {
      parseStatus: response.parseStatus,
      responseType: response.type,
      hasPatch: !!response.patch,
      messagePreview: this.previewText(response.message)
    });
  }

  private logWarning(event: string, details: Record<string, unknown>): void {
    if (!this.debugLogsEnabled()) {
      return;
    }

    console.warn('[Tikz Drawer AI]', event, details);
  }

  private debugLogsEnabled(): boolean {
    return this.devModeService.enabled() && this.settingsService.settings().debugLogs;
  }

  private previewText(text: string): string {
    return text.trim().slice(0, 1200);
  }

  private conversationForPrompt(messages: readonly AiMessage[]): readonly { readonly role: string; readonly text: string }[] {
    return messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-10)
      .map((message) => ({
        role: message.role,
        text: message.text
      }));
  }

  private systemInstruction(): string {
    return [
      'Eres el asistente contextual de Tikz Drawer.',
      'Responde siempre con un unico objeto JSON valido, sin markdown ni texto fuera del JSON.',
      'Formato: {"type":"message"|"scenePatch"|"tikzCode","message":"...","patch":{...},"tikzCode":"..."}',
      'Si el usuario conversa o pregunta datos generales, responde con type="message". Usa el campo now para fechas y horas.',
      'Si el usuario pide dibujar, ordenar, etiquetar o editar, propone scenePatch editable y explica brevemente el cambio en message.',
      'Si el usuario pide poner, añadir o crear una o varias figuras en el canvas/lienzo, responde siempre con type="scenePatch" y todos los elementos necesarios en patch.create.',
      'Cuando generes figuras, crea composiciones utiles: usa 3 a 8 elementos, tamaños proporcionados, alineacion clara, nombres descriptivos y colores armonicos.',
      'Ejemplo de patch.create valido: {"kind":"rectangle","name":"Bloque","x":-1,"y":-1,"width":2,"height":1,"stroke":"#1d4ed8","fill":"#dbeafe","strokeWidth":0.04}.',
      'Usa coordenadas y tamaños cortos, con maximo 2 decimales. No generes numeros largos.',
      'No generes formas todas grises salvo que el usuario lo pida. Usa fill y stroke con hex: por ejemplo #dbeafe, #bfdbfe, #1d4ed8, #dcfce7, #16a34a, #fef3c7, #d97706.',
      'Para diagramas de flujo usa rectangulos, circulos/triangulos si conviene, lineas con arrowEnd y etiquetas cortas. Coloca los elementos con separacion suficiente.',
      'Para peticiones vagas como "pon cuadrados", genera una propuesta visual agradable: varios cuadrados de colores, ordenados o en patron, no un solo bloque sin estilo.',
      'Si el usuario pide TikZ o correccion de codigo, responde con tikzCode y una explicacion corta.',
      'No mutas el canvas directamente: todos los cambios deben ir como patch para previsualizar y aplicar manualmente.',
      'Puedes usar el historial de conversation para mantener contexto, pero no inventes cambios no solicitados.',
      'No elimines ni modifiques elementos bloqueados.',
      'Para scenePatch usa solo tipos nativos: rectangle, circle, ellipse, line, text, triangle.',
      'Prefiere patches pequenos, validables y con nombres claros; conserva IDs existentes al actualizar.',
      'Se breve y decide rapido. Para respuestas conversacionales usa 1 o 2 frases.',
      'Para scenePatch evita planes largos: devuelve directamente los elementos necesarios.',
      'La app validara todo y el usuario aplicara manualmente los cambios.'
    ].join('\n');
  }
}
