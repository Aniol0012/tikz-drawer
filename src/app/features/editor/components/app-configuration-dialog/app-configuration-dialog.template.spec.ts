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
    expect(template).toContain('<sl-dropdown #configurationDropdown class="configuration-file-menu"');
    expect(template).toContain('class="configuration-file-menu__trigger"');
    expect(template).toContain('(click)="triggerConfigurationImport(configurationDropdown)"');
    expect(template).toContain('(click)="exportConfiguration(configurationDropdown)"');
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
    expect(template).toContain('@for (row of contextMenuActionRows(); track row.action)');
    expect(template).toContain('[iconPath]="row.iconPath"');
    expect(template).toContain('(dragstart)="startContextMenuActionDrag(row.action, $event)"');
    expect(template).toContain('(dragover)="previewContextMenuActionMove(row.action, $event)"');
    expect(template).toContain('{{ $index + 1 }}');
    expect(template).toContain('[style.--context-menu-action-rows]="contextMenuActionColumnSize()"');
    expect(template).not.toContain('context-menu-action-drag-handle');
  });

  it('exposes an accessible default image path with validation feedback', async () => {
    const template = await readTemplate();

    expect(template).toContain('preferences().defaultImagePath');
    expect(template).toContain('aria-describedby="default-image-path-help default-image-path-error"');
    expect(template).toContain('defaultImagePathInvalid()');
    expect(template).toContain('role="alert"');
  });

  it('uses the shared color picker for configuration color fields', async () => {
    const template = await readTemplate();

    expect(template.split('<app-color-picker').length - 1).toBe(4);
    expect(template).toContain('(valueChange)="setPreferenceText(\'defaultStroke\', $event)"');
    expect(template).toContain('(valueChange)="setPreferenceText(\'defaultFill\', $event)"');
    expect(template).toContain('(valueChange)="setPreferenceText(\'defaultTextColor\', $event)"');
    expect(template).toContain('opacityControlPlacement="panel"');
    expect(template).toContain('opacityControlPlacement="summary"');
    expect(template).toContain('(opacityChange)="setPreferenceNumber(\'defaultStrokeOpacity\', $event, 0, 1)"');
    expect(template).toContain('(opacityChange)="setPreferenceNumber(\'defaultFillOpacity\', $event, 0, 1)"');
    expect(template).toContain('(opacityChange)="setPreferenceNumber(\'defaultTextOpacity\', $event, 0, 1)"');
    expect(template).not.toContain('type="color"');
  });

  it('organizes scene settings by intent and explains advanced controls', async () => {
    const template = await readTemplate();

    expect(template).not.toContain('scene-panel-intro');
    expect(template).toContain('settings-card--style');
    expect(template).toContain('settings-card--arrows');
    expect(template).toContain('settings-card--text');
    expect(template).toContain('settings-card--canvas');
    expect(template).toContain('settings-card--snapping');
    expect(template).toContain('settings-card--images');
    expect(template).toContain("'gridStepTooltip' | translate");
    expect(template).toContain("'snapStepTooltip' | translate");
    expect(template).toContain("'objectSnapToleranceTooltip' | translate");
    expect(template).toContain("'defaultTextAlignTooltip' | translate");
    expect(template).not.toContain('scene-preview__metrics');
    expect(template).not.toContain('live-indicator');
  });

  it('renders a live preview for style, typography and snapping aids', async () => {
    const template = await readTemplate();

    expect(template).toContain('[attr.font-weight]="preferences().defaultTextWeight"');
    expect(template).toContain('[attr.font-style]="preferences().defaultTextStyle"');
    expect(template).toContain('[attr.text-decoration]="preferences().defaultTextDecoration"');
    expect(template).toContain('[attr.text-anchor]="previewTextAnchor()"');
    expect(template).toContain('scene-preview__snap-point');
    expect(template).toContain('scene-preview__snap-guides');
    expect(template).toContain('previewGridSnapEditing()');
    expect(template).toContain('previewObjectSnapEditing()');
  });
});
