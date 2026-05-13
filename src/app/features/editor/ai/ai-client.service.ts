import { Injectable, inject, signal } from '@angular/core';
import { AiResponseParserService } from './ai-response-parser.service';
import type { AiProviderTextResult } from './ai-provider-result.model';
import type { AiSceneContext } from './ai-scene-context.model';
import type { AiMessage, AiResponse } from './ai-message.model';
import { AiProviderSelectorService } from './ai-provider-selector.service';
import { AiSettingsService } from './ai-settings.service';

@Injectable({ providedIn: 'root' })
export class AiClientService {
  private readonly parser = inject(AiResponseParserService);
  private readonly providerSelector = inject(AiProviderSelectorService);
  private readonly settingsService = inject(AiSettingsService);

  readonly lastProviderMode = signal<'local' | 'cloud'>('cloud');
  readonly lastModelName = signal('');

  async sendPrompt(instruction: string, context: AiSceneContext, messages: readonly AiMessage[] = []): Promise<AiResponse> {
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
      return this.responseFromTextResult(result);
    } catch (error) {
      if (result.providerType === 'remote') {
        throw error;
      }

      return this.responseFromTextResult(await this.providerSelector.generateWithCloud(request));
    }
  }

  private responseFromTextResult(result: AiProviderTextResult): AiResponse {
    const response = this.parser.parse(result.text);
    this.lastProviderMode.set(result.mode);
    this.lastModelName.set(result.modelName);
    return {
      ...response,
      aiMode: result.mode,
      aiProviderType: result.providerType,
      aiModelName: result.modelName,
      aiDurationMs: result.durationMs,
      aiUsage: result.usage
    };
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
      'Cuando generes figuras, crea composiciones utiles: usa 3 a 8 elementos, tamaños proporcionados, alineacion clara, nombres descriptivos y colores armonicos.',
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
