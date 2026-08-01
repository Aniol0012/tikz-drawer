import type { LanguageCode } from '../editor/i18n/editor-page.i18n';
import { isSitePageKey, resolveSitePage, SITE_PAGE_KEYS, type SitePageContent } from './site-page-content';

const visiblePageText = (page: SitePageContent): readonly string[] => {
  const base = [page.eyebrow, page.title, page.lede, page.primaryAction, page.secondaryAction];
  if (page.layout === 'visual') {
    return [
      ...base,
      ...page.sections.flatMap((section) => [
        section.title,
        ...(section.intro ? [section.intro] : []),
        ...(section.cards?.flatMap((card) => [...(card.label ? [card.label] : []), card.title, card.body]) ?? []),
        ...(section.code ? [section.code.title, section.code.caption] : [])
      ])
    ];
  }

  return [
    ...base,
    ...page.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.resources?.map((resource) => resource.label) ?? []),
      ...(section.link ? [section.link.label] : [])
    ])
  ];
};

describe('site page content', () => {
  it.each([
    ['guide', 'Create a TikZ diagram from start to finish'],
    ['examples', 'TikZ drawing examples for LaTeX'],
    ['about', 'About TikZ Drawer']
  ])('resolves %s from the page registry', (key, title) => {
    expect(resolveSitePage(key).title).toBe(title);
  });

  it('falls back to the guide for invalid route data', () => {
    expect(resolveSitePage('missing').key).toBe('guide');
    expect(resolveSitePage(null).key).toBe('guide');
  });

  it.each([
    ['ca', 'Crea un diagrama TikZ de principi a fi'],
    ['es', 'Crea un diagrama TikZ de principio a fin']
  ] satisfies readonly [LanguageCode, string][])('localizes the complete documentation content in %s', (language, expectedGuideTitle) => {
    expect(resolveSitePage('guide', language).title).toBe(expectedGuideTitle);

    for (const key of SITE_PAGE_KEYS) {
      const englishText = visiblePageText(resolveSitePage(key, 'en'));
      const localizedText = visiblePageText(resolveSitePage(key, language));

      expect(localizedText).toHaveLength(englishText.length);
      localizedText.forEach((value, index) => {
        expect(value).not.toBe(englishText[index]);
      });
    }
  });

  it('derives route validation from the page key registry', () => {
    expect(SITE_PAGE_KEYS.every(isSitePageKey)).toBe(true);
    expect(isSitePageKey('missing')).toBe(false);
  });

  it('uses exported images instead of editor canvases for every example card', () => {
    const examples = resolveSitePage('examples');
    expect(examples.layout).toBe('visual');
    if (examples.layout !== 'visual') {
      return;
    }

    const cards = examples.sections.flatMap((section) => section.cards ?? []);
    expect(cards).toHaveLength(6);
    expect(cards.every((card) => card.imageSrc?.endsWith('.webp'))).toBe(true);
  });

  it('uses semantic artwork instead of exported example images throughout the guide', () => {
    const guide = resolveSitePage('guide');
    expect(guide.layout).toBe('visual');
    if (guide.layout !== 'visual') {
      return;
    }

    const cards = guide.sections.flatMap((section) => section.cards ?? []);
    expect(cards).toHaveLength(15);
    expect(cards.every((card) => card.imageSrc === undefined)).toBe(true);
  });
});
