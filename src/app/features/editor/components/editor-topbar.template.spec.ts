import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EditorTopbarComponent template', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-topbar/editor-topbar.component.html'), 'utf8');

  it('keeps import code as a fixed primary action next to export', async () => {
    const template = await readTemplate();
    const primaryActions = sectionBetween(template, '<div class="topbar-primary-actions">', '</div>');
    const importIndex = primaryActions.indexOf('importOpen.emit()');
    const exportIndex = primaryActions.indexOf('exportOpen.emit()');

    expect(importIndex).toBeGreaterThanOrEqual(0);
    expect(exportIndex).toBeGreaterThan(importIndex);
    expect(primaryActions).toContain('primary-button--import');
    expect(primaryActions).toContain("{{ t('importCode') }}");
    expect(primaryActions).toContain("{{ t('export') }}");
  });

  it('does not put import code in the burger menu', async () => {
    const template = await readTemplate();
    const menu = sectionBetween(template, '<div class="dropdown-menu dropdown-menu--topbar"', '<div class="topbar__right">');

    expect(menu).not.toContain('importOpen.emit()');
    expect(menu).not.toContain("{{ t('importCode') }}");
  });
});

function sectionBetween(template: string, startMarker: string, endMarker: string): string {
  const start = template.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);

  const end = template.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return template.slice(start, end);
}
