import type { SitePageKey } from './site-page-content';

export interface SeoRouteData {
  readonly title: string;
  readonly description: string;
  readonly canonicalPath: string | null;
  readonly robots: string;
}

export const EDITOR_SEO = {
  title: 'TikZ Drawer | free online visual TikZ editor',
  description:
    'Create LaTeX TikZ diagrams visually with a free online editor. Draw shapes, graphs and labels, then export clean TikZ code with no installation required.',
  canonicalPath: '/',
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
} as const satisfies SeoRouteData;

export const SITE_PAGE_SEO = {
  guide: {
    title: 'How to create and export TikZ diagrams | TikZ Drawer',
    description:
      'Learn how to import, draw or generate a TikZ diagram with AI, refine it visually, export it to Overleaf and save or share the editable project.',
    canonicalPath: '/guide/',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1'
  },
  examples: {
    title: 'TikZ drawing examples for LaTeX | TikZ Drawer',
    description: 'Explore visual TikZ examples for LaTeX: flowcharts, directed graphs, geometry, neural networks and system diagrams you can adapt online.',
    canonicalPath: '/examples/',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1'
  },
  about: {
    title: 'About TikZ Drawer | open-source visual TikZ editor',
    description: 'Learn about TikZ Drawer, a free open-source visual editor created by Aniol0012 for drawing diagrams and exporting LaTeX TikZ code online.',
    canonicalPath: '/about/',
    robots: 'index, follow, max-image-preview:large, max-snippet:-1'
  }
} as const satisfies Readonly<Record<SitePageKey, SeoRouteData>>;

export const NOT_FOUND_SEO = {
  title: 'Page not found | TikZ Drawer',
  description: 'This page could not be found. Return to the TikZ Drawer editor or browse the visual TikZ guide and examples.',
  canonicalPath: null,
  robots: 'noindex, follow'
} as const satisfies SeoRouteData;
