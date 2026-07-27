export interface SitePageCard {
  readonly title: string;
  readonly body: string;
}

export interface SitePageSection {
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly cards?: readonly SitePageCard[];
}

export interface SitePageContent {
  readonly key: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
  readonly primaryAction: string;
  readonly sections: readonly SitePageSection[];
}

const SITE_PAGES = {
  guide: {
    key: 'guide',
    eyebrow: 'TikZ drawing guide',
    title: 'How to draw TikZ diagrams online',
    lede: 'Build diagrams on a visual canvas, refine their geometry and style, then export editable TikZ code for your paper, report, slides or notes.',
    primaryAction: 'Start drawing in TikZ Drawer',
    sections: [
      {
        title: 'What is TikZ?',
        paragraphs: [
          'TikZ is a LaTeX package for creating vector graphics directly inside a document. Its text-based drawings stay versionable, reproducible and consistent with the typography of the surrounding LaTeX project.',
          'TikZ Drawer provides a visual layer for common drawing work while keeping standard TikZ code as the portable output. You can sketch a LaTeX diagram online without installing a desktop drawing application.'
        ]
      },
      {
        title: 'Draw a LaTeX diagram in four steps',
        paragraphs: [],
        cards: [
          { title: '1. Open the canvas', body: 'Launch the editor, choose a scene preset or begin with a blank canvas.' },
          { title: '2. Add elements', body: 'Place shapes, text, connectors, images and common graph structures.' },
          { title: '3. Arrange and style', body: 'Move, resize, align and style objects with the inspector and snapping tools.' },
          { title: '4. Export TikZ', body: 'Review the generated code and copy it into your LaTeX document.' }
        ]
      },
      {
        title: 'From visual drawing to editable code',
        paragraphs: [
          'Unlike a screenshot, an exported TikZ figure can be adjusted later, reviewed in a code diff and compiled at any resolution. The generated output remains ordinary TikZ, so you are not locked into TikZ Drawer.',
          'Use alignment and snapping for repeated spacing, keep labels concise, and inspect the generated code before publishing with your final LaTeX template.'
        ]
      }
    ]
  },
  examples: {
    key: 'examples',
    eyebrow: 'Diagram ideas',
    title: 'TikZ drawing examples for LaTeX',
    lede: 'Explore practical starting points for technical figures, academic diagrams and explanatory graphics, then adapt them in the visual editor.',
    primaryAction: 'Create a TikZ drawing',
    sections: [
      {
        title: 'Common TikZ diagram types',
        paragraphs: [],
        cards: [
          { title: 'Flowchart', body: 'Arrange process boxes, decisions and inputs in a clear reading order, connected with directional arrows.' },
          { title: 'Directed graph', body: 'Start from a path, cycle, star, tree or layered graph and adjust the layout visually.' },
          { title: 'System architecture', body: 'Represent clients, services, APIs and databases with consistent shapes and clear data flow.' },
          { title: 'Geometry diagram', body: 'Combine lines, circles, triangles and concise mathematical labels.' },
          { title: 'Neural network', body: 'Create layered nodes, connections, input labels and output annotations.' },
          { title: 'Annotated figure', body: 'Import an image and add arrows, shapes and text callouts for a paper or slide.' }
        ]
      },
      {
        title: 'Choose the right structure',
        paragraphs: [
          'For a process, optimise for reading order. For a network, make relationships and direction clear. For a system map, group related components. For a mathematical figure, prioritise accurate geometry and concise notation.',
          'TikZ Drawer includes structured scene presets, common graph layouts, layers, snapping and export configuration. Begin visually and retain the flexibility of hand-edited TikZ code.'
        ]
      }
    ]
  },
  about: {
    key: 'about',
    eyebrow: 'Open-source project',
    title: 'About TikZ Drawer',
    lede: 'TikZ Drawer is a free browser-based visual editor for people who want to create diagrams visually and keep LaTeX TikZ as the editable output.',
    primaryAction: 'Open the editor',
    sections: [
      {
        title: 'Why the project exists',
        paragraphs: [
          'TikZ produces excellent vector graphics for LaTeX, but positioning and iterating on a diagram entirely through code can be time-consuming. TikZ Drawer bridges the visual and textual workflows.',
          'The editor supports common shapes, text, connectors, graph presets, layers, alignment, snapping, import and export workflows. It runs online without requiring a local installation.'
        ]
      },
      {
        title: 'Creator and source',
        paragraphs: [
          'TikZ Drawer is created and maintained by Aniol0012. The source code, issue tracker and release history are available in the public GitHub repository.',
          'Generated drawings are standard text-based TikZ, so they can be version-controlled, refined manually and shared independently of the web application.'
        ]
      }
    ]
  }
} satisfies Readonly<Record<string, SitePageContent>>;

const SITE_PAGE_BY_KEY: ReadonlyMap<string, SitePageContent> = new Map(Object.entries(SITE_PAGES));
const DEFAULT_SITE_PAGE = SITE_PAGES.guide;

export const resolveSitePage = (value: unknown): SitePageContent =>
  typeof value === 'string' ? (SITE_PAGE_BY_KEY.get(value) ?? DEFAULT_SITE_PAGE) : DEFAULT_SITE_PAGE;
