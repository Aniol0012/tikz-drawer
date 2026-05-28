import { Injectable, inject } from '@angular/core';
import { EditorLanguageService } from '../i18n/editor-language.service';
import { translate } from '../i18n/editor-page.i18n';
import type { AiResponse, AiResponseParseStatus, ScenePatch } from './ai-message.model';

@Injectable({ providedIn: 'root' })
export class AiResponseParserService {
  private readonly languageService = inject(EditorLanguageService, { optional: true });

  parse(rawText: string): AiResponse {
    if (this.compactPromptEcho(this.cleanTextFallback(rawText))) {
      return this.textFallback(rawText);
    }

    const parsedResult = this.parseCandidate(rawText);
    if (!parsedResult) {
      return this.textFallback(rawText);
    }

    const parsed = parsedResult.value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return this.textFallback(rawText);
    }

    const responseCandidate = parsed as Partial<AiResponse> & Record<string, unknown>;
    const patch = this.normalizePatch(responseCandidate.patch ?? this.patchFromTopLevel(responseCandidate));
    const hasPatchChanges = patch.create.length > 0 || patch.update.length > 0 || patch.remove.length > 0;
    const tikzCode = this.firstString(responseCandidate, ['tikzCode', 'tikz', 'latex', 'code']);
    const message = this.firstString(responseCandidate, ['message', 'text', 'answer', 'content', 'response', 'explanation']);
    const type =
      responseCandidate.type === 'scenePatch' || hasPatchChanges ? 'scenePatch' : responseCandidate.type === 'tikzCode' || tikzCode ? 'tikzCode' : 'message';
    const parseStatus = this.responseParseStatus(responseCandidate, parsedResult.status, message, hasPatchChanges, tikzCode);
    const fallbackMessage = this.languageService?.t('ai.errorUnclearResponse') ?? translate('en', 'ai.errorUnclearResponse');

