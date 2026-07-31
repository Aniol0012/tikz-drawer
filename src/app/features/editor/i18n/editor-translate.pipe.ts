import type { PipeTransform } from '@angular/core';
import { Pipe, inject } from '@angular/core';
import { EditorLanguageService } from './editor-language.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class EditorTranslatePipe implements PipeTransform {
  private readonly languageService = inject(EditorLanguageService);
  private cachedKey: string | null = null;
  private cachedLanguage = '';
  private cachedTranslation = '';

  transform(key: string): string {
    const language = this.languageService.language();
    if (key === this.cachedKey && language === this.cachedLanguage) {
      return this.cachedTranslation;
    }

    this.cachedKey = key;
    this.cachedLanguage = language;
    this.cachedTranslation = this.languageService.t(key);
    return this.cachedTranslation;
  }
}
