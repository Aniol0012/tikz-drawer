import { Injectable } from '@angular/core';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';

export type EditorStorageKey = (typeof EDITOR_STORAGE_KEYS)[keyof typeof EDITOR_STORAGE_KEYS];

@Injectable({ providedIn: 'root' })
export class EditorLocalStorageService {
  private readonly storage = typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;

  getString(key: EditorStorageKey): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  setString(key: EditorStorageKey, value: string): void {
    try {
      this.storage?.setItem(key, value);
    } catch {
      return;
    }
  }

  getJson<T>(key: EditorStorageKey): T | null {
    return this.parseJson<T>(this.getString(key));
  }

  setJson(key: EditorStorageKey, value: unknown): void {
    try {
      this.setString(key, JSON.stringify(value));
    } catch {
      return;
    }
  }

  parseJson<T>(raw: string | null | undefined): T | null {
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}
