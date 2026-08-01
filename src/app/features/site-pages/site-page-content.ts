import type { DiagramArtworkKind } from '../../shared/diagram-artwork/diagram-artwork.component';
import { translateOrFallback, type LanguageCode } from '../editor/i18n/editor-page.i18n';

export const SITE_PAGE_KEYS = ['guide', 'examples', 'about'] as const;

export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export interface SitePageCard {
  readonly label?: string;
  readonly title: string;
  readonly body: string;
  readonly visual: DiagramArtworkKind;
  readonly imageSrc?: string;
}

export interface SitePageCodeSample {
  readonly title: string;
  readonly caption: string;
  readonly value: string;
}

export interface SitePageSection {
  readonly id: string;
  readonly title: string;
  readonly intro?: string;
  readonly cards?: readonly SitePageCard[];
  readonly compactCards?: boolean;
  readonly code?: SitePageCodeSample;
}

export interface SitePageTextLink {
  readonly label: string;
  readonly href: string;
}

export interface SitePageResourceLink extends SitePageTextLink {
  readonly kind: 'latex' | 'tikz' | 'overleaf';
}

export interface SitePageTextSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly link?: SitePageTextLink;
  readonly resources?: readonly SitePageResourceLink[];
}

interface SitePageBase {
  readonly key: SitePageKey;
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
  readonly primaryAction: string;
  readonly secondaryAction: string;
  readonly secondaryRoute: `/${Exclude<SitePageKey, 'about'>}`;
}

export interface VisualSitePageContent extends SitePageBase {
  readonly layout: 'visual';
  readonly heroVisual: DiagramArtworkKind;
  readonly sections: readonly SitePageSection[];
}

export interface EditorialSitePageContent extends SitePageBase {
  readonly layout: 'editorial';
  readonly sections: readonly SitePageTextSection[];
}

export type SitePageContent = VisualSitePageContent | EditorialSitePageContent;

