import { effect, inject, Injectable, signal } from '@angular/core';
import { EDITOR_STORAGE_KEYS } from '../constants/editor.constants';
import { CODE_HIGHLIGHT_THEMES, DEFAULT_LATEX_EXPORT_CONFIG, type CodeHighlightTheme, type LatexExportConfig } from '../config/latex-export.config';
import { DEFAULT_KEYBOARD_SHORTCUTS, normalizedKeyboardShortcuts, type KeyboardShortcutConfig } from '../utils/editor-keyboard.utils';
import {
  normalizeLatexExportConfig,
  parseStoredLatexExportConfig,
  restoreCodeHighlightThemeFromStorage,
  serializableLatexExportConfig
} from '../utils/editor-storage.utils';
import { EditorLocalStorageService } from './editor-local-storage.service';

export interface EditorGeneralConfig {
  readonly showHelpTooltips: boolean;
  readonly keyboardShortcuts: KeyboardShortcutConfig;
}

export const DEFAULT_EDITOR_GENERAL_CONFIG: EditorGeneralConfig = {
  showHelpTooltips: true,
  keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS
};

@Injectable()
export class EditorConfigurationService {
  private readonly editorStorage = inject(EditorLocalStorageService);
  private readonly codeThemeStorageKey = EDITOR_STORAGE_KEYS.codeTheme;
  private readonly latexExportConfigStorageKey = EDITOR_STORAGE_KEYS.latexExportConfig;
  private readonly generalConfigStorageKey = EDITOR_STORAGE_KEYS.generalConfig;

  readonly codeHighlightTheme = signal<CodeHighlightTheme>(this.restoreCodeHighlightTheme());
  readonly latexExportConfig = signal<LatexExportConfig>(this.restoreLatexExportConfig());
  readonly generalConfig = signal<EditorGeneralConfig>(this.restoreGeneralConfig());

  constructor() {
    effect(() => {
      this.editorStorage.setString(this.codeThemeStorageKey, this.codeHighlightTheme());
    });

    effect(() => {
      this.editorStorage.setJson(this.latexExportConfigStorageKey, serializableLatexExportConfig(this.latexExportConfig()));
    });

    effect(() => {
      this.editorStorage.setJson(this.generalConfigStorageKey, this.generalConfig());
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

  patchGeneralConfig(patch: Partial<EditorGeneralConfig>): void {
    this.generalConfig.update((config) => this.normalizeGeneralConfig({ ...config, ...patch }));
  }

  setKeyboardShortcuts(shortcuts: Partial<KeyboardShortcutConfig> | null | undefined): void {
    this.generalConfig.update((config) =>
      this.normalizeGeneralConfig({
        ...config,
        keyboardShortcuts: normalizedKeyboardShortcuts(shortcuts)
      })
    );
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

    if (key === this.generalConfigStorageKey) {
      this.generalConfig.set(this.parseStoredGeneralConfig(newValue));
      return true;
    }

    return false;
  }

  resetToDefaults(): void {
    this.codeHighlightTheme.set('aurora');
    this.latexExportConfig.set({ ...DEFAULT_LATEX_EXPORT_CONFIG });
    this.generalConfig.set({ ...DEFAULT_EDITOR_GENERAL_CONFIG });
  }

  private restoreCodeHighlightTheme(): CodeHighlightTheme {
    return restoreCodeHighlightThemeFromStorage(this.editorStorage.getString(this.codeThemeStorageKey), 'aurora');
  }

  private restoreLatexExportConfig(): LatexExportConfig {
    return this.parseStoredLatexExportConfig(this.editorStorage.getString(this.latexExportConfigStorageKey));
  }

  private restoreGeneralConfig(): EditorGeneralConfig {
    return this.parseStoredGeneralConfig(this.editorStorage.getString(this.generalConfigStorageKey));
  }

  private parseStoredLatexExportConfig(raw: string | null | undefined): LatexExportConfig {
    return parseStoredLatexExportConfig(raw, DEFAULT_LATEX_EXPORT_CONFIG);
  }

  private normalizeLatexExportConfig(config: Partial<LatexExportConfig> | null | undefined, preserveFreeText = true): LatexExportConfig {
    return normalizeLatexExportConfig(config, DEFAULT_LATEX_EXPORT_CONFIG, preserveFreeText);
  }

  private parseStoredGeneralConfig(raw: string | null | undefined): EditorGeneralConfig {
    if (!raw) {
      return { ...DEFAULT_EDITOR_GENERAL_CONFIG };
    }

    try {
      return this.normalizeGeneralConfig(JSON.parse(raw) as Partial<EditorGeneralConfig>);
    } catch {
      return { ...DEFAULT_EDITOR_GENERAL_CONFIG };
    }
  }

  private normalizeGeneralConfig(config: Partial<EditorGeneralConfig> | null | undefined): EditorGeneralConfig {
    return {
      showHelpTooltips: typeof config?.showHelpTooltips === 'boolean' ? config.showHelpTooltips : DEFAULT_EDITOR_GENERAL_CONFIG.showHelpTooltips,
      keyboardShortcuts: normalizedKeyboardShortcuts(config?.keyboardShortcuts)
    };
  }
}
