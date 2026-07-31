import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('LanguageSelectorComponent layout contract', () => {
  it('keeps its dropdown above WebGL artwork without changing document flow', async () => {
    const [component, template, selectorStyles, siteNavigationTemplate, siteNavigationStyles, globalStyles] = await Promise.all([
      readFile(resolve(process.cwd(), 'src/app/shared/language-selector/language-selector.component.ts'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/app/shared/language-selector/language-selector.component.html'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/app/shared/language-selector/language-selector.component.css'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/app/features/site-pages/components/site-navigation/site-navigation.component.html'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/app/features/site-pages/components/site-navigation/site-navigation.component.css'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/styles.css'), 'utf8')
    ]);

    expect(component).not.toContain('menuOpen');
    expect(template).not.toContain('(sl-show)');
    expect(selectorStyles).toContain('--sl-z-index-dropdown: 2147483000;');
    expect(selectorStyles).toContain('transform: translateZ(0);');
    expect(siteNavigationTemplate).toContain('<a class="brand" routerLink="/">TikZ Drawer</a>');
    expect(siteNavigationTemplate).not.toContain('brand__compact');
    expect(siteNavigationStyles).not.toContain('padding-bottom');
    expect(siteNavigationStyles).not.toContain('language-selector--open');
    expect(globalStyles).toContain('body:has(app-site-navigation .language-dropdown[open]) app-diagram-artwork');
    expect(globalStyles).toContain('pointer-events: none;');
  });
});
