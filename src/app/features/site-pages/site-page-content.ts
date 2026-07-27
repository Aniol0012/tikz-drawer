import type { DiagramArtworkKind } from '../../shared/diagram-artwork/diagram-artwork.component';

export const SITE_PAGE_KEYS = ['guide', 'examples', 'about'] as const;

export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export interface SitePageCard {
  readonly label?: string;
  readonly title: string;
  readonly body: string;
  readonly visual: DiagramArtworkKind;
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

export interface SitePageTextSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly link?: SitePageTextLink;
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
    eyebrow: 'Visual TikZ guide',
    title: 'How to draw TikZ diagrams online',
    lede: 'Sketch the structure, align it on the canvas, then export editable TikZ for LaTeX.',
    primaryAction: 'Open a blank canvas',
    secondaryAction: 'See examples',
    secondaryRoute: '/examples',
    heroVisual: 'canvas',
    sections: [
      {
        id: 'workflow',
        title: 'Four moves from idea to TikZ',
        intro: 'Get the structure right first. The details become much easier.',
        cards: [
          {
            label: '01',
            title: 'Place the structure',
            body: 'Start with the main shapes and a clear reading order.',
            visual: 'flowchart'
          },
          {
            label: '02',
            title: 'Connect the story',
            body: 'Add arrows only where a relationship needs direction.',
            visual: 'graph'
          },
          {
            label: '03',
            title: 'Align the geometry',
            body: 'Snap and distribute elements until the spacing feels calm.',
            visual: 'geometry'
          },
          {
            label: '04',
            title: 'Export the source',
            body: 'Copy clean TikZ that stays editable in your LaTeX project.',
            visual: 'source'
          }
        ]
      },
      {
        id: 'output',
        title: 'What comes out',
        intro: 'Vector source, not a flattened screenshot.',
        code: {
          title: 'Editable TikZ',
          caption: 'Ready for your document',
          value: String.raw`\begin{tikzpicture}[node distance=1.8cm]
  \node[draw, rounded corners] (start) {Start};
  \node[draw, right of=start] (result) {Result};
  \draw[->] (start) -- (result);
\end{tikzpicture}`
        }
      },
      {
        id: 'habits',
        title: 'Small habits, cleaner figures',
        compactCards: true,
        cards: [
          {
            title: 'Label late',
            body: 'Settle the geometry before polishing the words.',
            visual: 'annotation'
          },
          {
            title: 'Reduce crossings',
            body: 'A quieter network is easier to read and edit.',
            visual: 'network'
          },
          {
            title: 'Group by role',
            body: 'Use shape and position to show hierarchy.',
            visual: 'architecture'
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
            visual: 'flowchart'
          },
          {
            title: 'Directed graph',
            body: 'Paths, cycles, trees and connected ideas.',
            visual: 'graph'
          },
          {
            title: 'System architecture',
            body: 'Clients, services, APIs and data flow.',
            visual: 'architecture'
          },
          {
            title: 'Geometry',
            body: 'Lines, angles, circles and concise labels.',
            visual: 'geometry'
          },
          {
            title: 'Neural network',
            body: 'Layered nodes with inputs and outputs.',
            visual: 'network'
          },
          {
            title: 'Annotated figure',
            body: 'Callouts, arrows and notes over an image.',
            visual: 'annotation'
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
        title: 'What TikZ Drawer is for',
        paragraphs: [
          'TikZ Drawer is a browser-based visual editor for creating technical diagrams, flowcharts, graphs and annotated figures for LaTeX documents.',
          'You arrange the drawing on a canvas and export standard TikZ source. The result stays readable, versionable and independent from the editor.'
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

export const resolveSitePage = (value: unknown): SitePageContent =>
  isSitePageKey(value) ? (SITE_PAGE_BY_KEY.get(value) ?? DEFAULT_SITE_PAGE) : DEFAULT_SITE_PAGE;
