import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SceneIconComponent contract', () => {
  const readTemplate = (): Promise<string> =>
    readFile(resolve(process.cwd(), 'src/app/features/editor/components/scene-icon/scene-icon.component.html'), 'utf8');
  const readStyles = (): Promise<string> => readFile(resolve(process.cwd(), 'src/app/features/editor/components/scene-icon/scene-icon.component.css'), 'utf8');

  it('renders the shared scene-corners icon', async () => {
    const template = await readTemplate();

    expect(template).toContain('scene-icon__corner');
    expect(template).toContain('viewBox="0 0 24 24"');
  });

  it('owns the scene icon inward-corner animation', async () => {
    const styles = await readStyles();

    expect(styles).toContain(':host-context(button:hover) .scene-icon__corner--top-left');
    expect(styles).toContain('transform: translate(2px, 2px);');
    expect(styles).not.toContain('transform: scale');
    expect(styles).not.toContain('opacity: 0.9;');
  });
});
