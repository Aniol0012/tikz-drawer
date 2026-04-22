import { ChangeDetectionStrategy, Component, computed, ElementRef, input, output, viewChild } from '@angular/core';
import { highlightLatex } from '../../utils/editor-page.utils';
import { parseTikz } from '../../tikz/tikz.parser';

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
  const begin = source.match(new RegExp(String.raw`\\begin\{${environment}\}`, 'g'))?.length ?? 0;
  const end = source.match(new RegExp(String.raw`\\end\{${environment}\}`, 'g'))?.length ?? 0;
  return begin !== end;
};

@Component({
  selector: 'app-import-code-modal',
  templateUrl: './import-code-modal.component.html',
  styleUrl: './import-code-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportCodeModalComponent {
  readonly title = input.required<string>();
  readonly actionLabel = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly warningsLabel = input.required<string>();
  readonly code = input.required<string>();
  readonly codeTheme = input.required<string>();
  readonly warnings = input<readonly string[]>([]);

  readonly closeDialog = output<void>();
  readonly codeChange = output<string>();
  readonly importCode = output<void>();

  readonly importCodeInput = viewChild<ElementRef<HTMLTextAreaElement>>('importCodeInput');
  readonly importCodePreview = viewChild<ElementRef<HTMLPreElement>>('importCodePreview');

  readonly highlightedCode = computed(() => highlightLatex(this.code() || ' '));
  readonly parsedInput = computed(() => parseTikz(this.code()));
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

  syncScroll(): void {
    const input = this.importCodeInput()?.nativeElement;
    const preview = this.importCodePreview()?.nativeElement;
    if (!input || !preview) {
      return;
    }

    preview.scrollTop = input.scrollTop;
    preview.scrollLeft = input.scrollLeft;
  }
}
