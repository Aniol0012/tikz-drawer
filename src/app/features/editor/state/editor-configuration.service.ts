import { effect, inject, Injectable, signal } from '@angular/core';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';
import { CODE_HIGHLIGHT_THEMES, DEFAULT_LATEX_EXPORT_CONFIG, type CodeHighlightTheme, type LatexExportConfig } from '../config/latex-export.config';
import {
  normalizeLatexExportConfig,
  parseStoredLatexExportConfig,
  restoreCodeHighlightThemeFromStorage,
  serializableLatexExportConfig
} from '../utils/editor-storage.utils';
import { EditorLocalStorageService } from './editor-local-storage.service';

@Injectable()
export class EditorConfigurationService {
  private readonly editorStorage = inject(EditorLocalStorageService);
  private readonly codeThemeStorageKey = EDITOR_STORAGE_KEYS.codeTheme;
  private readonly latexExportConfigStorageKey = EDITOR_STORAGE_KEYS.latexExportConfig;

  readonly codeHighlightTheme = signal<CodeHighlightTheme>(this.restoreCodeHighlightTheme());
  readonly latexExportConfig = signal<LatexExportConfig>(this.restoreLatexExportConfig());

  constructor() {
    effect(() => {
      this.editorStorage.setString(this.codeThemeStorageKey, this.codeHighlightTheme());
    });

    effect(() => {
      this.editorStorage.setJson(this.latexExportConfigStorageKey, serializableLatexExportConfig(this.latexExportConfig()));
    });
  }

  setCodeHighlightTheme(theme: string): void {
    if (CODE_HIGHLIGHT_THEMES.includes(theme as CodeHighlightTheme)) {
      this.codeHighlightTheme.set(theme as CodeHighlightTheme);
    }
  }

  patchLatexExportConfig(patch: Partial<LatexExportConfig>): void {
    this.latexExportConfig.update((config) => ({
      ...config,
      ...patch
    }));
  }

  setLatexExportConfig(config: Partial<LatexExportConfig> | null | undefined, preserveFreeText = true): void {
    this.latexExportConfig.set(this.normalizeLatexExportConfig(config, preserveFreeText));
  }

  restoreFromStorageEvent(key: string | null, newValue: string | null): boolean {
    if (key === this.codeThemeStorageKey && newValue) {
      this.setCodeHighlightTheme(newValue);
      return true;
    }

    if (key === this.latexExportConfigStorageKey) {
      this.latexExportConfig.set(this.parseStoredLatexExportConfig(newValue));
      return true;
    }

    return false;
  }

  resetToDefaults(): void {
    this.codeHighlightTheme.set('aurora');
    this.latexExportConfig.set({ ...DEFAULT_LATEX_EXPORT_CONFIG });
  }

  private restoreCodeHighlightTheme(): CodeHighlightTheme {
    return restoreCodeHighlightThemeFromStorage(this.editorStorage.getString(this.codeThemeStorageKey), 'aurora');
  }

  private restoreLatexExportConfig(): LatexExportConfig {
    return this.parseStoredLatexExportConfig(this.editorStorage.getString(this.latexExportConfigStorageKey));
  }

  private parseStoredLatexExportConfig(raw: string | null | undefined): LatexExportConfig {
    return parseStoredLatexExportConfig(raw, DEFAULT_LATEX_EXPORT_CONFIG);
  }

  private normalizeLatexExportConfig(config: Partial<LatexExportConfig> | null | undefined, preserveFreeText = true): LatexExportConfig {
    return normalizeLatexExportConfig(config, DEFAULT_LATEX_EXPORT_CONFIG, preserveFreeText);
  }
}
