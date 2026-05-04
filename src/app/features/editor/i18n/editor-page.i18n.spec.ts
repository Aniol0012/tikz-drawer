import {
  fallbackLanguageCode,
  isLanguageCode,
  languageOptions,
  languages,
  localizedShapeKind,
  restoreLanguage,
  translate,
  translateOrFallback
} from './editor-page.i18n';

describe('editor-page i18n', () => {
  it('derives language options from the central language config', () => {
    expect(languageOptions).toEqual(languages.map(({ code, label, flagSrc }) => ({ value: code, label, flagSrc })));
  });

  it('validates and restores language codes with fallback', () => {
    expect(isLanguageCode('ca')).toBe(true);
    expect(isLanguageCode('de')).toBe(false);
    expect(restoreLanguage('es', () => fallbackLanguageCode)).toBe('es');
    expect(restoreLanguage('de', () => 'ca')).toBe('ca');
  });

  it('translates labels and shape kinds with local fallbacks', () => {
    expect(translate('en', 'brand')).toBe('Tikz Drawer');
    expect(translate('en', 'missing.translation')).toBe('missing.translation');
    expect(translateOrFallback('en', 'missing.translation', 'Fallback')).toBe('Fallback');
    expect(localizedShapeKind('ca', 'circle')).toBe('Cercle');
  });
});
