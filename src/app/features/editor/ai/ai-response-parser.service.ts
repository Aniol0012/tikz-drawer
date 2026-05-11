import { Injectable } from '@angular/core';
import type { AiResponse, ScenePatch } from './ai-message.model';

@Injectable({ providedIn: 'root' })
export class AiResponseParserService {
  parse(rawText: string): AiResponse {
    const parsed = JSON.parse(rawText) as Partial<AiResponse>;
    const type = parsed.type === 'scenePatch' || parsed.type === 'tikzCode' ? parsed.type : 'message';
    const message = typeof parsed.message === 'string' && parsed.message.trim() ? parsed.message.trim() : 'Respuesta generada.';

    return {
      type,
      message,
      patch: type === 'scenePatch' ? this.normalizePatch(parsed.patch) : undefined,
      tikzCode: typeof parsed.tikzCode === 'string' ? parsed.tikzCode : undefined
    };
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
