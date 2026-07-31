import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const readWorkspaceFile = (path: string): Promise<string> => readFile(resolve(process.cwd(), path), 'utf8');

describe('application landmarks', () => {
  it('keeps the static SEO content hidden before Angular replaces it', async () => {
    const indexHtml = await readWorkspaceFile('src/index.html');
    const staticShellGenerator = await readWorkspaceFile('scripts/generate-static-route-shells.mts');

    expect(indexHtml).toContain('<main id="seo-static-content" hidden>');
    expect(staticShellGenerator).toContain('<main id="seo-static-content" hidden>');
  });

  it('keeps the main landmark in the persistent application shell', async () => {
    const template = await readWorkspaceFile('src/app/app.html');

    expect(template).toContain('<main id="main-content">');
    expect(template.split('<main').length - 1).toBe(1);
  });

  it('does not duplicate the main landmark inside routed pages', async () => {
    const routedTemplates = await Promise.all([
      readWorkspaceFile('src/app/features/editor/components/editor-page/editor-page.component.html'),
      readWorkspaceFile('src/app/features/site-pages/site-information-page.component.html'),
      readWorkspaceFile('src/app/features/not-found/not-found-page.component.html')
    ]);

    for (const template of routedTemplates) {
      expect(template).not.toContain('<main');
      expect(template).not.toContain('role="main"');
    }
  });
});
