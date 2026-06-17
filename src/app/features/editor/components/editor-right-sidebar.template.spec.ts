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
    expect(template).toContain('sidebar-tab__icon');
  });

  it('animates properties and scene tab icons on hover', async () => {
    const styles = await readStyles();

    expect(styles).toContain('@keyframes sidebar-properties-pins');
    expect(styles).toContain('.sidebar-tab--properties:hover .sidebar-tab__icon');
    expect(styles).toContain('.sidebar-tab--scene:hover .sidebar-tab__icon');
    expect(styles).toContain('transform: scale(0.82);');
  });
});
