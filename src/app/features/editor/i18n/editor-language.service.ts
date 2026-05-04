import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';
import type { CanvasShape } from '../models/tikz.models';
import { EditorLocalStorageService } from '../state/editor-local-storage.service';
import {
  type LanguageCode,
  isLanguageCode,
  localizedShapeKind,
  restoreLanguage,
  translate,
  translateOrFallback
} from './editor-page.i18n';

@Injectable({ providedIn: 'root' })
export class EditorLanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly editorStorage = inject(EditorLocalStorageService);
  private readonly languageStorageKey = EDITOR_STORAGE_KEYS.language;

  readonly language = signal<LanguageCode>(this.restoreStoredLanguage());

  constructor() {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === this.languageStorageKey && event.newValue) {
        this.applyStoredLanguage(event.newValue);
      }
    };

    this.document.defaultView?.addEventListener('storage', handleStorage);
    this.destroyRef.onDestroy(() => this.document.defaultView?.removeEventListener('storage', handleStorage));
  }

  setLanguage(language: LanguageCode): void {
    this.language.set(language);
    this.editorStorage.setString(this.languageStorageKey, language);
  }

  applyStoredLanguage(value: string): void {
    if (isLanguageCode(value)) {
      this.language.set(value);
    }
  }

  t(key: string): string {
    return translate(this.language(), key);
  }

  tOrFallback(key: string, fallback: string): string {
    return translateOrFallback(this.language(), key, fallback);
  }

  localizedShapeKind(kind: CanvasShape['kind']): string {
    return localizedShapeKind(this.language(), kind);
  }

  private restoreStoredLanguage(): LanguageCode {
    return restoreLanguage(this.editorStorage.getString(this.languageStorageKey));
  }
}
