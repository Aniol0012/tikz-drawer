import type { LatexExportConfig, SavedTemplate } from '../components/editor-page/editor-page.types';
import { DEFAULT_LATEX_EXPORT_CONFIG } from '../config/latex-export.config';
import { restoreLanguage } from '../i18n/editor-page.i18n';
import {
  normalizeLatexExportConfig,
  parseCollapsedSectionsFromStorage,
  parsePinnedToolIdsFromStorage,
  parseSavedTemplatesFromStorage,
  parseStoredLatexExportConfig,
  restoreCodeHighlightThemeFromStorage,
  serializableLatexExportConfig
} from './editor-storage.utils';

const defaultLatexExportConfig: LatexExportConfig = DEFAULT_LATEX_EXPORT_CONFIG;

const templates: readonly SavedTemplate[] = [
  {
    id: 'a',
    title: 'A',
    description: '',
    icon: 'library',
    pinned: true,
    shapes: []
  },
  {
    id: 'b',
    title: 'B',
    description: '',
    icon: 'library',
    pinned: false,
    shapes: []
  }
];

describe('editor-storage utils', () => {
  it('restores arbitrary collapsed section ids and ignores invalid values', () => {
    expect(parseCollapsedSectionsFromStorage('{"flow":true,"future-category":false,"invalid":"yes"}')).toEqual({
      flow: true,
      'future-category': false
    });
    expect(parseCollapsedSectionsFromStorage('[]')).toEqual({});
    expect(parseCollapsedSectionsFromStorage('broken')).toEqual({});
  });

  it('parses templates safely from storage', () => {
    expect(parseSavedTemplatesFromStorage(null)).toEqual([]);
    expect(parseSavedTemplatesFromStorage('{invalid')).toEqual([]);
    expect(parseSavedTemplatesFromStorage(JSON.stringify(templates))).toEqual(templates);
  });

  it('merges pinned tool ids from templates and stored ids', () => {
    const stored = JSON.stringify(['x', 'a']);
    expect(parsePinnedToolIdsFromStorage(stored, templates)).toEqual(['x', 'a']);
    expect(parsePinnedToolIdsFromStorage(null, templates)).toEqual(['a']);
  });

  it('restores language and code theme with fallback', () => {
    expect(restoreLanguage('ca', () => 'en')).toBe('ca');
    expect(restoreLanguage('de', () => 'en')).toBe('en');
    expect(restoreCodeHighlightThemeFromStorage('forest', 'aurora')).toBe('forest');
    expect(restoreCodeHighlightThemeFromStorage('unknown', 'aurora')).toBe('aurora');
  });

  it('normalizes and parses latex export config', () => {
    const normalized = normalizeLatexExportConfig(
      {
        figurePlacement: '  ',
        maxWidthPercent: 200,
        standaloneBorderMm: -2,
        caption: 'Hello',
        label: 'fig:test',
        colorMode: 'invalid' as never,
        preferredExportMode: 'standalone'
      },
      defaultLatexExportConfig
    );

    expect(normalized.figurePlacement).toBe(defaultLatexExportConfig.figurePlacement);
    expect(normalized.maxWidthPercent).toBe(100);
    expect(normalized.standaloneBorderMm).toBe(0);
    expect(normalized.caption).toBe('Hello');
    expect(normalized.label).toBe('fig:test');
    expect(normalized.colorMode).toBe(defaultLatexExportConfig.colorMode);
    expect(normalized.preferredExportMode).toBe('standalone');

    const parsed = parseStoredLatexExportConfig(
      JSON.stringify({ maxWidthPercent: 55, caption: 'x', label: 'y', preferredExportMode: 'invalid' }),
      defaultLatexExportConfig
    );
    expect(parsed.maxWidthPercent).toBe(55);
    expect(parsed.caption).toBe('');
    expect(parsed.label).toBe('');
    expect(parsed.preferredExportMode).toBe(defaultLatexExportConfig.preferredExportMode);
  });

  it('serializes latex export config without free text', () => {
    expect(
      serializableLatexExportConfig({
        ...defaultLatexExportConfig,
        caption: 'Keep?',
        label: 'fig:keep'
      })
    ).toMatchObject({
      caption: '',
      label: ''
    });
  });
});
