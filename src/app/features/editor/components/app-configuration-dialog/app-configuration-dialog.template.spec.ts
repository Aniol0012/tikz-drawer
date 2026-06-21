import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AppConfigurationDialogComponent template', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/app-configuration-dialog/app-configuration-dialog.component.html'), 'utf8');

  it('uses the shared scene icon component for the scene settings tab', async () => {
    const template = await readTemplate();

    expect(template).toContain('@else if (tab.sceneIcon)');
    expect(template).toContain('<app-scene-icon></app-scene-icon>');
  });

  it('keeps the about action outside the tablist and links to the project repository', async () => {
    const template = await readTemplate();
    const tablistEnd = template.indexOf('</div>', template.indexOf('role="tablist"'));
    const aboutButton = template.indexOf('class="about-button"');

    expect(aboutButton).toBeGreaterThan(tablistEnd);
    expect(template).toContain('https://github.com/Aniol0012/tikz-drawer');
    expect(template).toContain('Aniol0012/tikz-drawer');
    expect(template).toContain('src="logo.png"');
  });

  it('keeps behavior below the two-column general settings row', async () => {
    const template = await readTemplate();
    const codePreview = template.indexOf("{{ 'codePreview' | translate }}");
    const behavior = template.indexOf("{{ 'behavior' | translate }}");

    expect(behavior).toBeGreaterThan(codePreview);
    expect(template.slice(behavior - 120, behavior)).toContain('settings-card settings-card--wide');
  });

  it('uses a compact behavior grid and exposes context-menu configuration', async () => {
    const template = await readTemplate();

    expect(template).toContain('form-grid--behavior-options');
    expect(template).toContain('generalConfig().showMinimap');
    expect(template).toContain('generalConfig().confirmSceneReplacement');
    expect(template).toContain('(click)="openContextMenuSettings()"');
    expect(template).toContain('@for (row of contextMenuActionRows; track row.action)');
  });
});
