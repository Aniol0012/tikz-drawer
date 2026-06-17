import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { getIconPath } from '../../config/editor-icons';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import { parseTikz } from '../../tikz/tikz.parser';
import { CodeHighlightThemeService } from '../../state/code-highlight-theme.service';
import { ToggleFieldComponent } from '../../../../shared/toggle-field/toggle-field.component';
import {
  detectImportSourceKind,
  extractTikzDiagrams,
  importCsvSource,
  importDotSource,
  importDrawioSource,
  type ImportDialogResult,
  type ImportSourceKind,
  importImageSource,
  importMermaidSource,
  importProjectJson,
  importSvgSource,
  importTexSource,
  importTikzSource,
  type ExtractedTikzDiagram
} from '../../import/import-sources';
import { latexEnvironmentBeginRegex, latexEnvironmentEndRegex, REGEX } from '../../../../shared/regex/regex.utils';

const hasUnbalancedDelimiters = (source: string): boolean => {
  const openingByClosing: Record<string, string> = {
    '}': '{',
    ']': '[',
    ')': '('
  };
  const openingChars = new Set(['{', '[', '(']);
  const closingChars = new Set(Object.keys(openingByClosing));
  const stack: string[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '\\') {
      index += 1;
      continue;
    }

    if (openingChars.has(character)) {
      stack.push(character);
      continue;
    }

    if (closingChars.has(character)) {
      const expected = openingByClosing[character];
      const current = stack.pop();
      if (current !== expected) {
        return true;
      }
    }
  }

  return stack.length > 0;
};

const hasMismatchedEnvironment = (source: string, environment: string): boolean => {
  const countMatches = (pattern: RegExp): number => {
    let count = 0;
    while (pattern.exec(source)) {
      count += 1;
    }
    return count;
  };
  const begin = countMatches(latexEnvironmentBeginRegex(environment));
  const end = countMatches(latexEnvironmentEndRegex(environment));
  return begin !== end;
};

interface ImportSourceOption {
  readonly kind: ImportSourceKind;
  readonly labelKey: string;
  readonly helperKey: string;
  readonly noteKey: string;
  readonly inputTitleKey: string;
  readonly inputDescriptionKey: string;
  readonly iconKey: string;
  readonly accept: string;
  readonly tone: 'editable' | 'reference';
}

interface ImportWarningView {
  readonly summary: string;
  readonly detail: string;
  readonly isRawTikz: boolean;
}

