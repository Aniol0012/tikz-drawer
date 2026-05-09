import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, Output, signal, viewChildren } from '@angular/core';
import type { ElementRef } from '@angular/core';
import {
  CODE_HIGHLIGHT_THEME_OPTIONS,
  LATEX_ALIGNMENT_OPTIONS,
  LATEX_CODE_THEME_PREVIEW_SOURCE,
  LATEX_COLOR_MODE_OPTIONS,
  LATEX_FIGURE_PLACEMENT_OPTIONS,
  LATEX_FONT_SIZE_OPTIONS,
  LATEX_FONT_SIZES,
  type LatexAlignment,
  type LatexExportBooleanKey,
  type LatexExportConfig,
  type LatexExportNumberKey,
  type LatexExportTextKey,
  type LatexFontSize
} from '../../config/latex-export.config';
import { defaultPreferences } from '../../presets/presets';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { getLanguageOptions, isLanguageCode } from '../../i18n/editor-page.i18n';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import { highlightLatex } from '../../utils/editor-page.utils';
import { EditorStore } from '../../state/editor.store';
import { EditorConfigurationService } from '../../state/editor-configuration.service';
import type { EditorPreferences } from '../../models/tikz.models';
import type { PreferenceBooleanKey, PreferenceNumberKey, PreferenceTextKey } from '../editor-page/editor-page.types';
import { AppSelectComponent, type AppSelectOption } from '../../../../shared/app-select/app-select.component';
import { ToggleFieldComponent } from '../../../../shared/toggle-field/toggle-field.component';
import { RangeInputCardComponent } from '../range-input-card/range-input-card.component';

export type ApplicationConfigurationTab = 'general' | 'scene' | 'latex';

type LabelKeyOption = {
  readonly value: string;
  readonly labelKey: string;
};

@Component({
  selector: 'app-configuration-dialog',
  standalone: true,
  imports: [AppSelectComponent, ToggleFieldComponent, RangeInputCardComponent, EditorTranslatePipe],
  templateUrl: './app-configuration-dialog.component.html',
  styleUrl: './app-configuration-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'preferences().theme'
  }
})
export class AppConfigurationDialogComponent {
  private readonly store = inject(EditorStore);
  private readonly configuration = inject(EditorConfigurationService);
  private readonly languageService = inject(EditorLanguageService);

  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('configurationTab');

  @Input({ required: true }) set open(value: boolean) {
    this.isOpen.set(value);
    if (value) {
      this.activeTab.set(this.initialTabValue);
    }
  }

  @Input() set initialTab(value: ApplicationConfigurationTab) {
    this.initialTabValue = value;
    if (this.isOpen()) {
      this.activeTab.set(value);
    }
  }

  @Input({ required: true }) suggestedCaption = '';
  @Input({ required: true }) suggestedLabel = '';

  @Output() readonly closeDialog = new EventEmitter<void>();

  readonly isOpen = signal(false);
  readonly activeTab = signal<ApplicationConfigurationTab>('general');
  readonly preferences = this.store.preferences;
  readonly latexExportConfig = this.configuration.latexExportConfig;
  readonly codeTheme = this.configuration.codeHighlightTheme;
  readonly language = this.languageService.language;

  readonly tabs: readonly { readonly id: ApplicationConfigurationTab; readonly labelKey: string }[] = [
    { id: 'general', labelKey: 'generalSettings' },
    { id: 'scene', labelKey: 'sceneSettings' },
    { id: 'latex', labelKey: 'latexSettings' }
  ];
  readonly placementOptions = LATEX_FIGURE_PLACEMENT_OPTIONS;
  readonly alignmentOptions = LATEX_ALIGNMENT_OPTIONS;
  readonly fontSizeOptions = LATEX_FONT_SIZE_OPTIONS;
  readonly colorModeOptions = LATEX_COLOR_MODE_OPTIONS;
  readonly codeThemeOptions = CODE_HIGHLIGHT_THEME_OPTIONS;
  readonly highlightedCodeThemePreview = highlightLatex(LATEX_CODE_THEME_PREVIEW_SOURCE);
  readonly languageOptions = computed(() => getLanguageOptions(this.language()));
  readonly themeOptions = computed<readonly AppSelectOption[]>(() => [
    { value: 'light', label: this.t('light') },
    { value: 'dark', label: this.t('dark') }
  ]);
  private initialTabValue: ApplicationConfigurationTab = 'general';

  t(key: string): string {
    return this.languageService.t(key);
  }

  selectTab(tab: ApplicationConfigurationTab, focus = false): void {
    this.activeTab.set(tab);
    if (focus) {
      queueMicrotask(() => this.focusActiveTab());
    }
  }

