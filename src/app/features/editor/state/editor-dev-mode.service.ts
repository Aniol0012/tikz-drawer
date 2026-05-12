import { effect, inject, Injectable, signal } from '@angular/core';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';
import { EditorLocalStorageService } from './editor-local-storage.service';

@Injectable({ providedIn: 'root' })
export class EditorDevModeService {
  private readonly storage = inject(EditorLocalStorageService);
  private readonly storageKey = EDITOR_STORAGE_KEYS.devMode;

  readonly enabled = signal(this.restore());

  constructor() {
    effect(() => {
      this.storage.setString(this.storageKey, this.enabled() ? 'true' : 'false');
    });
  }

  toggle(): void {
    this.enabled.update((enabled) => !enabled);
  }

  restoreFromStorageEvent(key: string | null, newValue: string | null): boolean {
    if (key !== this.storageKey) {
      return false;
    }

    this.enabled.set(newValue === 'true');
    return true;
  }

  private restore(): boolean {
    return this.storage.getString(this.storageKey) === 'true';
  }
}
