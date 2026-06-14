import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REGEX } from '../../../../shared/regex/regex.utils';

describe('ImportCodeModalComponent template', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/import-code-modal/import-code-modal.component.html'), 'utf8');

  it('keeps the clear-scene toggle in the footer actions immediately before the import button', async () => {
    const template = await readTemplate();
    const footerActions = template.match(REGEX.editor.importFooterActions)?.[1] ?? '';

    expect(footerActions.indexOf('<app-toggle-field')).toBeGreaterThanOrEqual(0);
    expect(footerActions.indexOf('<button class="primary-button"')).toBeGreaterThan(footerActions.indexOf('<app-toggle-field'));
    expect(footerActions).toContain('[label]="\'import.clearSceneBeforeImport\' | translate"');
    expect(footerActions).toContain('(checkedChange)="setClearSceneBeforeImport($event)"');
  });

  it('does not render the clear-scene toggle in the import input panel', async () => {
    const template = await readTemplate();
    const inputPanel = template.match(REGEX.editor.importInputPanel)?.[0] ?? '';

    expect(inputPanel).not.toContain('<app-toggle-field');
    expect(inputPanel).not.toContain('clearSceneBeforeImport');
  });
});
