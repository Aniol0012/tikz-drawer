import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EditorTopbarComponent template', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-topbar/editor-topbar.component.html'), 'utf8');
  const readStyles = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-topbar/editor-topbar.component.css'), 'utf8');

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

  it('keeps pinned toolbar overflow contained in the center section', async () => {
    const styles = await readStyles();
    const topbar = sectionBetween(styles, '.topbar {', '}');
    const center = sectionBetween(styles, '.topbar__center {', '}');
    const toolCluster = sectionBetweenAfter(styles, '.primary-button--wide', '.tool-cluster {', '}');

    expect(topbar).toContain('grid-template-columns: auto minmax(0, 1fr) auto;');
    expect(center).toContain('min-width: 0;');
    expect(center).toContain('overflow: hidden;');
    expect(toolCluster).toContain('width: max-content;');
    expect(toolCluster).toContain('max-width: 100%;');
    expect(toolCluster).toContain('overflow-x: auto;');
  });

  it('keeps the scene title input compact', async () => {
    const styles = await readStyles();
    const sceneInput = sectionBetween(styles, '.scene-input {', '}');

    expect(sceneInput).toContain('max-width: 180px;');
    expect(sceneInput).toContain('flex: 0 1 180px;');
  });

  it('keeps left actions readable until the menu is needed', async () => {
    const styles = await readStyles();
    const topbarActions = sectionBetween(styles, '.topbar-actions {', '}');
    const toolbarButton = sectionBetween(styles, '.secondary-button--toolbar {', '}');

    expect(topbarActions).toContain('flex: 0 0 auto;');
    expect(topbarActions).toContain('overflow: visible;');
    expect(toolbarButton).toContain('flex: 0 0 auto;');
  });

  it('keeps mobile menu controls and primary actions compact', async () => {
    const styles = await readStyles();
    const inlineMenu = sectionBetween(styles, '.dropdown-menu__topbar-inline {', '}');
    const mobileTopbarActions = sectionBetweenAfter(styles, '@media (max-width: 760px)', '.topbar-primary-actions {', '}');

    expect(inlineMenu).toContain('grid-template-columns: minmax(96px, 1fr) auto auto auto;');
    expect(mobileTopbarActions).toContain('width: auto;');
    expect(mobileTopbarActions).toContain('display: flex;');
  });
});

function sectionBetween(template: string, startMarker: string, endMarker: string): string {
  const start = template.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);

  const end = template.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return template.slice(start, end);
}

function sectionBetweenAfter(template: string, afterMarker: string, startMarker: string, endMarker: string): string {
  const after = template.indexOf(afterMarker);
  expect(after).toBeGreaterThanOrEqual(0);

  const start = template.indexOf(startMarker, after);
  expect(start).toBeGreaterThanOrEqual(0);

  const end = template.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return template.slice(start, end);
}
