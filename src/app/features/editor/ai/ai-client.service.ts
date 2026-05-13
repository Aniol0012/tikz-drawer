import { Injectable, inject, signal } from '@angular/core';
import { AiResponseParserService } from './ai-response-parser.service';
import type { AiProviderTextResult } from './ai-provider-result.model';
import type { AiSceneContext } from './ai-scene-context.model';
import type { AiMessage, AiResponse } from './ai-message.model';
import { AiProviderSelectorService } from './ai-provider-selector.service';
import { AiSettingsService } from './ai-settings.service';
import type { CanvasShape } from '../models/tikz.models';

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
      return this.responseFromTextResult(result, instruction);
    } catch (error) {
      console.warn('[Tikz Drawer AI]', 'parse:failed', {
        runtime: result.providerType,
        model: result.modelName,
        error: error instanceof Error ? error.message : String(error),
        rawPreview: result.text.slice(0, 2000)
      });

      if (result.providerType === 'remote' || !request.options.allowRemoteFallback) {
        throw error;
      }

      return this.responseFromTextResult(await this.providerSelector.generateWithCloud(request), instruction);
    }
  }

  private responseFromTextResult(result: AiProviderTextResult, instruction: string): AiResponse {
    const response = this.withLocalDrawingFallback(this.parser.parse(result.text), result, instruction);
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

  private withLocalDrawingFallback(response: AiResponse, result: AiProviderTextResult, instruction: string): AiResponse {
    if (result.providerType !== 'webllm' || response.type !== 'message' || response.message !== 'Respuesta generada.') {
      return response;
    }

    const patchShape = this.simpleShapeFromInstruction(instruction);
    return patchShape
      ? {
          type: 'scenePatch',
          message: 'He preparado una figura en el lienzo.',
          patch: { create: [patchShape], update: [], remove: [] }
        }
      : {
          ...response,
          message: 'No he podido generar una respuesta local clara.'
        };
  }

  private simpleShapeFromInstruction(instruction: string): Partial<CanvasShape> | null {
    const normalized = instruction
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
    if (!/(afegeix|afegir|posa|pon|crear|crea|anade|añade|dibuixa|dibuja)/.test(normalized)) {
      return null;
    }

    const colors = this.colorFromInstruction(normalized);
    if (/(cercle|circulo|circle)/.test(normalized)) {
      return {
        kind: 'circle',
        name: colors.name ? `Cercle ${colors.name}` : 'Cercle',
        cx: 0,
        cy: 0,
        r: /petit|pequeno|pequeño|small/.test(normalized) ? 0.7 : 1,
        stroke: colors.stroke,
        fill: colors.fill,
        strokeWidth: 0.06
      };
    }

    if (/(triangle)/.test(normalized)) {
      return {
        kind: 'triangle',
        name: colors.name ? `Triangle ${colors.name}` : 'Triangle',
        x: -1,
        y: -0.8,
        width: 2,
        height: 1.6,
        stroke: colors.stroke,
        fill: colors.fill,
        strokeWidth: 0.06
      };
    }

    if (/(elipse|ellipse)/.test(normalized)) {
      return {
        kind: 'ellipse',
        name: colors.name ? `Elipse ${colors.name}` : 'Elipse',
        cx: 0,
        cy: 0,
        rx: 1.3,
        ry: 0.75,
        stroke: colors.stroke,
        fill: colors.fill,
        strokeWidth: 0.06
      };
    }

    if (/(rectangle|rectangulo|rectangel|quadrat|cuadrado|square)/.test(normalized)) {
      const square = /(quadrat|cuadrado|square)/.test(normalized);
      return {
        kind: 'rectangle',
        name: colors.name ? `${square ? 'Quadrat' : 'Rectangle'} ${colors.name}` : square ? 'Quadrat' : 'Rectangle',
        x: -1,
        y: -0.6,
        width: square ? 1.2 : 2,
        height: square ? 1.2 : 1.2,
        stroke: colors.stroke,
        fill: colors.fill,
        strokeWidth: 0.06
      };
    }

    if (/(figura|forma|shape|element)/.test(normalized)) {
      return {
        kind: 'ellipse',
        name: colors.name ? `Figura ${colors.name}` : 'Figura',
        cx: 0,
        cy: 0,
        rx: 1.4,
        ry: 0.85,
        stroke: colors.stroke,
        fill: colors.fill,
        strokeWidth: 0.06
      };
    }

    return null;
  }

  private colorFromInstruction(instruction: string): { readonly name: string; readonly stroke: string; readonly fill: string } {
    if (/(verd|verde|green)/.test(instruction)) {
      return { name: 'verd', stroke: '#16a34a', fill: '#dcfce7' };
    }
    if (/(vermell|rojo|red)/.test(instruction)) {
      return { name: 'vermell', stroke: '#dc2626', fill: '#fee2e2' };
    }
    if (/(groc|amarillo|yellow)/.test(instruction)) {
      return { name: 'groc', stroke: '#d97706', fill: '#fef3c7' };
    }
    if (/(blau|azul|blue)/.test(instruction)) {
      return { name: 'blau', stroke: '#1d4ed8', fill: '#dbeafe' };
    }

    return { name: '', stroke: '#1f2937', fill: '#f1f5f9' };
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
      'Si el usuario pide poner, añadir o crear una figura en el canvas/lienzo, responde siempre con type="scenePatch" y al menos un elemento en patch.create.',
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
