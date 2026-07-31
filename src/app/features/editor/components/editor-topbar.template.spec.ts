import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EditorTopbarComponent template', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-topbar/editor-topbar.component.html'), 'utf8');
  const readStyles = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-topbar/editor-topbar.component.css'), 'utf8');
  const readThemeToggleTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/shared/theme-toggle-button/theme-toggle-button.component.html'), 'utf8');
  const readThemeToggleStyles = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/shared/theme-toggle-button/theme-toggle-button.component.css'), 'utf8');

  it('keeps import code as a fixed primary action next to export', async () => {
    const template = await readTemplate();
    const primaryActions = sectionBetween(template, '<div class="topbar-primary-actions">', '</div>');
    const importIndex = primaryActions.indexOf('importOpen.emit()');
    const exportIndex = primaryActions.indexOf('exportOpen.emit()');

    expect(importIndex).toBeGreaterThanOrEqual(0);
    expect(exportIndex).toBeGreaterThan(importIndex);
    expect(primaryActions).toContain('primary-button--import');
    expect(primaryActions).toContain("icon('importArrow')");
    expect(primaryActions).toContain("icon('exportArrow')");
    expect(primaryActions).toContain("icon('exportTray')");
    expect(primaryActions).toContain("{{ t('importCode') }}");
    expect(primaryActions).toContain("{{ t('export') }}");
  });

  it('uses split icon parts for primary action arrow animations', async () => {
    const template = await readTemplate();
    const styles = await readStyles();
    const primaryActions = sectionBetween(template, '<div class="topbar-primary-actions">', '</div>');

    expect(primaryActions).toContain('transfer-icon__arrow');
    expect(primaryActions).toContain('transfer-icon__tray');
    expect(styles).toContain('.transfer-icon__arrow');
    expect(styles).toContain('transform: translateY(2.5px);');
    expect(styles).toContain('transform: translateY(-2.5px);');
  });

  it('keeps theme toggle icons layered for sun moon transitions', async () => {
    const topbarTemplate = await readTemplate();
    const template = await readThemeToggleTemplate();
    const styles = await readThemeToggleStyles();

    expect(topbarTemplate.split('<app-theme-toggle-button').length - 1).toBe(2);
    expect(template).toContain('theme-toggle-icon__sun');
    expect(template).toContain('theme-toggle-icon__sun-core');
    expect(template).toContain('theme-toggle-icon__sun-rays');
    expect(template).toContain('theme-toggle-icon__moon');
    expect(template).not.toContain('theme-toggle-icon__moon-star');
    expect(template).toContain('[class.is-dark-theme]="theme() === \'dark\'"');
    expect(styles).toContain('.theme-toggle-button.is-dark-theme .theme-toggle-icon__sun');
    expect(styles).not.toContain('theme-toggle-icon__moon-star');
    expect(styles).toContain('@keyframes theme-toggle-pop');
  });

  it('does not put import code in the burger menu', async () => {
    const template = await readTemplate();
    const menu = sectionBetween(template, '<div class="dropdown-menu dropdown-menu--topbar"', '<div class="topbar__right">');

    expect(menu).not.toContain('importOpen.emit()');
    expect(menu).not.toContain("{{ t('importCode') }}");
  });

  it('shows the guide shortcut only while the desktop topbar has room', async () => {
    const template = await readTemplate();
    const rightActions = sectionBetween(template, '<div class="topbar__right">', '<div class="topbar-primary-actions">');

    expect(rightActions).toContain('@if (showGuideShortcut())');
    expect(rightActions).toContain('routerLink="/guide"');
    expect(rightActions).toContain("icon('info')");
    expect(rightActions).toContain('[attr.aria-label]="\'site.guide.eyebrow\' | translate"');
    expect(rightActions).toContain('[title]="\'site.guide.eyebrow\' | translate"');
    expect(rightActions).not.toContain('aria-label="TikZ Drawer guide"');
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

  it('moves mobile transfer actions into the title row while preserving the desktop actions', async () => {
    const template = await readTemplate();
    const styles = await readStyles();
    const inlineMenu = sectionBetween(styles, '.dropdown-menu__topbar-inline {', '}');
    const mobileMenu = sectionBetween(template, '<div class="dropdown-menu__topbar-inline">', '</div>');
    const transferActions = sectionBetween(template, '<div class="mobile-transfer-actions"', '</div>');
    const mobileTransferActions = sectionBetweenAfter(styles, '@media (max-width: 760px)', '.mobile-transfer-actions {', '}');
    const mobileTopbarRight = sectionBetweenAfter(styles, '@media (max-width: 760px)', '.topbar__right {', '}');

    expect(inlineMenu).toContain('grid-template-columns: minmax(76px, 1fr) repeat(4, auto);');
    expect(mobileMenu).toContain('routerLink="/guide"');
    expect(mobileMenu).toContain("'site.guide.eyebrow' | translate");
    expect(transferActions).toContain('(click)="importOpen.emit()"');
    expect(transferActions).toContain('(click)="exportOpen.emit()"');
    expect(transferActions).toContain('icon-button mobile-transfer-action mobile-transfer-action--import');
    expect(transferActions).toContain('icon-button mobile-transfer-action mobile-transfer-action--export');
    expect(transferActions).toContain('[attr.aria-label]="t(\'importCode\')"');
    expect(transferActions).toContain("icon('importArrow')");
    expect(transferActions).toContain("icon('exportArrow')");
    expect(mobileTransferActions).toContain('display: flex;');
    expect(mobileTopbarRight).toContain('display: none;');
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