@Component({
  selector: 'app-import-code-modal',
  imports: [EditorTranslatePipe, ToggleFieldComponent],
  templateUrl: './import-code-modal.component.html',
  styleUrl: './import-code-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportCodeModalComponent {
  private readonly languageService = inject(EditorLanguageService);
  private readonly codeHighlightThemeService = inject(CodeHighlightThemeService);

  readonly closeIconPath = getIconPath('close');
  readonly trashIconPath = getIconPath('trash');
  readonly uploadIconPath = getIconPath('upload');
  readonly title = input.required<string>();
  readonly actionLabel = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly warningsLabel = input.required<string>();
  readonly code = input.required<string>();
  readonly codeTheme = input.required<string>();
  readonly warnings = input<readonly string[]>([]);
  readonly appVersion = input<string>('unknown');
  readonly sceneHasContent = input(false);

  readonly closeDialog = output<void>();
  readonly codeChange = output<string>();
  readonly importResult = output<ImportDialogResult>();

  readonly importCodeInput = viewChild<ElementRef<HTMLTextAreaElement>>('importCodeInput');
  readonly importCodePreview = viewChild<ElementRef<HTMLPreElement>>('importCodePreview');
  readonly importFileInput = viewChild<ElementRef<HTMLInputElement>>('importFileInput');

  readonly highlightedCode = computed(() => this.codeHighlightThemeService.highlight(this.code() || ' '));
  readonly codeThemeStyle = computed(() => this.codeHighlightThemeService.cssVariableStyle(this.codeTheme()));
  readonly parsedInput = computed(() => parseTikz(this.code()));
  readonly codeInputFocused = signal(false);
  readonly sourceKind = signal<ImportSourceKind>('tikz');
  readonly fileName = signal('');
  readonly fileContent = signal('');
  readonly imageDataUrl = signal('');
  readonly fileError = signal('');
  readonly texDiagrams = signal<readonly ExtractedTikzDiagram[]>([]);
  readonly selectedTexDiagramIndexes = signal<readonly number[]>([]);
  readonly csvXColumn = signal('x');
  readonly csvYColumn = signal('y');
  readonly csvLabelColumn = signal('label');
  readonly csvGroupColumn = signal('group');
  readonly warningDetailsExpanded = signal(false);
  readonly clearSceneBeforeImport = signal(false);
  readonly sourceOptions: readonly ImportSourceOption[] = [
    {
      kind: 'tikz',
      labelKey: 'import.source.tikz.label',
      helperKey: 'import.source.tikz.helper',
      noteKey: 'import.source.tikz.note',
      inputTitleKey: 'import.input.tikz.title',
      inputDescriptionKey: 'import.input.tikz.description',
      iconKey: 'text',
      accept: '.tikz,.tex,text/plain',
      tone: 'editable'
    },
    {
      kind: 'tex',
      labelKey: 'import.source.tex.label',
      helperKey: 'import.source.tex.helper',
      noteKey: 'import.source.tex.note',
      inputTitleKey: 'import.input.tex.title',
      inputDescriptionKey: 'import.input.tex.description',
      iconKey: 'document',
      accept: '.tex',
      tone: 'editable'
    },
    {
      kind: 'project-json',
      labelKey: 'import.source.projectJson.label',
      helperKey: 'import.source.projectJson.helper',
      noteKey: 'import.source.projectJson.note',
      inputTitleKey: 'import.input.projectJson.title',
      inputDescriptionKey: 'import.input.projectJson.description',
      iconKey: 'settings',
      accept: '.json,application/json',
      tone: 'editable'
    },
    {
      kind: 'drawio',
      labelKey: 'import.source.drawio.label',
      helperKey: 'import.source.drawio.helper',
      noteKey: 'import.source.drawio.note',
      inputTitleKey: 'import.input.drawio.title',
      inputDescriptionKey: 'import.input.drawio.description',
      iconKey: 'flow',
      accept: '.drawio,.xml,text/xml',
      tone: 'editable'
    },
    {
      kind: 'svg',
      labelKey: 'import.source.svg.label',
      helperKey: 'import.source.svg.helper',
      noteKey: 'import.source.svg.note',
      inputTitleKey: 'import.input.svg.title',
      inputDescriptionKey: 'import.input.svg.description',
      iconKey: 'image',
      accept: '.svg,image/svg+xml',
      tone: 'editable'
    },
    {
      kind: 'mermaid',
      labelKey: 'import.source.mermaid.label',
      helperKey: 'import.source.mermaid.helper',
      noteKey: 'import.source.mermaid.note',
      inputTitleKey: 'import.input.mermaid.title',
      inputDescriptionKey: 'import.input.mermaid.description',
      iconKey: 'graph',
      accept: '.mmd,.mermaid,text/plain',
      tone: 'editable'
    },
    {
      kind: 'dot',
      labelKey: 'import.source.dot.label',
      helperKey: 'import.source.dot.helper',
      noteKey: 'import.source.dot.note',
      inputTitleKey: 'import.input.dot.title',
      inputDescriptionKey: 'import.input.dot.description',
      iconKey: 'graphComplete',
      accept: '.dot,text/plain',
      tone: 'editable'
    },
    {
      kind: 'csv',
      labelKey: 'import.source.csv.label',
      helperKey: 'import.source.csv.helper',
      noteKey: 'import.source.csv.note',
      inputTitleKey: 'import.input.csv.title',
      inputDescriptionKey: 'import.input.csv.description',
      iconKey: 'table',
      accept: '.csv,.tsv,text/csv,text/tab-separated-values',
      tone: 'editable'
    },
    {
      kind: 'image',
      labelKey: 'import.source.image.label',
      helperKey: 'import.source.image.helper',
      noteKey: 'import.source.image.note',
      inputTitleKey: 'import.input.image.title',
      inputDescriptionKey: 'import.input.image.description',
      iconKey: 'image',
      accept: '.png,.jpg,.jpeg,image/png,image/jpeg',
      tone: 'reference'
    }
  ];
  readonly selectedSourceOption = computed(() => this.sourceOptions.find((option) => option.kind === this.sourceKind()) ?? this.sourceOptions[0]);
  readonly activeSourceText = computed(() => (this.sourceKind() === 'tikz' || this.sourceKind() === 'mermaid' ? this.code() : this.fileContent()));
  readonly filePlaceholderKey = computed(() => {
    switch (this.sourceKind()) {
      case 'tikz':
        return 'import.filePlaceholderTikz';
      case 'tex':
        return 'import.filePlaceholderTex';
      case 'project-json':
        return 'import.filePlaceholderProjectJson';
      case 'drawio':
        return 'import.filePlaceholderDrawio';
      case 'svg':
        return 'import.filePlaceholderSvg';
      case 'mermaid':
        return 'import.filePlaceholderMermaid';
      case 'dot':
        return 'import.filePlaceholderDot';
      case 'csv':
        return 'import.filePlaceholderCsv';
      case 'image':
        return 'import.filePlaceholderImage';
    }
  });
  readonly displayedWarnings = computed(() => {
    if (this.sourceKind() === 'tikz') {
      return this.parsedInput().warnings;
    }

    return this.fileName() ? this.warnings() : [];
  });
  readonly warningViews = computed(() => this.displayedWarnings().map((warning) => this.describeWarning(warning)));
  readonly rawTikzWarningCount = computed(() => this.warningViews().filter((warning) => warning.isRawTikz).length);
  readonly warningSummaryText = computed(() => {
    const warnings = this.warningViews();
    const rawCount = this.rawTikzWarningCount();
    if (!warnings.length) {
      return '';
    }

    if (rawCount === warnings.length) {
      return this.formatCount(rawCount, 'import.warningRawTikzSingular', 'import.warningRawTikzPlural');
    }

    if (rawCount > 0) {
      return `${this.formatCount(warnings.length, 'import.warningCountSingular', 'import.warningCountPlural')} ${this.formatCount(
        rawCount,
        'import.warningRawTikzShortSingular',
        'import.warningRawTikzShortPlural'
      )}`;
    }

    return this.formatCount(warnings.length, 'import.warningCountSingular', 'import.warningCountPlural');
  });
  readonly displayedErrors = computed(() => (this.fileError() ? [this.fileError()] : []));
  readonly canImport = computed(() => {
    if (this.fileError()) {
      return false;
    }
    return this.sourceKind() === 'image' ? Boolean(this.imageDataUrl()) : Boolean(this.activeSourceText().trim());
  });

  sourceIconPath(option: ImportSourceOption): string {
    return getIconPath(option.iconKey);
  }

  t(key: string): string {
    return this.languageService.t(key);
  }
  readonly hasSyntaxIssue = computed(() => {
    const source = this.code().trim();
    if (!source) {
      return false;
    }

    const parsed = this.parsedInput();
    const hasCommands = REGEX.importModal.drawLikeCommand.test(source);
    return (
      parsed.warnings.length > 0 ||
      (hasCommands && parsed.scene.shapes.length === 0) ||
      hasUnbalancedDelimiters(source) ||
      hasMismatchedEnvironment(source, 'tikzpicture') ||
      hasMismatchedEnvironment(source, 'figure') ||
      hasMismatchedEnvironment(source, 'adjustbox')
    );
  });

  onCodeInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    const detectedKind = detectImportSourceKind(value);
    if (detectedKind && detectedKind !== this.sourceKind()) {
      this.applyDetectedTextSource(detectedKind, value);
    } else {
      this.codeChange.emit(value);
    }
    this.syncScroll();
  }

  updateSourceKind(kind: ImportSourceKind): void {
    this.sourceKind.set(kind);
    this.warningDetailsExpanded.set(false);
    this.fileError.set('');
    this.fileName.set('');
    this.fileContent.set('');
    this.imageDataUrl.set('');
    this.texDiagrams.set([]);
    this.selectedTexDiagramIndexes.set([]);
  }

  setClearSceneBeforeImport(checked: boolean): void {
    this.clearSceneBeforeImport.set(checked);
  }

  updateCsvColumn(column: 'x' | 'y' | 'label' | 'group', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    switch (column) {
      case 'x':
        this.csvXColumn.set(value);
        break;
      case 'y':
        this.csvYColumn.set(value);
        break;
      case 'label':
        this.csvLabelColumn.set(value);
        break;
      case 'group':
        this.csvGroupColumn.set(value);
        break;
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.fileError.set('');
    this.fileContent.set('');
    this.imageDataUrl.set('');
    this.texDiagrams.set([]);
    this.selectedTexDiagramIndexes.set([]);

    if (!file) {
      this.fileName.set('');
      return;
    }

    this.fileName.set(file.name);
    const detectedFileKind = detectImportSourceKind('', file.name);
    if (detectedFileKind && detectedFileKind !== this.sourceKind()) {
      this.sourceKind.set(detectedFileKind);
    }
    const reader = new FileReader();
    reader.onerror = () => this.fileError.set(this.t('import.errorFileRead'));

    if (this.sourceKind() === 'image') {
      reader.onload = () => this.imageDataUrl.set(String(reader.result ?? ''));
      reader.readAsDataURL(file);
      return;
    }

    reader.onload = () => {
      const content = String(reader.result ?? '');
      const detectedKind = detectImportSourceKind(content, file.name) ?? this.sourceKind();
      this.applyDetectedTextSource(detectedKind, content, file.name);
    };
    reader.readAsText(file);
  }

  toggleTexDiagram(index: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedTexDiagramIndexes.update((indexes) => {
      const next = checked ? [...indexes, index] : indexes.filter((entry) => entry !== index);
      return [...new Set(next)].sort((left, right) => left - right);
    });
  }

  toggleWarningDetails(): void {
    this.warningDetailsExpanded.update((expanded) => !expanded);
  }

  clearSelectedFile(): void {
    this.fileName.set('');
    this.fileContent.set('');
    this.imageDataUrl.set('');
    this.fileError.set('');
    this.texDiagrams.set([]);
    this.selectedTexDiagramIndexes.set([]);
    this.warningDetailsExpanded.set(false);
    const fileInput = this.importFileInput()?.nativeElement;
    if (fileInput) {
      fileInput.value = '';
    }

    if (this.sourceKind() === 'tikz' || this.sourceKind() === 'mermaid') {
      this.codeChange.emit('');
    }
  }

  importSelectedSource(): void {
    try {
      const result = this.buildImportResult();
      this.importResult.emit(result);
    } catch {
      this.fileError.set(this.t('import.errorImportFailed'));
    }
  }

  onCodeInputKeydown(event: KeyboardEvent): void {
    if (!this.isEscapeKey(event)) {
      return;
    }

    event.preventDefault();
    this.closeDialog.emit();
  }

  onCodeInputFocus(): void {
    this.codeInputFocused.set(true);
  }

  onCodeInputBlur(): void {
    this.codeInputFocused.set(false);
  }

  syncScroll(): void {
    const input = this.importCodeInput()?.nativeElement;
    const preview = this.importCodePreview()?.nativeElement;
    if (!input || !preview) {
      return;
    }

    preview.scrollTop = input.scrollTop;
    preview.scrollLeft = input.scrollLeft;
  }

  private isEscapeKey(event: KeyboardEvent): boolean {
    return event.key === 'Escape' || event.key === 'Esc' || event.code === 'Escape';
  }

  private applyDetectedTextSource(kind: ImportSourceKind, content: string, fileName = ''): void {
    this.sourceKind.set(kind);
    this.warningDetailsExpanded.set(false);
    this.fileError.set('');
    this.fileName.set(fileName);
    this.imageDataUrl.set('');
    this.texDiagrams.set([]);
    this.selectedTexDiagramIndexes.set([]);

    if (kind === 'tikz' || kind === 'mermaid') {
      this.fileContent.set('');
      this.codeChange.emit(content);
      return;
    }

    this.fileContent.set(content);
    if (this.code()) {
      this.codeChange.emit('');
    }

    if (kind === 'tex') {
      const diagrams = extractTikzDiagrams(content);
      this.texDiagrams.set(diagrams);
      this.selectedTexDiagramIndexes.set(diagrams.map((_, index) => index));
    }
  }

  private describeWarning(warning: string): ImportWarningView {
    const diagramRawTikzMatch = warning.match(REGEX.importModal.diagramRawTikzWarning);
    if (diagramRawTikzMatch) {
      const [, diagramTitle, line] = diagramRawTikzMatch;
      return {
        summary: this.format('import.warningRawTikzDiagramSummary', { diagram: diagramTitle }),
        detail: line,
        isRawTikz: true
      };
    }

    const rawTikzMatch = warning.match(REGEX.importModal.rawTikzWarning);
    if (rawTikzMatch) {
      return {
        summary: this.t('import.warningRawTikzLineSummary'),
        detail: rawTikzMatch[1],
        isRawTikz: true
      };
    }

    const csvMatch = warning.match(REGEX.importModal.csvInvalidCoordinatesWarning);
    if (csvMatch) {
      return {
        summary: this.t('import.warningCsvRowSummary'),
        detail: csvMatch[1],
        isRawTikz: false
      };
    }

    const svgPathMatch = warning.match(REGEX.importModal.svgPathWarning);
    if (svgPathMatch) {
      return {
        summary: this.t('import.warningSvgPathSummary'),
        detail: svgPathMatch[1],
        isRawTikz: false
      };
    }

    const translated = this.translateKnownWarning(warning);
    return {
      summary: translated,
      detail: warning === translated ? '' : warning,
      isRawTikz: false
    };
  }

  private translateKnownWarning(warning: string): string {
    switch (warning) {
      case 'No tikzpicture environments were found in the LaTeX document.':
        return this.t('import.warningNoTikzPictures');
      case 'CSV import requires a header row and at least one data row.':
        return this.t('import.warningCsvNeedsRows');
      case 'Imported as a non-vector reference image. Locking is represented as a background image layer in this import.':
        return this.t('import.warningImageReference');
      case 'No graph edges were recognized.':
        return this.t('import.warningNoGraphEdges');
      default:
        return warning;
    }
  }

  private formatCount(count: number, singularKey: string, pluralKey: string): string {
    return this.format(count === 1 ? singularKey : pluralKey, { count: String(count) });
  }

  private format(key: string, replacements: Record<string, string>): string {
    return Object.entries(replacements).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), this.t(key));
  }

  private buildImportResult(): ImportDialogResult {
    let result: ImportDialogResult;

    switch (this.sourceKind()) {
      case 'tikz':
        result = importTikzSource(this.code());
        break;
      case 'tex':
        result = importTexSource(this.fileContent(), this.selectedTexDiagramIndexes());
        break;
      case 'project-json':
        result = importProjectJson(this.fileContent(), this.appVersion());
        break;
      case 'drawio':
        result = importDrawioSource(this.fileContent());
        break;
      case 'svg':
        result = importSvgSource(this.fileContent());
        break;
      case 'mermaid':
        result = importMermaidSource(this.code().trim() || this.fileContent());
        break;
      case 'dot':
        result = importDotSource(this.fileContent());
        break;
      case 'csv':
        result = importCsvSource(this.fileContent(), this.csvXColumn(), this.csvYColumn(), this.csvLabelColumn(), this.csvGroupColumn());
        break;
      case 'image':
        result = importImageSource(this.imageDataUrl(), this.fileName() || this.t('import.source.image.label'));
        break;
    }

    return {
      ...result,
      clearScene: this.sceneHasContent() && this.clearSceneBeforeImport()
    };
  }
}
