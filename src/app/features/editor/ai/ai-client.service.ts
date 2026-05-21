import { Injectable, inject, signal } from '@angular/core';
import { AiResponseParserService } from './ai-response-parser.service';
import type { AiProviderTextResult } from './ai-provider-result.model';
import type { AiSceneContext } from './ai-scene-context.model';
import type { AiMessage, AiResponse } from './ai-message.model';
import { AiProviderSelectorService } from './ai-provider-selector.service';
import { AiSettingsService } from './ai-settings.service';
import type { CanvasShape } from '../models/tikz.models';
import { EditorLanguageService } from '../i18n/editor-language.service';
import { EditorDevModeService } from '../state/editor-dev-mode.service';

@Injectable({ providedIn: 'root' })
export class AiClientService {
  private readonly parser = inject(AiResponseParserService);
  private readonly providerSelector = inject(AiProviderSelectorService);
  private readonly settingsService = inject(AiSettingsService);
  private readonly languageService = inject(EditorLanguageService);
  private readonly devModeService = inject(EditorDevModeService);

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
      const response = this.responseFromTextResult(result, instruction);
      if (this.shouldRetryPromptEchoWithCloud(response, result, instruction, request.options.allowRemoteFallback)) {
        this.logWarning('prompt-echo:cloud-fallback', {
          runtime: result.providerType,
          model: result.modelName,
          instruction,
          rawPreview: this.previewText(result.text)
        });
        return this.responseFromTextResult(await this.providerSelector.generateWithCloud(request), instruction);
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

      return this.responseFromTextResult(await this.providerSelector.generateWithCloud(request), instruction);
    }
  }

  private responseFromTextResult(result: AiProviderTextResult, instruction: string): AiResponse {
    const response = this.withLocalDrawingFallback(this.parser.parse(result.text), result, instruction);
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

  private withLocalDrawingFallback(response: AiResponse, result: AiProviderTextResult, instruction: string): AiResponse {
    if (result.providerType === 'webllm' && response.parseStatus === 'prompt-echo' && this.isConversationalInstruction(instruction)) {
      return {
        ...response,
        message: this.conversationFallbackMessage(instruction),
        parseStatus: 'local-conversation-fallback'
      };
    }

    if (result.providerType !== 'webllm' || response.type !== 'message') {
      return response;
    }

    const patchShapes = this.simpleShapesFromInstruction(instruction);
    if (patchShapes.length && this.shouldUseSimpleDrawingFallback(response)) {
      return {
        type: 'scenePatch',
        message: this.languageService.t('ai.simpleProposalReady'),
        patch: { create: patchShapes, update: [], remove: [] }
      };
    }

    return response.message === this.languageService.t('ai.responseGenerated')
      ? {
          ...response,
          message: this.languageService.t('ai.errorUnclearResponse')
        }
      : response;
  }

  private shouldUseSimpleDrawingFallback(response: AiResponse): boolean {
    return response.message === this.languageService.t('ai.responseGenerated') || response.parseStatus === 'prompt-echo' || response.parseStatus === 'text-fallback';
  }

  private shouldRetryPromptEchoWithCloud(response: AiResponse, result: AiProviderTextResult, instruction: string, allowRemoteFallback: boolean): boolean {
    return result.providerType === 'webllm' && allowRemoteFallback && response.parseStatus === 'prompt-echo' && !this.isConversationalInstruction(instruction);
  }

  private isConversationalInstruction(instruction: string): boolean {
    const normalized = this.normalizeConversationInput(instruction);
    return this.greetingInputs().includes(normalized) || this.thanksInputs().includes(normalized);
  }

  private conversationFallbackMessage(instruction: string): string {
    const normalized = this.normalizeConversationInput(instruction);
    if (this.thanksInputs().includes(normalized)) {
      return this.languageService.t('ai.localThanksFallback');
    }

    return this.languageService.t('ai.localGreetingFallback');
  }

  private greetingInputs(): readonly string[] {
    return [...this.localizedConversationInputs('ai.localGreetingInputs'), ...this.localizedConversationInputs('ai.commonGreetingInputs')];
  }

  private thanksInputs(): readonly string[] {
    return [...this.localizedConversationInputs('ai.localThanksInputs'), ...this.localizedConversationInputs('ai.commonThanksInputs')];
  }

  private localizedConversationInputs(key: string): readonly string[] {
    return this.languageService
      .t(key)
      .split('|')
      .map((entry) => this.normalizeConversationInput(entry))
      .filter(Boolean);
  }

  private normalizeConversationInput(instruction: string): string {
    return this.normalizeInstruction(instruction)
      .replace(/[!¡?¿.]+$/g, '')
      .trim();
  }

  private normalizeInstruction(instruction: string): string {
    return instruction
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }

  private simpleShapesFromInstruction(instruction: string): readonly Partial<CanvasShape>[] {
    const normalized = this.normalizeInstruction(instruction);
    if (!/(afegeix|afegir|posa|pon|crear|crea|anade|añade|dibuixa|dibuja)/.test(normalized)) {
      return [];
    }

    const colors = this.colorFromInstruction(normalized);
    const count = this.shapeCountFromInstruction(normalized);
    const requestedKinds = this.requestedSimpleShapeKinds(normalized);
    if (requestedKinds.length > 1) {
      return this.composedSimpleShapes(requestedKinds, colors);
    }

    if (/(cercle|circulo|circle)/.test(normalized)) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'circle',
        name: this.languageService.localizedShapeKind('circle'),
        cx: x,
        cy: y,
        r: /petit|pequeno|pequeño|small/.test(normalized) ? 0.7 : 1,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (/(triangle)/.test(normalized)) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'triangle',
        name: this.languageService.localizedShapeKind('triangle'),
        x: x - 1,
        y: y - 0.8,
        width: 2,
        height: 1.6,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (/(elipse|ellipse)/.test(normalized)) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'ellipse',
        name: this.languageService.localizedShapeKind('ellipse'),
        cx: x,
        cy: y,
        rx: 1.3,
        ry: 0.75,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (/(rectangle|rectangulo|rectangel|quadrat|cuadrat|cuadrado|square)/.test(normalized)) {
      const square = /(quadrat|cuadrat|cuadrado|square)/.test(normalized);
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'rectangle',
        name: this.languageService.localizedShapeKind('rectangle'),
        x: x - (square ? 0.6 : 1),
        y: y - 0.6,
        width: square ? 1.2 : 2,
        height: square ? 1.2 : 1.2,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    if (/(fletxa|flecha|arrow)/.test(normalized)) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => this.simpleLineShape(x, y, color.stroke));
    }

    if (/(figura|forma|shape|element)/.test(normalized)) {
      return this.repeatGeneratedShapes(count, (_index, x, y, color) => ({
        kind: 'ellipse',
        name: this.languageService.localizedShapeKind('ellipse'),
        cx: x,
        cy: y,
        rx: 1.4,
        ry: 0.85,
        stroke: count > 1 ? color.stroke : colors.stroke,
        fill: count > 1 ? color.fill : colors.fill,
        strokeWidth: 0.06
      }));
    }

    return [];
  }

  private requestedSimpleShapeKinds(instruction: string): readonly ('circle' | 'triangle' | 'ellipse' | 'rectangle' | 'square' | 'line')[] {
    const kinds: ('circle' | 'triangle' | 'ellipse' | 'rectangle' | 'square' | 'line')[] = [];
    if (/(cercle|circulo|circle)/.test(instruction)) {
      kinds.push('circle');
    }
    if (/(triangle)/.test(instruction)) {
      kinds.push('triangle');
    }
    if (/(elipse|ellipse)/.test(instruction)) {
      kinds.push('ellipse');
    }
    if (/(quadrat|cuadrat|cuadrado|square)/.test(instruction)) {
      kinds.push('square');
    } else if (/(rectangle|rectangulo|rectangel)/.test(instruction)) {
      kinds.push('rectangle');
    }
    if (/(fletxa|flecha|arrow)/.test(instruction)) {
      kinds.push('line');
    }

    return [...new Set(kinds)];
  }

  private composedSimpleShapes(
    kinds: readonly ('circle' | 'triangle' | 'ellipse' | 'rectangle' | 'square' | 'line')[],
    colors: { readonly stroke: string; readonly fill: string }
  ): readonly Partial<CanvasShape>[] {
    const safeKinds = kinds.slice(0, 8);
    return safeKinds.map((kind, index) => {
      const x = (index - (safeKinds.length - 1) / 2) * 2.4;
      switch (kind) {
        case 'circle':
          return {
            kind: 'circle',
            name: this.languageService.localizedShapeKind('circle'),
            cx: x,
            cy: 0,
            r: 0.75,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'triangle':
          return {
            kind: 'triangle',
            name: this.languageService.localizedShapeKind('triangle'),
            x: x - 0.85,
            y: -0.7,
            width: 1.7,
            height: 1.4,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'ellipse':
          return {
            kind: 'ellipse',
            name: this.languageService.localizedShapeKind('ellipse'),
            cx: x,
            cy: 0,
            rx: 1.05,
            ry: 0.65,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'square':
          return {
            kind: 'rectangle',
            name: this.languageService.localizedShapeKind('rectangle'),
            x: x - 0.65,
            y: -0.65,
            width: 1.3,
            height: 1.3,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'rectangle':
          return {
            kind: 'rectangle',
            name: this.languageService.localizedShapeKind('rectangle'),
            x: x - 1,
            y: -0.55,
            width: 2,
            height: 1.1,
            stroke: colors.stroke,
            fill: colors.fill,
            strokeWidth: 0.06
          };
        case 'line':
          return this.simpleLineShape(x, 0, colors.stroke);
      }
    });
  }

  private simpleLineShape(x: number, y: number, stroke: string): Partial<CanvasShape> {
    return {
      kind: 'line',
      name: this.languageService.localizedShapeKind('line'),
      from: { x: x - 0.9, y },
      to: { x: x + 0.9, y },
      stroke,
      strokeWidth: 0.06,
      arrowEnd: true
    };
  }

  private repeatGeneratedShapes(
    count: number,
    createShape: (index: number, x: number, y: number, color: { readonly stroke: string; readonly fill: string }) => Partial<CanvasShape>
  ): readonly Partial<CanvasShape>[] {
    const safeCount = Math.min(Math.max(count, 1), 8);
    const columns = Math.ceil(Math.sqrt(safeCount));
    const rows = Math.ceil(safeCount / columns);
    const palette = [
      { stroke: '#1d4ed8', fill: '#dbeafe' },
      { stroke: '#16a34a', fill: '#dcfce7' },
      { stroke: '#d97706', fill: '#fef3c7' },
      { stroke: '#7c3aed', fill: '#ede9fe' },
      { stroke: '#dc2626', fill: '#fee2e2' },
      { stroke: '#0891b2', fill: '#cffafe' },
      { stroke: '#4f46e5', fill: '#e0e7ff' },
      { stroke: '#be123c', fill: '#ffe4e6' }
    ] as const;

    return Array.from({ length: safeCount }, (_, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return createShape(index, (column - (columns - 1) / 2) * 2.25, ((rows - 1) / 2 - row) * 2, palette[index % palette.length]);
    });
  }

  private shapeCountFromInstruction(instruction: string): number {
    const digitMatch = /\b([2-8])\b/.exec(instruction);
    if (digitMatch?.[1]) {
      return Number(digitMatch[1]);
    }

    const countWords: readonly [RegExp, number][] = [
      [/\b(dos|dues|two)\b/, 2],
      [/\b(tres|three)\b/, 3],
      [/\b(quatre|cuatro|four)\b/, 4],
      [/\b(cinc|cinco|five)\b/, 5],
      [/\b(sis|seis|six)\b/, 6],
      [/\b(set|siete|seven)\b/, 7],
      [/\b(vuit|ocho|eight)\b/, 8]
    ];
    return countWords.find(([pattern]) => pattern.test(instruction))?.[1] ?? 1;
  }

  private colorFromInstruction(instruction: string): { readonly stroke: string; readonly fill: string } {
    if (/(verd|verde|green)/.test(instruction)) {
      return { stroke: '#16a34a', fill: '#dcfce7' };
    }
    if (/(vermell|rojo|red)/.test(instruction)) {
      return { stroke: '#dc2626', fill: '#fee2e2' };
    }
    if (/(groc|amarillo|yellow)/.test(instruction)) {
      return { stroke: '#d97706', fill: '#fef3c7' };
    }
    if (/(blau|azul|blue)/.test(instruction)) {
      return { stroke: '#1d4ed8', fill: '#dbeafe' };
    }

    return { stroke: '#1f2937', fill: '#f1f5f9' };
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