const SITE_PAGES = {
  guide: {
    key: 'guide',
    layout: 'visual',
    eyebrow: 'TikZ Drawer guide',
    title: 'Create a TikZ diagram from start to finish',
    lede: 'Start from code, a blank canvas or an AI prompt. Refine the figure, export it to LaTeX and come back whenever it needs another pass.',
    primaryAction: 'Start a diagram',
    secondaryAction: 'See examples',
    secondaryRoute: '/examples',
    heroVisual: 'spatial',
    sections: [
      {
        id: 'start',
        title: 'Choose how to start',
        cards: [
          {
            label: 'Option 1',
            title: 'Import existing code',
            body: 'Paste TikZ or open a LaTeX file to continue from an existing figure.',
            visual: 'import'
          },
          {
            label: 'Option 2',
            title: 'Draw on the canvas',
            body: 'Place shapes, text and connectors directly with the editor tools.',
            visual: 'canvas'
          },
          {
            label: 'Option 3',
            title: 'Describe it to the AI',
            body: 'Ask for a first draft, review the proposal and apply only the changes you want.',
            visual: 'ai'
          }
        ]
      },
      {
        id: 'refine',
        title: 'Turn the draft into a clear figure',
        cards: [
          {
            label: 'Step 1',
            title: 'Select and transform',
            body: 'Move, resize, rotate, duplicate and group the parts of the diagram.',
            visual: 'edit'
          },
          {
            label: 'Step 2',
            title: 'Align and connect',
            body: 'Use snapping, distribution and connectors to make the structure easy to follow.',
            visual: 'flowchart'
          },
          {
            label: 'Step 3',
            title: 'Style and label',
            body: 'Adjust stroke, fill, arrows and text without rewriting coordinates by hand.',
            visual: 'annotation'
          },
          {
            label: 'Step 4',
            title: 'Check the source',
            body: 'Preview the generated TikZ before moving it into the document.',
            visual: 'source'
          }
        ]
      },
      {
        id: 'latex',
        title: 'Export it to LaTeX',
        cards: [
          {
            label: 'Step 1',
            title: 'Export TikZ',
            body: 'Choose a snippet, figure environment or standalone document.',
            visual: 'latex'
          },
          {
            label: 'Step 2',
            title: 'Paste it into Overleaf',
            body: 'Add the required packages and place the exported code in your document.',
            visual: 'overleaf'
          },
          {
            label: 'Step 3',
            title: 'Compile and review',
            body: 'Check the result beside the surrounding text, captions and references.',
            visual: 'compile'
          }
        ],
        code: {
          title: 'A minimal export',
          caption: 'Paste this into your LaTeX project',
          value: String.raw`\begin{tikzpicture}[node distance=1.8cm]
  \node[draw, rounded corners] (start) {Start};
  \node[draw, right of=start] (result) {Result};
  \draw[->] (start) -- (result);
\end{tikzpicture}`
        }
      },
      {
        id: 'iterate',
        title: 'Edit, compile and export again',
        cards: [
          {
            label: 'Step 1',
            title: 'Return to the canvas',
            body: 'Make the spacing, labels or structure changes revealed by the compiled page.',
            visual: 'iterate'
          },
          {
            label: 'Step 2',
            title: 'Export the new version',
            body: 'Replace the old TikZ in your document and compile again.',
            visual: 'latex'
          }
        ]
      },
      {
        id: 'share',
        title: 'Save or share the work',
        cards: [
          {
            title: 'Share a link',
            body: 'Create a URL that opens the diagram so another person can inspect or continue it.',
            visual: 'share'
          },
          {
            title: 'Save a project JSON',
            body: 'Keep a restorable editor file with the scene and its settings.',
            visual: 'json'
          },
          {
            title: 'Export PNG or SVG',
            body: 'Use an image when a platform cannot consume TikZ directly.',
            visual: 'image-export'
          }
        ]
      }
    ]
  },
  examples: {
    key: 'examples',
    layout: 'visual',
    eyebrow: 'Diagram ideas',
    title: 'TikZ drawing examples for LaTeX',
    lede: 'Pick a structure, open the canvas and make it yours.',
    primaryAction: 'Create a TikZ drawing',
    secondaryAction: 'Read the guide',
    secondaryRoute: '/guide',
    heroVisual: 'gallery',
    sections: [
      {
        id: 'structures',
        title: 'Pick a structure',
        intro: 'Six useful starting points for papers, notes and slides.',
        cards: [
          {
            title: 'Flowchart',
            body: 'Processes, decisions and directional steps.',
            visual: 'flowchart',
            imageSrc: 'examples/flowchart.webp'
          },
          {
            title: 'Directed graph',
            body: 'Paths, cycles, trees and connected ideas.',
            visual: 'graph',
            imageSrc: 'examples/directed-graph.webp'
          },
          {
            title: 'System architecture',
            body: 'Clients, services, APIs and data flow.',
            visual: 'architecture',
            imageSrc: 'examples/system-architecture.webp'
          },
          {
            title: 'Geometry',
            body: 'Lines, angles, circles and concise labels.',
            visual: 'geometry',
            imageSrc: 'examples/geometry.webp'
          },
          {
            title: 'Neural network',
            body: 'Layered nodes with inputs and outputs.',
            visual: 'network',
            imageSrc: 'examples/neural-network.webp'
          },
          {
            title: 'Annotated figure',
            body: 'Callouts, arrows and notes over an image.',
            visual: 'annotation',
            imageSrc: 'examples/annotated-figure.webp'
          }
        ]
      }
    ]
  },
  about: {
    key: 'about',
    layout: 'editorial',
    eyebrow: 'Open-source project',
    title: 'About TikZ Drawer',
    lede: 'A practical way to draw diagrams visually and keep editable TikZ as the final result.',
    primaryAction: 'Open the editor',
    secondaryAction: 'Browse examples',
    secondaryRoute: '/examples',
    sections: [
      {
        id: 'purpose',
        title: 'What is TikZ Drawer?',
        paragraphs: [
          'TikZ Drawer is a browser-based visual editor for creating technical diagrams, flowcharts, graphs and annotated figures for LaTeX documents.',
          'TikZ is a drawing library built on PGF that lets you describe precise vector graphics directly in LaTeX source code. It is widely used for diagrams that need to remain part of the document rather than becoming a separate image.',
          'With TikZ Drawer, you arrange the drawing on a canvas and export standard TikZ source. The result stays readable, versionable and independent from the editor.'
        ],
        resources: [
          {
            kind: 'tikz',
            label: 'TikZ and PGF on CTAN',
            href: 'https://ctan.org/pkg/pgf'
          },
          {
            kind: 'latex',
            label: 'The LaTeX Project',
            href: 'https://www.latex-project.org/'
          },
          {
            kind: 'overleaf',
            label: 'Open Overleaf',
            href: 'https://www.overleaf.com/'
          }
        ]
      },
      {
        id: 'intention',
        title: 'Why I built it',
        paragraphs: [
          'TikZ is powerful, but moving coordinates by hand can make visual iteration unnecessarily slow. I wanted the drawing process to feel direct without giving up the precision and portability of code.',
          'The intention is simple: make the common work fast, keep the generated output honest, and leave you free to refine it in LaTeX.'
        ]
      },
      {
        id: 'author',
        title: 'Who I am',
        paragraphs: [
          'I’m Aniol, the developer behind TikZ Drawer. I build the project around the problems I find while working with diagrams and the feedback people share through the repository.',
          'The editor is free to use and developed in the open.'
        ],
        link: {
          label: 'See my GitHub profile',
          href: 'https://github.com/Aniol0012'
        }
      },
      {
        id: 'source',
        title: 'Source, issues and ideas',
        paragraphs: [
          'The complete source code, release history and issue tracker are public. You can inspect how the editor works, report a problem or suggest the next improvement.'
        ],
        link: {
          label: 'Open the TikZ Drawer repository',
          href: 'https://github.com/Aniol0012/tikz-drawer'
        }
      }
    ]
  }
} as const satisfies Readonly<Record<SitePageKey, SitePageContent>>;

