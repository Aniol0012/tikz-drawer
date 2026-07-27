import { isSitePageKey, resolveSitePage, SITE_PAGE_KEYS } from './site-page-content';

describe('site page content', () => {
  it.each([
    ['guide', 'How to draw TikZ diagrams online'],
    ['examples', 'TikZ drawing examples for LaTeX'],
    ['about', 'About TikZ Drawer']
  ])('resolves %s from the page registry', (key, title) => {
    expect(resolveSitePage(key).title).toBe(title);
  });

  it('falls back to the guide for invalid route data', () => {
    expect(resolveSitePage('missing').key).toBe('guide');
    expect(resolveSitePage(null).key).toBe('guide');
  });

  it('derives route validation from the page key registry', () => {
    expect(SITE_PAGE_KEYS.every(isSitePageKey)).toBe(true);
    expect(isSitePageKey('missing')).toBe(false);
  });
});