  onTabKeydown(event: KeyboardEvent, tab: ApplicationConfigurationTab): void {
    const currentIndex = this.tabs.findIndex((entry) => entry.id === tab);
    if (currentIndex < 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.selectTab(this.tabs[(currentIndex - 1 + this.tabs.length) % this.tabs.length].id, true);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.selectTab(this.tabs[(currentIndex + 1) % this.tabs.length].id, true);
        break;
      case 'Home':
        event.preventDefault();
        this.selectTab(this.tabs[0].id, true);
        break;
      case 'End':
        event.preventDefault();
        this.selectTab(this.tabs[this.tabs.length - 1].id, true);
        break;
    }
  }

  onDialogKeydown(event: KeyboardEvent): void {
    event.stopPropagation();
    if (event.key === 'Escape') {
      this.closeDialog.emit();
    }
  }

  setTheme(value: string): void {
    if (value === 'light' || value === 'dark') {
      this.patchPreferences({ theme: value });
    }
  }

  setLanguage(value: string): void {
    if (isLanguageCode(value)) {
      this.languageService.setLanguage(value);
    }
  }

  updatePreferenceText(key: PreferenceTextKey, event: Event): void {
    this.patchPreferences({ [key]: (event.target as HTMLInputElement).value } as Partial<EditorPreferences>);
  }

  updatePreferenceNumber(key: PreferenceNumberKey, event: Event, minimumValue: number, maximumValue?: number): void {
    const rawValue = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(rawValue)) {
      return;
    }
    const clampedValue = maximumValue === undefined ? Math.max(minimumValue, rawValue) : Math.min(maximumValue, Math.max(minimumValue, rawValue));
    this.patchPreferences({ [key]: clampedValue } as Partial<EditorPreferences>);
  }

  updatePreferenceBoolean(key: PreferenceBooleanKey, checked: boolean): void {
    this.patchPreferences({ [key]: checked } as Partial<EditorPreferences>);
  }

  updateLatexExportText(key: LatexExportTextKey, event: Event): void {
    this.patchLatexExportConfig({
      [key]: (event.target as HTMLInputElement | HTMLSelectElement).value
    } as Partial<LatexExportConfig>);
  }

  setLatexExportText(key: LatexExportTextKey, value: string): void {
    this.patchLatexExportConfig({
      [key]: value
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportNumber(key: LatexExportNumberKey, event: Event, min: number, max: number): void {
    const inputValue = Number.parseFloat((event.target as HTMLInputElement).value);
    if (!Number.isFinite(inputValue)) {
      return;
    }

    this.patchLatexExportConfig({
      [key]: Math.min(max, Math.max(min, inputValue))
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportBoolean(key: LatexExportBooleanKey, checked: boolean): void {
    this.patchLatexExportConfig({
      [key]: checked
    } as Partial<LatexExportConfig>);
  }

  setLatexAlignment(alignment: LatexAlignment): void {
    this.patchLatexExportConfig({ alignment });
  }

  setLatexFontSize(fontSize: string): void {
    if (LATEX_FONT_SIZES.includes(fontSize as LatexFontSize)) {
      this.patchLatexExportConfig({ fontSize: fontSize as LatexFontSize });
    }
  }

  setCodeHighlightTheme(theme: string): void {
    this.configuration.setCodeHighlightTheme(theme);
  }

  translatedSelectOptions(options: readonly LabelKeyOption[]): readonly AppSelectOption[] {
    return options.map((option) => ({
      value: option.value,
      label: this.t(option.labelKey)
    }));
  }

  fontSizeSelectOptions(): readonly AppSelectOption[] {
    return this.fontSizeOptions.map((fontSize) => ({
      value: fontSize,
      label: fontSize
    }));
  }

  applySuggestedCaptionAndLabel(): void {
    this.patchLatexExportConfig({
      caption: this.suggestedCaption,
      label: this.suggestedLabel
    });
  }

  resetToDefaults(): void {
    this.store.patchPreferences(defaultPreferences);
    this.configuration.resetToDefaults();
  }

  private patchPreferences(patch: Partial<EditorPreferences>): void {
    this.store.patchPreferences(patch);
  }

  patchLatexExportConfig(patch: Partial<LatexExportConfig>): void {
    this.configuration.patchLatexExportConfig(patch);
  }

  private focusActiveTab(): void {
    this.tabButtons()
      .find((tab) => tab.nativeElement.dataset['tab'] === this.activeTab())
      ?.nativeElement.focus();
  }
}
