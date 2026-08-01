import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NOT_FOUND_SEO, SITE_PAGE_SEO, type SeoRouteData } from '../src/app/features/site-pages/site-page-seo';
import {
  resolveSitePage,
  SITE_PAGE_KEYS,
  type SitePageCard,
  type SitePageCodeSample,
  type SitePageContent,
  type SitePageResourceLink,
  type SitePageSection,
  type SitePageTextLink,
  type SitePageTextSection
} from '../src/app/features/site-pages/site-page-content';

const SITE_ORIGIN = 'https://tikzdrawer.com';
const OUTPUT_DIRECTORY = path.resolve('dist/tikz-drawer/browser');
const INDEX_PATH = path.join(OUTPUT_DIRECTORY, 'index.html');
const STATIC_NAVIGATION =
  '<nav aria-label="TikZ Drawer pages"><a href="/">Open the TikZ editor</a> · <a href="/guide/">Guide</a> · <a href="/examples/">Examples</a> · <a href="/about/">About</a></nav>';

const SHELL_PATTERNS = {
  title: /<title>[\s\S]*?<\/title>/i,
  description: /<meta\s+name="description"[^>]*>/i,
  robots: /<meta\s+name="robots"[^>]*>/i,
  canonical: /\s*<link\s+rel="canonical"[^>]*>/i,
  openGraphTitle: /<meta\s+property="og:title"[^>]*>/i,
  openGraphDescription: /<meta\s+property="og:description"[^>]*>/i,
  openGraphUrl: /\s*<meta\s+property="og:url"[^>]*>/i,
  twitterTitle: /<meta\s+name="twitter:title"[^>]*>/i,
  twitterDescription: /<meta\s+name="twitter:description"[^>]*>/i,
  appRoot: /<app-root>[\s\S]*?<\/app-root>/i
} as const;

const escapeHtmlAttribute = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeHtml = (value: string): string => escapeHtmlAttribute(value).replaceAll("'", '&#39;');

const renderParagraph = (value: string | undefined): string => {
  if (!value) {
    return '';
  }

  return `<p>${escapeHtml(value)}</p>`;
};

const renderCard = (card: SitePageCard): string => {
  const label = renderParagraph(card.label);
  return `<li>${label}<h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.body)}</p></li>`;
};

const renderCards = (cards: readonly SitePageCard[] | undefined): string => {
  if (!cards?.length) {
    return '';
  }

  return `<ul>${cards.map(renderCard).join('')}</ul>`;
};

const renderCodeSample = (sample: SitePageCodeSample | undefined): string => {
  if (!sample) {
    return '';
  }

  return `<figure><figcaption>${escapeHtml(sample.caption)}</figcaption><pre><code>${escapeHtml(sample.value)}</code></pre></figure>`;
};

const renderVisualSection = (section: SitePageSection): string => {
  const intro = renderParagraph(section.intro);
  const cards = renderCards(section.cards);
  const codeSample = renderCodeSample(section.code);

  return `<section id="${escapeHtmlAttribute(section.id)}"><h2>${escapeHtml(section.title)}</h2>${intro}${cards}${codeSample}</section>`;
};

const renderResource = (resource: SitePageResourceLink): string => `<li><a href="${escapeHtmlAttribute(resource.href)}">${escapeHtml(resource.label)}</a></li>`;

const renderResources = (resources: readonly SitePageResourceLink[] | undefined): string => {
  if (!resources?.length) {
    return '';
  }

  return `<ul>${resources.map(renderResource).join('')}</ul>`;
};

const renderTextLink = (link: SitePageTextLink | undefined): string => {
  if (!link) {
    return '';
  }

  return `<p><a href="${escapeHtmlAttribute(link.href)}">${escapeHtml(link.label)}</a></p>`;
};

const renderEditorialSection = (section: SitePageTextSection): string => {
  const paragraphs = section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('');
  const resources = renderResources(section.resources);
  const link = renderTextLink(section.link);

  return `<section id="${escapeHtmlAttribute(section.id)}"><h2>${escapeHtml(section.title)}</h2>${paragraphs}${resources}${link}</section>`;
};

const renderPageSections = (page: SitePageContent): string => {
  if (page.layout === 'visual') {
    return page.sections.map(renderVisualSection).join('');
  }

  return page.sections.map(renderEditorialSection).join('');
};

const renderStaticPageContent = (page: SitePageContent): string => {
  const sections = renderPageSections(page);
  return `<main id="seo-static-content" hidden><header><p>${escapeHtml(page.eyebrow)}</p><h1>${escapeHtml(page.title)}</h1><p>${escapeHtml(
    page.lede
  )}</p></header>${sections}${STATIC_NAVIGATION}</main>`;
};

