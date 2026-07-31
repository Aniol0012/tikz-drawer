import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, input } from '@angular/core';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import { EditorLanguageService } from '../../features/editor/i18n/editor-language.service';
import { getLanguageOptions, languageByCode, type LanguageCode } from '../../features/editor/i18n/editor-page.i18n';
import { EditorTranslatePipe } from '../../features/editor/i18n/editor-translate.pipe';

interface ShoelaceDropdownElement extends HTMLElement {
  hide?: () => void;
}

@Component({
  selector: 'app-language-selector',
  imports: [EditorTranslatePipe, NgOptimizedImage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './language-selector.component.html',
  styleUrl: './language-selector.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageSelectorComponent {
  private readonly languageService = inject(EditorLanguageService);

  readonly chevronIconPath = input.required<string>();
  readonly language = this.languageService.language;
  readonly languageOptions = computed(() => getLanguageOptions(this.language()));

  languageLabel(language: LanguageCode = this.language()): string {
    return languageByCode[language].label;
  }

  selectLanguage(language: LanguageCode, dropdown: ShoelaceDropdownElement): void {
    this.languageService.setLanguage(language);
    dropdown.hide?.();
  }
}
