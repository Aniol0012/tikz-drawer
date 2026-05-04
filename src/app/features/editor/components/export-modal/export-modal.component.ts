import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
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
import type { ThemeMode } from '../../models/tikz.models';
import { highlightLatex } from '../../utils/editor-page.utils';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import type { CodeHighlightTheme, ExportMode } from '../editor-page/editor-page.types';
import {
  CopyButtonComponent,
  type CopyButtonValueResolver
} from '../../../../shared/copy-button/copy-button.component';
import { AppSelectComponent, type AppSelectOption } from '../../../../shared/app-select/app-select.component';

type LabelKeyOption = {
  readonly value: string;
  readonly labelKey: string;
};

@Component({
  selector: 'app-export-modal',
  imports: [CopyButtonComponent, AppSelectComponent],
  templateUrl: './export-modal.component.html',
  styleUrl: './export-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-theme]': 'theme()'
  }
})
export class ExportModalComponent {
  private readonly languageService = inject(EditorLanguageService);

  readonly theme = input.required<ThemeMode>();
  readonly iconMap = input.required<Record<string, string>>();
  readonly exportMode = input.required<ExportMode>();
  readonly settingsOpen = input.required<boolean>();
  readonly shareUrl = input.required<string>();
  readonly codeTheme = input.required<CodeHighlightTheme>();
  readonly latexExportConfig = input.required<LatexExportConfig>();
  readonly exportImports = input.required<string>();
  readonly exportCode = input.required<string>();
  readonly highlightedExportImports = input.required<string>();
  readonly highlightedExportCode = input.required<string>();
  readonly shareLinkCopyValue = input.required<CopyButtonValueResolver>();
  readonly suggestedCaption = input.required<string>();
  readonly suggestedLabel = input.required<string>();

  readonly closeDialog = output<void>();
  readonly exportModeChange = output<ExportMode>();
  readonly shareLinkCopied = output<string>();
  readonly copyError = output<unknown>();
  readonly downloadPng = output<void>();
  readonly downloadSvg = output<void>();
  readonly openSettings = output<void>();
  readonly closeSettings = output<void>();
  readonly downloadTex = output<void>();
  readonly latexConfigPatch = output<Partial<LatexExportConfig>>();
  readonly codeThemeChange = output<CodeHighlightTheme>();

  readonly placementOptions = LATEX_FIGURE_PLACEMENT_OPTIONS;
  readonly alignmentOptions = LATEX_ALIGNMENT_OPTIONS;
  readonly fontSizeOptions = LATEX_FONT_SIZE_OPTIONS;
  readonly colorModeOptions = LATEX_COLOR_MODE_OPTIONS;
  readonly codeThemeOptions = CODE_HIGHLIGHT_THEME_OPTIONS;
  readonly highlightedCodeThemePreview = highlightLatex(LATEX_CODE_THEME_PREVIEW_SOURCE);

  t(key: string): string {
    return this.languageService.t(key);
  }

  icon(key: string): string {
    return this.iconMap()[key] ?? '';
  }

  updateLatexExportText(key: LatexExportTextKey, event: Event): void {
    this.latexConfigPatch.emit({
      [key]: (event.target as HTMLInputElement | HTMLSelectElement).value
    } as Partial<LatexExportConfig>);
  }

  setLatexExportText(key: LatexExportTextKey, value: string): void {
    this.latexConfigPatch.emit({
      [key]: value
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportNumber(key: LatexExportNumberKey, event: Event, min: number, max: number): void {
    const inputValue = Number.parseFloat((event.target as HTMLInputElement).value);
    if (!Number.isFinite(inputValue)) {
      return;
    }

    this.latexConfigPatch.emit({
      [key]: Math.min(max, Math.max(min, inputValue))
    } as Partial<LatexExportConfig>);
  }

  updateLatexExportBoolean(key: LatexExportBooleanKey, event: Event): void {
    this.latexConfigPatch.emit({
      [key]: (event.target as HTMLInputElement).checked
    } as Partial<LatexExportConfig>);
  }

  setLatexAlignment(alignment: LatexAlignment): void {
    this.latexConfigPatch.emit({ alignment });
  }

  setLatexFontSize(fontSize: string): void {
    if (LATEX_FONT_SIZES.includes(fontSize as LatexFontSize)) {
      this.latexConfigPatch.emit({ fontSize: fontSize as LatexFontSize });
    }
  }

  setCodeHighlightTheme(theme: string): void {
    if (this.codeThemeOptions.some((option) => option.value === theme)) {
      this.codeThemeChange.emit(theme as CodeHighlightTheme);
    }
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
    this.latexConfigPatch.emit({
      caption: this.suggestedCaption(),
      label: this.suggestedLabel()
    });
  }
}