    return {
      type,
      message:
        parseStatus === 'placeholder-json'
          ? fallbackMessage
          : message || (this.languageService?.t('ai.responseGenerated') ?? translate('en', 'ai.responseGenerated')),
      patch: type === 'scenePatch' ? patch : undefined,
      tikzCode,
      parseStatus
    };
  }

  private parseCandidate(rawText: string): { readonly value: unknown; readonly status: AiResponseParseStatus } | null {
    const jsonText = this.extractJson(rawText);
    if (!this.looksLikeJson(jsonText)) {
      return null;
    }

    return this.parseJson(jsonText);
  }

  private parseJson(jsonText: string): { readonly value: unknown; readonly status: AiResponseParseStatus } | null {
    try {
      return { value: JSON.parse(jsonText), status: 'json' };
    } catch {
      try {
        return { value: JSON.parse(this.repairJson(jsonText)), status: 'json-repaired' };
      } catch {
        return null;
      }
    }
  }

  private extractJson(rawText: string): string {
    const trimmed = rawText.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }

    const fencedMatch = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i.exec(trimmed);
    if (fencedMatch?.[1]) {
      return fencedMatch[1];
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }

    return trimmed;
  }

  private looksLikeJson(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[');
  }

  private repairJson(jsonText: string): string {
    const balanced = this.balanceJsonObject(jsonText)
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/-?\d+\.\d{6,}/g, (value: string) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? String(Number(numericValue.toFixed(3))) : value;
      });

    return balanced;
  }

  private balanceJsonObject(jsonText: string): string {
    const firstBrace = jsonText.indexOf('{');
    if (firstBrace < 0) {
      return jsonText;
    }

    let inString = false;
    let escaping = false;
    const stack: string[] = [];
    for (let index = firstBrace; index < jsonText.length; index++) {
      const character = jsonText[index];
      if (escaping) {
        escaping = false;
        continue;
      }

      if (character === '\\') {
        escaping = true;
        continue;
      }

      if (character === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (character === '{' || character === '[') {
        stack.push(character);
      } else if (character === '}' || character === ']') {
        stack.pop();
        if (!stack.length) {
          return jsonText.slice(firstBrace, index + 1);
        }
      }
    }

    return `${jsonText.slice(firstBrace)}${stack
      .reverse()
      .map((character) => (character === '[' ? ']' : '}'))
      .join('')}`;
  }

  private normalizePatch(patch: unknown): ScenePatch {
    if (!patch || typeof patch !== 'object') {
      return { create: [], update: [], remove: [] };
    }

    const candidate = patch as Partial<ScenePatch>;
    return {
      create: Array.isArray(candidate.create) ? candidate.create : [],
      update: Array.isArray(candidate.update) ? candidate.update.filter((entry) => !!entry?.id && typeof entry.id === 'string') : [],
      remove: Array.isArray(candidate.remove) ? candidate.remove.filter((id): id is string => typeof id === 'string') : []
    };
  }

  private patchFromTopLevel(candidate: Record<string, unknown>): Partial<ScenePatch> | null {
    if (candidate['create'] || candidate['update'] || candidate['remove']) {
      return {
        create: candidate['create'] as ScenePatch['create'],
        update: candidate['update'] as ScenePatch['update'],
        remove: candidate['remove'] as ScenePatch['remove']
      };
    }

    const topLevelShape = this.shapeFromTopLevel(candidate);
    if (topLevelShape) {
      return { create: [topLevelShape], update: [], remove: [] };
    }

    const shapes = this.shapesFromTopLevel(candidate['shapes'] ?? candidate['elements']);
    if (shapes.length) {
      return { create: shapes, update: [], remove: [] };
    }

    return null;
  }

  private shapesFromTopLevel(value: unknown): readonly Record<string, unknown>[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => (entry && typeof entry === 'object' && !Array.isArray(entry) ? this.shapeFromTopLevel(entry as Record<string, unknown>) : null))
      .filter((entry): entry is Record<string, unknown> => !!entry);
  }

  private shapeFromTopLevel(candidate: Record<string, unknown>): Record<string, unknown> | null {
    const kind = candidate['kind'];
    if (typeof kind !== 'string' || !this.nativeShapeKind(kind)) {
      return null;
    }

    const shape: Record<string, unknown> = {
      ...this.objectRecord(candidate['geometry']),
      ...this.objectRecord(candidate['style']),
      ...candidate,
      kind
    };
    delete shape['geometry'];
    delete shape['style'];
    delete shape['type'];
    delete shape['patch'];
    delete shape['create'];
    delete shape['update'];
    delete shape['remove'];
    return shape;
  }

  private objectRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private nativeShapeKind(kind: string): boolean {
    return kind === 'rectangle' || kind === 'circle' || kind === 'ellipse' || kind === 'line' || kind === 'text' || kind === 'triangle';
  }

  private firstString(candidate: Record<string, unknown>, keys: readonly string[]): string | undefined {
    for (const key of keys) {
      const value = candidate[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return undefined;
  }

  private emptyResponse(candidate: Record<string, unknown>, message: string | undefined, hasPatchChanges: boolean, tikzCode: string | undefined): boolean {
    return !message && !hasPatchChanges && !tikzCode && Object.keys(candidate).length === 0;
  }

  private responseParseStatus(
    candidate: Record<string, unknown>,
    status: AiResponseParseStatus,
    message: string | undefined,
    hasPatchChanges: boolean,
    tikzCode: string | undefined
  ): AiResponseParseStatus {
    if (this.emptyResponse(candidate, message, hasPatchChanges, tikzCode)) {
      return 'empty-json';
    }

    if (this.promptEchoResponse(candidate, message, hasPatchChanges, tikzCode)) {
      return 'prompt-echo';
    }

    if (this.placeholderResponse(message, hasPatchChanges, tikzCode)) {
      return 'placeholder-json';
    }

    return status;
  }

  private placeholderResponse(message: string | undefined, hasPatchChanges: boolean, tikzCode: string | undefined): boolean {
    return !hasPatchChanges && !tikzCode && !!message && /^\.{2,}$/.test(message.trim());
  }

  private promptEchoResponse(candidate: Record<string, unknown>, message: string | undefined, hasPatchChanges: boolean, tikzCode: string | undefined): boolean {
    return (
      !message &&
      !hasPatchChanges &&
      !tikzCode &&
      typeof candidate['instruction'] === 'string' &&
      (candidate['now'] !== undefined || candidate['scene'] !== undefined || candidate['context'] !== undefined || candidate['conversation'] !== undefined)
    );
  }

  private textFallback(rawText: string): AiResponse {
    const cleaned = this.cleanTextFallback(rawText);
    const parseStatus = this.compactPromptEcho(cleaned) ? 'compact-prompt-echo' : 'text-fallback';
    return {
      type: 'message',
      message:
        parseStatus === 'compact-prompt-echo'
          ? (this.languageService?.t('ai.errorUnclearResponse') ?? translate('en', 'ai.errorUnclearResponse'))
          : cleaned || (this.languageService?.t('ai.errorUnclearResponse') ?? translate('en', 'ai.errorUnclearResponse')),
      parseStatus
    };
  }

  private cleanTextFallback(rawText: string): string {
    return rawText
      .trim()
      .replace(/^```(?:json|text)?/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  private compactPromptEcho(text: string): boolean {
    const normalized = text.trim();
    const hasPromptLine = (key: string): boolean => this.localizedTerms(key).some((term) => this.lineStartsWith(normalized, term));
    return (
      this.localizedTerms('ai.promptEcho.phrases').some((term) => normalized.toLowerCase().includes(term.toLowerCase())) ||
      hasPromptLine('ai.promptEcho.taskLabels') ||
      (hasPromptLine('ai.promptEcho.selectionLabels') && hasPromptLine('ai.promptEcho.elementLabels')) ||
      (/^- id[:=]/m.test(normalized) && /^- kind[:=]/m.test(normalized)) ||
      (/^FECTO:/m.test(normalized) && /^- id[:=]/m.test(normalized)) ||
      (hasPromptLine('ai.promptEcho.dateLabels') && hasPromptLine('ai.promptEcho.sceneLabels') && hasPromptLine('ai.promptEcho.elementLabels'))
    );
  }

  private localizedTerms(key: string): readonly string[] {
    return (this.languageService?.t(key) ?? translate('en', key))
      .split('|')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private lineStartsWith(text: string, term: string): boolean {
    return new RegExp(`^\\s*${this.escapeRegExp(term)}\\s*:`, 'im').test(text);
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