const SITE_PAGE_BY_KEY: ReadonlyMap<SitePageKey, SitePageContent> = new Map(SITE_PAGE_KEYS.map((key) => [key, SITE_PAGES[key]]));

const SITE_PAGE_KEY_SET: ReadonlySet<string> = new Set(SITE_PAGE_KEYS);
const DEFAULT_SITE_PAGE = SITE_PAGES.guide;

export const isSitePageKey = (value: unknown): value is SitePageKey => typeof value === 'string' && SITE_PAGE_KEY_SET.has(value);

const localizedText = (language: LanguageCode, key: string, fallback: string): string => translateOrFallback(language, `site.${key}`, fallback);

const localizePageBase = (page: SitePageContent, language: LanguageCode) => ({
  eyebrow: localizedText(language, `${page.key}.eyebrow`, page.eyebrow),
  title: localizedText(language, `${page.key}.title`, page.title),
  lede: localizedText(language, `${page.key}.lede`, page.lede),
  primaryAction: localizedText(language, `${page.key}.primaryAction`, page.primaryAction),
  secondaryAction: localizedText(language, `${page.key}.secondaryAction`, page.secondaryAction)
});

const localizeVisualPage = (page: VisualSitePageContent, language: LanguageCode): VisualSitePageContent => ({
  ...page,
  ...localizePageBase(page, language),
  sections: page.sections.map((section) => ({
    ...section,
    title: localizedText(language, `${page.key}.${section.id}.title`, section.title),
    intro: section.intro ? localizedText(language, `${page.key}.${section.id}.intro`, section.intro) : undefined,
    cards: section.cards?.map((card, index) => ({
      ...card,
      label: card.label ? localizedText(language, `${page.key}.${section.id}.cards.${index}.label`, card.label) : undefined,
      title: localizedText(language, `${page.key}.${section.id}.cards.${index}.title`, card.title),
      body: localizedText(language, `${page.key}.${section.id}.cards.${index}.body`, card.body)
    })),
    code: section.code
      ? {
          ...section.code,
          title: localizedText(language, `${page.key}.${section.id}.code.title`, section.code.title),
          caption: localizedText(language, `${page.key}.${section.id}.code.caption`, section.code.caption)
        }
      : undefined
  }))
});

const localizeEditorialPage = (page: EditorialSitePageContent, language: LanguageCode): EditorialSitePageContent => ({
  ...page,
  ...localizePageBase(page, language),
  sections: page.sections.map((section) => ({
    ...section,
    title: localizedText(language, `${page.key}.${section.id}.title`, section.title),
    paragraphs: section.paragraphs.map((paragraph, index) => localizedText(language, `${page.key}.${section.id}.paragraphs.${index}`, paragraph)),
    resources: section.resources?.map((resource, index) => ({
      ...resource,
      label: localizedText(language, `${page.key}.${section.id}.resources.${index}`, resource.label)
    })),
    link: section.link
      ? {
          ...section.link,
          label: localizedText(language, `${page.key}.${section.id}.link`, section.link.label)
        }
      : undefined
  }))
});

const localizeSitePage = (page: SitePageContent, language: LanguageCode): SitePageContent =>
  page.layout === 'visual' ? localizeVisualPage(page, language) : localizeEditorialPage(page, language);

export const resolveSitePage = (value: unknown, language: LanguageCode = 'en'): SitePageContent => {
  const page = isSitePageKey(value) ? (SITE_PAGE_BY_KEY.get(value) ?? DEFAULT_SITE_PAGE) : DEFAULT_SITE_PAGE;
  return localizeSitePage(page, language);
};
