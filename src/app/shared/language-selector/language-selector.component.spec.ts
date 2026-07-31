import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('LanguageSelectorComponent layout contract', () => {
  it('exposes its open state so documentation can reserve space above artwork', async () => {
    const [component, template, siteNavigationStyles] = await Promise.all([
      readFile(resolve(process.cwd(), 'src/app/shared/language-selector/language-selector.component.ts'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/app/shared/language-selector/language-selector.component.html'), 'utf8'),
      readFile(resolve(process.cwd(), 'src/app/features/site-pages/components/site-navigation/site-navigation.component.css'), 'utf8')
    ]);

    expect(component).toContain("'[class.language-selector--open]': 'menuOpen()'");
    expect(template).toContain('(sl-show)="menuOpen.set(true)"');
    expect(template).toContain('(sl-hide)="menuOpen.set(false)"');
    expect(siteNavigationStyles).toContain(':has(app-language-selector.language-selector--open)');
  });
});
