import { Injectable } from '@angular/core';
import type { AiResponse, ScenePatch } from './ai-message.model';

@Injectable({ providedIn: 'root' })
export class AiResponseParserService {
  parse(rawText: string): AiResponse {
    const parsed = JSON.parse(this.extractJson(rawText)) as Partial<AiResponse>;
    const type = parsed.type === 'scenePatch' || parsed.type === 'tikzCode' ? parsed.type : 'message';
    const message = typeof parsed.message === 'string' && parsed.message.trim() ? parsed.message.trim() : 'Respuesta generada.';

    return {
      type,
      message,
      patch: type === 'scenePatch' ? this.normalizePatch(parsed.patch) : undefined,
      tikzCode: typeof parsed.tikzCode === 'string' ? parsed.tikzCode : undefined
    };
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
