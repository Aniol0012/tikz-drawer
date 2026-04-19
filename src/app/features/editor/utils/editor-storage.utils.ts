import type { CodeHighlightTheme, LatexExportConfig, SavedTemplate } from '../components/editor-page/editor-page.types';
import { LATEX_ALIGNMENTS, LATEX_COLOR_MODES, LATEX_FONT_SIZES } from '../components/editor-page/editor-page.types';
import type { LanguageCode } from '../i18n/editor-page.i18n';

const CODE_HIGHLIGHT_THEMES = ['aurora', 'sunset', 'midnight', 'forest', 'rose', 'graphite'] as const;

const isOneOf = <const T extends readonly string[]>(value: unknown, options: T): value is T[number] =>
  typeof value === 'string' && options.includes(value);

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
};

export const parseSavedTemplatesFromStorage = (raw: string | null | undefined): readonly SavedTemplate[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const parsePinnedToolIdsFromStorage = (
  raw: string | null | undefined,
  templates: readonly SavedTemplate[]
): readonly string[] => {
  const templatePinnedIds = templates.filter((template) => template.pinned).map((template) => template.id);
  if (!raw) {
    return templatePinnedIds;
  }

  try {
    const parsed = JSON.parse(raw);
    const storedIds = Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
    return Array.from(new Set([...storedIds, ...templatePinnedIds]));
  } catch {
    return templatePinnedIds;
  }
};

export const restoreLanguageFromStorage = (
  raw: string | null | undefined,
  detectLanguage: () => LanguageCode
): LanguageCode => (raw === 'ca' || raw === 'es' || raw === 'en' ? raw : detectLanguage());

export const restoreCodeHighlightThemeFromStorage = (
  raw: string | null | undefined,
  fallback: CodeHighlightTheme = 'aurora'
): CodeHighlightTheme => (isOneOf(raw, CODE_HIGHLIGHT_THEMES) ? raw : fallback);

export const serializableLatexExportConfig = (config: LatexExportConfig): Partial<LatexExportConfig> => ({
  ...config,
  caption: '',
  label: ''
});

export const normalizeLatexExportConfig = (
  config: Partial<LatexExportConfig> | null | undefined,
  defaultConfig: LatexExportConfig,
  preserveFreeText: boolean = true
): LatexExportConfig => {
  const figurePlacement =
    typeof config?.figurePlacement === 'string' && config.figurePlacement.trim()
      ? config.figurePlacement.trim()
      : defaultConfig.figurePlacement;

  return {
    ...defaultConfig,
    colorMode: isOneOf(config?.colorMode, LATEX_COLOR_MODES) ? config.colorMode : defaultConfig.colorMode,
    wrapInFigure: typeof config?.wrapInFigure === 'boolean' ? config.wrapInFigure : defaultConfig.wrapInFigure,
    figurePlacement,
    alignment: isOneOf(config?.alignment, LATEX_ALIGNMENTS) ? config.alignment : defaultConfig.alignment,
    scaleToWidth: typeof config?.scaleToWidth === 'boolean' ? config.scaleToWidth : defaultConfig.scaleToWidth,
    includeFrame: typeof config?.includeFrame === 'boolean' ? config.includeFrame : defaultConfig.includeFrame,
    maxWidthPercent: clampNumber(config?.maxWidthPercent, 10, 100, defaultConfig.maxWidthPercent),
    standaloneBorderMm: clampNumber(config?.standaloneBorderMm, 0, 24, defaultConfig.standaloneBorderMm),
    fontSize: isOneOf(config?.fontSize, LATEX_FONT_SIZES) ? config.fontSize : defaultConfig.fontSize,
    includeCaption: typeof config?.includeCaption === 'boolean' ? config.includeCaption : defaultConfig.includeCaption,
    caption: preserveFreeText && typeof config?.caption === 'string' ? config.caption : '',
    includeLabel: typeof config?.includeLabel === 'boolean' ? config.includeLabel : defaultConfig.includeLabel,
    label: preserveFreeText && typeof config?.label === 'string' ? config.label : ''
  };
};

export const parseStoredLatexExportConfig = (
  raw: string | null | undefined,
  defaultConfig: LatexExportConfig
): LatexExportConfig => {
  if (!raw) {
    return { ...defaultConfig };
  }

  try {
    return normalizeLatexExportConfig(JSON.parse(raw) as Partial<LatexExportConfig>, defaultConfig, false);
  } catch {
    return { ...defaultConfig };
  }
};
