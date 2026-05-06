import type { PipeTransform } from '@angular/core';
import { Pipe, inject } from '@angular/core';
import { EditorLanguageService } from './editor-language.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class EditorTranslatePipe implements PipeTransform {
  private readonly languageService = inject(EditorLanguageService);

  transform(key: string): string {
    return this.languageService.t(key);
  }
}
