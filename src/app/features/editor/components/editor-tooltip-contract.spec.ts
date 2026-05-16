import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

async function readWorkspaceFile(path: string): Promise<string> {
  return await readFile(resolve(workspaceRoot, path), 'utf8');
}

describe('editor tooltip contract', () => {
  it('keeps canvas assistant and layers chips on app tooltips without native titles', async () => {
    const template = await readWorkspaceFile('src/app/features/editor/components/editor-page/editor-page.component.html');
    const assistantChip = chipTemplate(template, 'canvas-chip--assistant');
    const layersChip = chipTemplate(template, 'canvas-chip--objects');

    for (const chip of [assistantChip, layersChip]) {
      expect(chip).toContain('[attr.data-tooltip]');
      expect(chip).toContain('data-tooltip-enabled');
      expect(chip).toContain('[attr.aria-label]');
      expect(chip).not.toContain('[title]');
      expect(chip).not.toContain(' title=');
    }
  });

  it('keeps toolbar tool buttons on app tooltips without native titles', async () => {
    const topbarTemplate = await readWorkspaceFile('src/app/features/editor/components/editor-topbar/editor-topbar.component.html');
    const sharedToolTemplate = await readWorkspaceFile('src/app/features/editor/components/tool-button/tool-button.component.html');

    for (const button of toolButtonTemplates(topbarTemplate)) {
      expect(button).toContain('[attr.data-tooltip]');
      expect(button).toContain('data-tooltip-enabled');
      expect(button).toContain('[attr.aria-label]');
      expect(button).not.toContain('[title]');
      expect(button).not.toContain(' title=');
    }

    expect(sharedToolTemplate).toContain('[attr.data-tooltip]');
    expect(sharedToolTemplate).toContain('data-tooltip-enabled');
    expect(sharedToolTemplate).toContain('[attr.aria-label]');
    expect(sharedToolTemplate).not.toContain('[title]');
    expect(sharedToolTemplate).not.toContain(' title=');
  });
});

function chipTemplate(template: string, className: string): string {
  const start = template.indexOf(`class="canvas-chip ${className}`);
  expect(start).toBeGreaterThanOrEqual(0);

  const end = template.indexOf('</button>', start);
  expect(end).toBeGreaterThan(start);
  return template.slice(start, end);
}

function toolButtonTemplates(template: string): readonly string[] {
  const matches = [...template.matchAll(/class="tool-button/g)].map((match) => {
    const classStart = match.index;
    const buttonStart = template.lastIndexOf('<button', classStart);
    const buttonEnd = template.indexOf('</button>', classStart);
    expect(buttonStart).toBeGreaterThanOrEqual(0);
    expect(buttonEnd).toBeGreaterThan(classStart);
    return template.slice(buttonStart, buttonEnd);
  });
  expect(matches.length).toBeGreaterThan(0);
  return matches;
}
