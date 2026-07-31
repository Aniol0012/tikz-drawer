import '@angular/compiler';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { EditorLanguageService } from './editor-language.service';
import { translate, type LanguageCode } from './editor-page.i18n';
import { EditorTranslatePipe } from './editor-translate.pipe';

describe('EditorTranslatePipe', () => {
  it('reuses a translation until its key or the active language changes', () => {
    const language = signal<LanguageCode>('en');
    const translateKey = vi.fn((key: string) => translate(language(), key));
    const injector = Injector.create({
      providers: [
        {
          provide: EditorLanguageService,
          useValue: { language, t: translateKey }
        }
      ]
    });
    const pipe = runInInjectionContext(injector, () => new EditorTranslatePipe());

    expect(pipe.transform('site.navigation.guide')).toBe('Guide');
    expect(pipe.transform('site.navigation.guide')).toBe('Guide');
    expect(translateKey).toHaveBeenCalledOnce();

    language.set('ca');

    expect(pipe.transform('site.navigation.guide')).toBe('Guia');
    expect(translateKey).toHaveBeenCalledTimes(2);
  });
});
