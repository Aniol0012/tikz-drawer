import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NOT_FOUND_SEO, SITE_PAGE_SEO, type SeoRouteData } from '../src/app/features/site-pages/site-page-seo';
import { SITE_PAGE_KEYS } from '../src/app/features/site-pages/site-page-content';

const SITE_ORIGIN = 'https://tikzdrawer.com';
const outputDirectory = path.resolve('dist/tikz-drawer/browser');
const indexPath = path.join(outputDirectory, 'index.html');

const escapeHtmlAttribute = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const createRouteShell = (indexHtml: string, seo: SeoRouteData): string => {
  const canonicalUrl = seo.canonicalPath ? `${SITE_ORIGIN}${seo.canonicalPath}` : null;
  let html = indexHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${seo.title}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${escapeHtmlAttribute(seo.description)}">`)
    .replace(/<meta\s+name="robots"[^>]*>/i, `<meta name="robots" content="${escapeHtmlAttribute(seo.robots)}">`)
    .replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${escapeHtmlAttribute(seo.title)}">`)
    .replace(/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${escapeHtmlAttribute(seo.description)}">`)
    .replace(/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${escapeHtmlAttribute(seo.title)}">`)
    .replace(/<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${escapeHtmlAttribute(seo.description)}">`);

  if (canonicalUrl) {
    html = html
      .replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonicalUrl}">`)
      .replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonicalUrl}">`);
  } else {
    html = html.replace(/\s*<link\s+rel="canonical"[^>]*>/i, '').replace(/\s*<meta\s+property="og:url"[^>]*>/i, '');
  }

  return html;
};

await stat(indexPath);
const indexHtml = await readFile(indexPath, 'utf8');

for (const pageKey of SITE_PAGE_KEYS) {
  const routeDirectory = path.join(outputDirectory, pageKey);
  await mkdir(routeDirectory, { recursive: true });
  await writeFile(path.join(routeDirectory, 'index.html'), createRouteShell(indexHtml, SITE_PAGE_SEO[pageKey]), 'utf8');
}

const fallbackPath = path.join(outputDirectory, '404.html');
await writeFile(fallbackPath, createRouteShell(indexHtml, NOT_FOUND_SEO), 'utf8');

console.log(`GitHub Pages route shells and fallback created in ${outputDirectory}`);
