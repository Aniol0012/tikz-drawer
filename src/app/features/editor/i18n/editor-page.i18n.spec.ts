import {
  fallbackLanguageCode,
  getLanguageOptions,
  isLanguageCode,
  languageCodes,
  languages,
  localizedShapeKind,
  restoreLanguage,
  translate,
  translateOrFallback
} from './editor-page.i18n';

describe('editor-page i18n', () => {
  it('derives language options from the central language config', () => {
    expect(languageCodes).toEqual(languages.map(({ code }) => code));
    expect(getLanguageOptions('en')).toEqual(
      languages.map(({ code, label, flagSrc, longLabel, longLabelKey }) => ({
        value: code,
        label,
        flagSrc,
        longLabel: translateOrFallback('en', longLabelKey, longLabel)
      }))
    );
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

  it('requires every language to define translations for all language names', () => {
    for (const targetLanguage of languages) {
      for (const namedLanguage of languages) {
        const translation = translateOrFallback(targetLanguage.code, namedLanguage.longLabelKey, '__missing__');
        expect(translation).not.toBe('__missing__');
        expect(translation).not.toBe(namedLanguage.longLabelKey);
      }
    }
  });

  it('exposes translated long labels for each language in options', () => {
    for (const targetLanguage of languages) {
      const options = getLanguageOptions(targetLanguage.code);
      for (const option of options) {
        expect(option.longLabel).toBe(translateOrFallback(targetLanguage.code, `languageName.${option.value}`, option.longLabel));
      }
    }
  });
});
