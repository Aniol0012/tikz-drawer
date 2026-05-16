import { Injectable, Optional } from '@angular/core';
import { EditorLanguageService } from '../i18n/editor-language.service';
import { translate } from '../i18n/editor-page.i18n';
import type { AiResponse, ScenePatch } from './ai-message.model';

@Injectable({ providedIn: 'root' })
export class AiResponseParserService {
  constructor(@Optional() private readonly languageService?: EditorLanguageService) {}

  parse(rawText: string): AiResponse {
    const parsed = this.parseJson(this.extractJson(rawText)) as Partial<AiResponse>;
    const patch = this.normalizePatch(parsed.patch);
    const hasPatchChanges = patch.create.length > 0 || patch.update.length > 0 || patch.remove.length > 0;
    const type = parsed.type === 'scenePatch' || hasPatchChanges ? 'scenePatch' : parsed.type === 'tikzCode' ? 'tikzCode' : 'message';
    const message =
      typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message.trim()
        : (this.languageService?.t('ai.responseGenerated') ?? translate('en', 'ai.responseGenerated'));

    return {
      type,
      message,
      patch: type === 'scenePatch' ? patch : undefined,
      tikzCode: typeof parsed.tikzCode === 'string' ? parsed.tikzCode : undefined
    };
  }

  private parseJson(jsonText: string): unknown {
    try {
      return JSON.parse(jsonText);
    } catch {
      return JSON.parse(this.repairJson(jsonText));
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
}