const getPageSchemaType = (page: SitePageContent): 'AboutPage' | 'WebPage' => {
  if (page.key === 'about') {
    return 'AboutPage';
  }

  return 'WebPage';
};

const createPageSchema = (page: SitePageContent, seo: SeoRouteData): string => {
  const url = `${SITE_ORIGIN}${seo.canonicalPath ?? '/'}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': getPageSchemaType(page),
    '@id': `${url}#webpage`,
    url,
    name: seo.title,
    description: seo.description,
    inLanguage: 'en',
    isPartOf: {
      '@id': `${SITE_ORIGIN}/#website`
    },
    about: {
      '@id': `${SITE_ORIGIN}/#application`
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'TikZ Drawer',
          item: `${SITE_ORIGIN}/`
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: page.title,
          item: url
        }
      ]
    }
  };

  return `<script id="route-structured-data" type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`;
};

const applyRouteMetadata = (indexHtml: string, seo: SeoRouteData): string =>
  indexHtml
    .replace(SHELL_PATTERNS.title, `<title>${escapeHtml(seo.title)}</title>`)
    .replace(SHELL_PATTERNS.description, `<meta name="description" content="${escapeHtmlAttribute(seo.description)}">`)
    .replace(SHELL_PATTERNS.robots, `<meta name="robots" content="${escapeHtmlAttribute(seo.robots)}">`)
    .replace(SHELL_PATTERNS.openGraphTitle, `<meta property="og:title" content="${escapeHtmlAttribute(seo.title)}">`)
    .replace(SHELL_PATTERNS.openGraphDescription, `<meta property="og:description" content="${escapeHtmlAttribute(seo.description)}">`)
    .replace(SHELL_PATTERNS.twitterTitle, `<meta name="twitter:title" content="${escapeHtmlAttribute(seo.title)}">`)
    .replace(SHELL_PATTERNS.twitterDescription, `<meta name="twitter:description" content="${escapeHtmlAttribute(seo.description)}">`);

const applyCanonicalMetadata = (html: string, canonicalPath: string | null): string => {
  if (!canonicalPath) {
    return html.replace(SHELL_PATTERNS.canonical, '').replace(SHELL_PATTERNS.openGraphUrl, '');
  }

  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath}`;
  return html
    .replace(SHELL_PATTERNS.canonical, `<link rel="canonical" href="${canonicalUrl}">`)
    .replace(SHELL_PATTERNS.openGraphUrl, `<meta property="og:url" content="${canonicalUrl}">`);
};

const injectStaticPage = (html: string, page: SitePageContent, seo: SeoRouteData): string =>
  html
    .replace(SHELL_PATTERNS.appRoot, `<app-root>${renderStaticPageContent(page)}</app-root>`)
    .replace('</head>', `    ${createPageSchema(page, seo)}\n  </head>`);

const createRouteShell = (indexHtml: string, seo: SeoRouteData, page?: SitePageContent): string => {
  const htmlWithMetadata = applyRouteMetadata(indexHtml, seo);
  const htmlWithCanonical = applyCanonicalMetadata(htmlWithMetadata, seo.canonicalPath);

  if (!page) {
    return htmlWithCanonical;
  }

  return injectStaticPage(htmlWithCanonical, page, seo);
};

const writeSitePageShell = async (indexHtml: string, pageKey: (typeof SITE_PAGE_KEYS)[number]): Promise<void> => {
  const routeDirectory = path.join(OUTPUT_DIRECTORY, pageKey);
  const routeIndexPath = path.join(routeDirectory, 'index.html');
  const routeHtml = createRouteShell(indexHtml, SITE_PAGE_SEO[pageKey], resolveSitePage(pageKey));

  await mkdir(routeDirectory, { recursive: true });
  await writeFile(routeIndexPath, routeHtml, 'utf8');
};

const generateStaticRouteShells = async (): Promise<void> => {
  await stat(INDEX_PATH);
  const indexHtml = await readFile(INDEX_PATH, 'utf8');

  for (const pageKey of SITE_PAGE_KEYS) {
    await writeSitePageShell(indexHtml, pageKey);
  }

  const fallbackPath = path.join(OUTPUT_DIRECTORY, '404.html');
  const fallbackHtml = createRouteShell(indexHtml, NOT_FOUND_SEO);
  await writeFile(fallbackPath, fallbackHtml, 'utf8');

  console.log(`Static route shells and GitHub Pages fallback created in ${OUTPUT_DIRECTORY}`);
};

await generateStaticRouteShells();
