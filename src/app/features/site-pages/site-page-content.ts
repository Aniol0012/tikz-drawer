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

export interface SitePageContent {
  readonly key: SitePageKey;
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
  readonly primaryAction: string;
  readonly secondaryAction: string;
  readonly secondaryRoute: `/${Exclude<SitePageKey, 'about'>}`;
  readonly heroVisual: DiagramArtworkKind;
  readonly sections: readonly SitePageSection[];
}

const SITE_PAGES = {
  guide: {
    key: 'guide',
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
    eyebrow: 'Open-source project',
    title: 'About TikZ Drawer',
    lede: 'A visual canvas for people who want editable TikZ without placing every coordinate by hand.',
    primaryAction: 'Open the editor',
    secondaryAction: 'Browse examples',
    secondaryRoute: '/examples',
    heroVisual: 'source',
    sections: [
      {
        id: 'principles',
        title: 'Visual when drawing, textual when sharing',
        cards: [
          {
            title: 'Draw in the browser',
            body: 'No local drawing application or setup required.',
            visual: 'canvas'
          },
          {
            title: 'Keep standard TikZ',
            body: 'The output remains portable, readable source code.',
            visual: 'source'
          },
          {
            title: 'Built in the open',
            body: 'Source, releases and issues live on GitHub.',
            visual: 'graph'
          }
        ]
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
