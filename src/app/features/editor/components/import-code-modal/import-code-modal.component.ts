import type { ElementRef } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { getIconPath } from '../../config/editor-icons';
import { EditorLanguageService } from '../../i18n/editor-language.service';
import { EditorTranslatePipe } from '../../i18n/editor-translate.pipe';
import { highlightLatex } from '../../utils/editor-page.utils';
import { parseTikz } from '../../tikz/tikz.parser';
import {
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
  const begin = countMatches(new RegExp(String.raw`\\begin\{${environment}\}`, 'g'));
  const end = countMatches(new RegExp(String.raw`\\end\{${environment}\}`, 'g'));
  return begin !== end;
};

interface ImportSourceOption {
  readonly kind: ImportSourceKind;
  readonly labelKey: string;
  readonly helperKey: string;
  readonly noteKey: string;
  readonly tooltipKey: string;
  readonly iconKey: string;
  readonly accept: string;
}

@Component({
  selector: 'app-import-code-modal',
  imports: [EditorTranslatePipe],
  templateUrl: './import-code-modal.component.html',
  styleUrl: './import-code-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportCodeModalComponent {
  private readonly languageService = inject(EditorLanguageService);

  readonly closeIconPath = getIconPath('close');
  readonly title = input.required<string>();
  readonly actionLabel = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly warningsLabel = input.required<string>();
  readonly code = input.required<string>();
  readonly codeTheme = input.required<string>();
  readonly warnings = input<readonly string[]>([]);
  readonly appVersion = input<string>('unknown');

  readonly closeDialog = output<void>();
  readonly codeChange = output<string>();
  readonly importResult = output<ImportDialogResult>();

  readonly importCodeInput = viewChild<ElementRef<HTMLTextAreaElement>>('importCodeInput');
  readonly importCodePreview = viewChild<ElementRef<HTMLPreElement>>('importCodePreview');

  readonly highlightedCode = computed(() => highlightLatex(this.code() || ' '));
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
  readonly sourceOptions: readonly ImportSourceOption[] = [
    {
      kind: 'tikz',
      labelKey: 'import.source.tikz.label',
      helperKey: 'import.source.tikz.helper',
      noteKey: 'import.source.tikz.note',
      tooltipKey: 'import.source.tikz.tooltip',
      iconKey: 'text',
      accept: '.tikz,.tex,text/plain'
    },
    {
      kind: 'tex',
      labelKey: 'import.source.tex.label',
      helperKey: 'import.source.tex.helper',
      noteKey: 'import.source.tex.note',
      tooltipKey: 'import.source.tex.tooltip',
      iconKey: 'file',
      accept: '.tex'
    },
    {
      kind: 'project-json',
      labelKey: 'import.source.projectJson.label',
      helperKey: 'import.source.projectJson.helper',
      noteKey: 'import.source.projectJson.note',
      tooltipKey: 'import.source.projectJson.tooltip',
      iconKey: 'settings',
      accept: '.json,application/json'
    },
    {
      kind: 'drawio',
      labelKey: 'import.source.drawio.label',
      helperKey: 'import.source.drawio.helper',
      noteKey: 'import.source.drawio.note',
      tooltipKey: 'import.source.drawio.tooltip',
      iconKey: 'flow',
      accept: '.drawio,.xml,text/xml'
    },
    {
      kind: 'svg',
      labelKey: 'import.source.svg.label',
      helperKey: 'import.source.svg.helper',
      noteKey: 'import.source.svg.note',
      tooltipKey: 'import.source.svg.tooltip',
      iconKey: 'image',
      accept: '.svg,image/svg+xml'
    },
    {
      kind: 'mermaid',
      labelKey: 'import.source.mermaid.label',
      helperKey: 'import.source.mermaid.helper',
      noteKey: 'import.source.mermaid.note',
      tooltipKey: 'import.source.mermaid.tooltip',
      iconKey: 'graph',
      accept: '.mmd,.mermaid,text/plain'
    },
    {
      kind: 'dot',
      labelKey: 'import.source.dot.label',
      helperKey: 'import.source.dot.helper',
      noteKey: 'import.source.dot.note',
      tooltipKey: 'import.source.dot.tooltip',
      iconKey: 'graphComplete',
      accept: '.dot,text/plain'
    },
    {
      kind: 'csv',
      labelKey: 'import.source.csv.label',
      helperKey: 'import.source.csv.helper',
      noteKey: 'import.source.csv.note',
      tooltipKey: 'import.source.csv.tooltip',
      iconKey: 'bars',
      accept: '.csv,.tsv,text/csv,text/tab-separated-values'
    },
    {
      kind: 'image',
      labelKey: 'import.source.image.label',
      helperKey: 'import.source.image.helper',
      noteKey: 'import.source.image.note',
      tooltipKey: 'import.source.image.tooltip',
      iconKey: 'image',
      accept: '.png,.jpg,.jpeg,image/png,image/jpeg'
    }
  ];
  readonly selectedSourceOption = computed(() => this.sourceOptions.find((option) => option.kind === this.sourceKind()) ?? this.sourceOptions[0]);
  readonly activeSourceText = computed(() => (this.sourceKind() === 'tikz' || this.sourceKind() === 'mermaid' ? this.code() : this.fileContent()));
  readonly filePlaceholderKey = computed(() =>
    this.sourceKind() === 'tikz' || this.sourceKind() === 'mermaid' ? 'import.filePlaceholderPaste' : 'import.filePlaceholder'
  );
  readonly displayedWarnings = computed(() => (this.sourceKind() === 'tikz' ? this.parsedInput().warnings : this.warnings()));
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
    const hasCommands = /\\(?:draw|node|path|fill|filldraw|clip)\b/.test(source);
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
    this.codeChange.emit((event.target as HTMLTextAreaElement).value);
    this.syncScroll();
  }

  updateSourceKind(kind: ImportSourceKind): void {
    this.sourceKind.set(kind);
    this.fileError.set('');
    this.fileName.set('');
    this.fileContent.set('');
    this.imageDataUrl.set('');
    this.texDiagrams.set([]);
    this.selectedTexDiagramIndexes.set([]);
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
    const reader = new FileReader();
    reader.onerror = () => this.fileError.set(this.t('import.errorFileRead'));

    if (this.sourceKind() === 'image') {
      reader.onload = () => this.imageDataUrl.set(String(reader.result ?? ''));
      reader.readAsDataURL(file);
      return;
    }

    reader.onload = () => {
      const content = String(reader.result ?? '');
      if (this.sourceKind() === 'tikz' || this.sourceKind() === 'mermaid') {
        this.codeChange.emit(content);
        return;
      }

      this.fileContent.set(content);
      if (this.sourceKind() === 'tex') {
        const diagrams = extractTikzDiagrams(content);
        this.texDiagrams.set(diagrams);
        this.selectedTexDiagramIndexes.set(diagrams.map((_, index) => index));
      }
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

  private buildImportResult(): ImportDialogResult {
    switch (this.sourceKind()) {
      case 'tikz':
        return importTikzSource(this.code());
      case 'tex':
        return importTexSource(this.fileContent(), this.selectedTexDiagramIndexes());
      case 'project-json':
        return importProjectJson(this.fileContent(), this.appVersion());
      case 'drawio':
        return importDrawioSource(this.fileContent());
      case 'svg':
        return importSvgSource(this.fileContent());
      case 'mermaid':
        return importMermaidSource(this.code().trim() || this.fileContent());
      case 'dot':
        return importDotSource(this.fileContent());
      case 'csv':
        return importCsvSource(this.fileContent(), this.csvXColumn(), this.csvYColumn(), this.csvLabelColumn(), this.csvGroupColumn());
      case 'image':
        return importImageSource(this.imageDataUrl(), this.fileName() || this.t('import.source.image.label'));
    }
  }
}
