import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EditorPageComponent template', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-page/editor-page.component.html'), 'utf8');

  it('keeps the inspector toggle and assistant entry available while auto-collapsed', async () => {
    const template = await readTemplate();

    expect(template).toContain('class="sidebar-resizer-toggle sidebar-resizer-toggle--right"');
    expect(template).toContain('(click)="openAssistant(); $event.stopPropagation()"');
    expect(template).not.toContain('is-inspector-hidden');
  });

  it('shows a tooltip-free LaTeX warning inside the input for the example placeholder', async () => {
    const template = await readTemplate();

    expect(template).toContain('class="image-path-input"');
    expect(template).toContain('@if (isDefaultLatexImagePath(shape))');
    expect(template).toContain('class="image-path-input__warning"');
    expect(template).not.toContain('[attr.data-tooltip]="\'latexImagePathWarning\' | translate"');
    expect(template).not.toContain('class="image-path-warning');
  });
});
