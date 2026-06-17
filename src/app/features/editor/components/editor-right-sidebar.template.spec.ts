import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('EditorRightSidebarComponent template', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-right-sidebar/editor-right-sidebar.component.html'), 'utf8');
  const readStyles = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/editor-right-sidebar/editor-right-sidebar.component.css'), 'utf8');

  it('keeps sidebar tabs addressable for icon microinteractions', async () => {
    const template = await readTemplate();

    expect(template).toContain('sidebar-tab--properties');
    expect(template).toContain('sidebar-tab--scene');
    expect(template).toContain('sidebar-tab--assistant');
    expect(template).toContain('properties-tab-icon__knob');
    expect(template).toContain('app-scene-icon');
  });

  it('animates properties knobs and delegates scene icon animation to the shared component', async () => {
    const styles = await readStyles();

    expect(styles).toContain('@keyframes sidebar-property-knob-top');
    expect(styles).toContain('@keyframes sidebar-property-knob-middle');
    expect(styles).toContain('@keyframes sidebar-property-knob-bottom');
    expect(styles).toContain('.sidebar-tab--properties:hover .properties-tab-icon__knob--top');
    expect(styles).toContain('.sidebar-tab__scene-icon');
  });
});
